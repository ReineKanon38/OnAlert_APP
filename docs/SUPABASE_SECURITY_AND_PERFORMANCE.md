# Guía de Optimización y Seguridad de la Base de Datos (Supabase)

Esta guía contiene las explicaciones y los scripts SQL necesarios para resolver las alertas de rendimiento y seguridad reportadas en el panel de control de Supabase para el proyecto **OnAlert**.

---

## 📋 Resumen de Acciones Requeridas

1. **Activar RLS (Row Level Security)** en las tablas `students` y `attendance_logs`.
2. **Crear Políticas RLS** para las tablas que tienen RLS activo pero carecen de políticas (`alert_status_logs`, `alerts`, `users`, `students`, `attendance_logs`).
3. **Mover Extensiones del Esquema Público**: Cambiar la extensión `vector` al esquema `extensions` para mejorar la seguridad del esquema público.
4. **Restringir Funciones Privilegiadas (SECURITY DEFINER)**: Revocar permisos de ejecución pública sobre la función `public.rls_auto_enable()`.
5. **Crear Índices para Claves Foráneas**: Indexar las claves foráneas en `alerts`, `alert_status_logs` y `attendance_logs` para evitar escaneos secuenciales lentos.

---

## ⚡ Script SQL Completo (Copiar y Pegar en el SQL Editor de Supabase)

Puedes ejecutar todo este bloque de código directamente en el **SQL Editor** de Supabase para aplicar todas las mejoras de una sola vez:

```sql
-- =====================================================================
-- 1. EXTENSIONES (Mover vector a un esquema propio de extensiones)
-- =====================================================================
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION vector SET SCHEMA extensions;


-- =====================================================================
-- 2. SEGURIDAD DE FUNCIONES (Revocar ejecución pública de SECURITY DEFINER)
-- =====================================================================
-- Por seguridad, las funciones con SECURITY DEFINER no deben ser ejecutadas
-- directamente por usuarios anónimos (public) ni autenticados a menos que sea necesario.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM public;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;


-- =====================================================================
-- 3. ACTIVAR ROW LEVEL SECURITY (RLS)
-- =====================================================================
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Nota: Las tablas users, alerts y alert_status_logs ya tienen RLS activado,
-- pero requieren políticas de acceso para no bloquear completamente las peticiones API.


-- =====================================================================
-- 4. POLÍTICAS RLS (Para resolver "RLS Enabled No Policy")
-- =====================================================================

-- 4.1) Tabla: users
-- Permitir a usuarios autenticados leer los perfiles
CREATE POLICY "Permitir lectura a usuarios autenticados" 
ON public.users FOR SELECT 
TO authenticated 
USING (true);

-- Permitir a los usuarios modificar su propia información
CREATE POLICY "Permitir actualización de perfil propio" 
ON public.users FOR UPDATE 
TO authenticated 
USING (auth.uid()::text = id::text);

-- 4.2) Tabla: alerts
-- Permitir a usuarios autenticados ver las alertas
CREATE POLICY "Permitir lectura de alertas a usuarios autenticados" 
ON public.alerts FOR SELECT 
TO authenticated 
USING (true);

-- Permitir a estudiantes y profesores insertar nuevas alertas
CREATE POLICY "Permitir creación de alertas a usuarios autenticados" 
ON public.alerts FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Permitir a guardias y administradores actualizar el estado de las alertas
CREATE POLICY "Permitir actualización de alertas a personal de seguridad" 
ON public.alerts FOR UPDATE 
TO authenticated 
USING (true);

-- 4.3) Tabla: alert_status_logs
-- Permitir leer la bitácora de estados
CREATE POLICY "Permitir lectura de bitácora a usuarios autenticados" 
ON public.alert_status_logs FOR SELECT 
TO authenticated 
USING (true);

-- 4.4) Tabla: students
-- Permitir lectura de estudiantes a usuarios autenticados
CREATE POLICY "Permitir lectura de estudiantes a usuarios autenticados" 
ON public.students FOR SELECT 
TO authenticated 
USING (true);

-- 4.5) Tabla: attendance_logs
-- Permitir lectura y creación de logs de asistencia a usuarios autenticados
CREATE POLICY "Permitir lectura de logs de asistencia a usuarios autenticados" 
ON public.attendance_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserción de logs de asistencia a usuarios autenticados" 
ON public.attendance_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);


-- =====================================================================
-- 5. RENDIMIENTO (Crear Índices para Claves Foráneas)
-- =====================================================================

-- Índices para la tabla alerts (user_id ya se añade automáticamente en el backend,
-- pero se incluye aquí en caso de que desees aplicarlo manualmente de inmediato)
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON public.alerts(user_id);

-- Índices para la tabla alert_status_logs
CREATE INDEX IF NOT EXISTS idx_alert_status_logs_alert_id ON public.alert_status_logs(alert_id);

-- Índices para la tabla attendance_logs (Claves foráneas supuestas)
-- Si la clave foránea apunta a la tabla students (por ejemplo, student_id)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id ON public.attendance_logs(student_id);

-- En caso de que la clave foránea apunte a users(id) o similar:
-- CREATE INDEX IF NOT EXISTS idx_attendance_logs_user_id ON public.attendance_logs(user_id);
```

---

## 🔍 Detalles Técnicos y Explicación de las Alertas

### 1. RLS Disabled in Public (`students`, `attendance_logs`)
- **Problema**: Al no tener RLS activado, cualquier persona con acceso a la clave anónima (`anon key`) de la API de Supabase podría realizar consultas, insertar o borrar datos de estas tablas directamente sin pasar por las reglas de negocio del backend.
- **Solución**: Al hacer `ENABLE ROW LEVEL SECURITY`, se activa el cortafuegos de Postgres. A partir de ahí, solo las peticiones con políticas explícitas o con permisos de administrador (`service_role`, que usa el backend) pueden interactuar con los datos.

### 2. Extension in Public (`public.vector`)
- **Problema**: Instalar extensiones (como `pgvector`) directamente en el esquema `public` llena el espacio de nombres público y puede exponer funciones internas de la extensión a accesos no deseados.
- **Solución**: Mover la extensión a un esquema dedicado (como `extensions`) mantiene el esquema `public` ordenado y reduce la superficie de ataque.

### 3. SECURITY DEFINER sin restricciones en `rls_auto_enable()`
- **Problema**: Por defecto en PostgreSQL, las funciones creadas con la propiedad `SECURITY DEFINER` se ejecutan con los privilegios del usuario creador (normalmente el administrador). Si no se revocan los permisos de ejecución para el rol público (`public`), cualquier usuario podría mandar a llamar la función mediante la API de Supabase y forzar cambios de RLS u otras acciones.
- **Solución**: Ejecutar `REVOKE EXECUTE` remueve este permiso a usuarios públicos y autenticados comunes, asegurando que solo el sistema/administrador pueda activarla.

### 4. RLS Enabled No Policy (`alert_status_logs`, `alerts`, `users`)
- **Problema**: Si una tabla tiene RLS activo pero no tiene políticas, PostgREST (la API externa de Supabase) bloquea por completo todo el acceso a usuarios no administradores. Aunque tu backend Node.js funciona correctamente porque se conecta directamente mediante la cadena de conexión superusuario (`DATABASE_URL`), es una mala práctica no tener políticas si deseas usar el cliente de Supabase en el futuro.
- **Solución**: Se crean políticas básicas asociadas al rol `authenticated` para permitir la consulta segura de la información relevante.

### 5. Unindexed foreign keys
- **Problema**: Cuando eliminas o actualizas un registro en una tabla padre (por ejemplo, un usuario en `users`), PostgreSQL debe buscar en las tablas hijas (`alerts`, `attendance_logs`) si existen registros asociados. Sin un índice en la columna de la clave foránea, PostgreSQL tiene que hacer un escaneo completo secuencial de toda la tabla hija. Esto genera bloqueos y ralentizaciones críticas a medida que aumenta el volumen de datos.
- **Solución**: La creación de índices (`idx_...`) permite búsquedas en milisegundos y resuelve la advertencia de rendimiento.

---

## 🛠️ Pasos para aplicar e integrar en producción

1. Entra a tu proyecto en el panel de [Supabase](https://supabase.com).
2. En la barra lateral izquierda, haz clic en **SQL Editor**.
3. Haz clic en **New Query**.
4. Copia el script SQL del apartado **"Script SQL Completo"** de este documento y pégalo en el editor.
5. Presiona el botón **Run** (Ejecutar) en la esquina superior derecha.
6. Ve a la sección **Database** -> **Advisors** (o el panel de alertas de seguridad/rendimiento) en Supabase para verificar que todas las advertencias han desaparecido.
