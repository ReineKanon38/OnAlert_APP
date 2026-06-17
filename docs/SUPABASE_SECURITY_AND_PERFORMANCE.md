# Guía de Optimización y Seguridad de la Base de Datos (Supabase) - OnAlert

Esta guía contiene el script SQL y las explicaciones técnicas para depurar y asegurar la base de datos de tu proyecto, eliminando cualquier rastro de otros proyectos (como ScanFace) y aplicando políticas de seguridad (RLS) avanzadas de rendimiento y control de acceso específicas para **OnAlert**.

---

## ⚠️ ADVERTENCIA: Pérdida Irreversible de Datos
La ejecución del bloque de limpieza de este script **eliminará permanentemente** las tablas de base de datos y la extensión de vectores correspondientes al proyecto ScanFace. Asegúrate de respaldar sus datos si los necesitas antes de proceder.

---

## ⚡ Script SQL Completo (Copiar y Pegar en el SQL Editor de Supabase)

Ejecuta este script completo en la consola de Supabase para limpiar las tablas de otros proyectos y blindar las tablas de **OnAlert**:

```sql
-- =====================================================================
-- 1. LIMPIEZA DE TABLAS Y DEPENDENCIAS AJENAS A ONALERT (SCANFACE)
-- =====================================================================
-- Elimina de forma permanente las tablas de asistencia, estudiantes y la extensión vector
DROP TABLE IF EXISTS public.attendance_logs CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP EXTENSION IF EXISTS vector CASCADE;


-- =====================================================================
-- 2. SEGURIDAD DE FUNCIONES (Revocar ejecución de SECURITY DEFINER)
-- =====================================================================
-- Revoca permisos de ejecución en rls_auto_enable() para usuarios públicos,
-- anónimos y autenticados, previniendo accesos no autorizados.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;


-- =====================================================================
-- 3. ACTIVAR ROW LEVEL SECURITY (RLS) EN TABLAS DE ONALERT
-- =====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_status_logs ENABLE ROW LEVEL SECURITY;


-- =====================================================================
-- 4. POLÍTICAS RLS ROBUSTAS (Resuelve "Always True" y "Auth RLS Plan")
-- =====================================================================

-- 4.1) Tabla: users (Perfiles de usuario)
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.users;
CREATE POLICY "Permitir lectura a usuarios autenticados" 
ON public.users FOR SELECT 
TO authenticated 
USING (
  id::text = (SELECT auth.uid())::text OR
  (SELECT role FROM public.users WHERE id::text = (SELECT auth.uid())::text) IN ('security', 'admin')
);

DROP POLICY IF EXISTS "Permitir actualización de perfil propio" ON public.users;
CREATE POLICY "Permitir actualización de perfil propio" 
ON public.users FOR UPDATE 
TO authenticated 
USING (((SELECT auth.uid())::text = id::text));


-- 4.2) Tabla: alerts (Alertas de pánico)
DROP POLICY IF EXISTS "Permitir lectura de alertas a usuarios autenticados" ON public.alerts;
CREATE POLICY "Permitir lectura de alertas a usuarios autenticados" 
ON public.alerts FOR SELECT 
TO authenticated 
USING (
  user_id::text = (SELECT auth.uid())::text OR
  (SELECT role FROM public.users WHERE id::text = (SELECT auth.uid())::text) IN ('security', 'admin')
);

DROP POLICY IF EXISTS "Permitir creación de alertas a usuarios autenticados" ON public.alerts;
CREATE POLICY "Permitir creación de alertas a usuarios autenticados" 
ON public.alerts FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id::text = (SELECT auth.uid())::text
);

DROP POLICY IF EXISTS "Permitir actualización de alertas a personal de seguridad" ON public.alerts;
CREATE POLICY "Permitir actualización de alertas a personal de seguridad" 
ON public.alerts FOR UPDATE 
TO authenticated 
USING (
  (SELECT role FROM public.users WHERE id::text = (SELECT auth.uid())::text) IN ('security', 'admin')
);


-- 4.3) Tabla: alert_status_logs (Bitácora de estados de alerta)
DROP POLICY IF EXISTS "Permitir lectura de bitácora a usuarios autenticados" ON public.alert_status_logs;
CREATE POLICY "Permitir lectura de bitácora a usuarios autenticados" 
ON public.alert_status_logs FOR SELECT 
TO authenticated 
USING (
  (SELECT user_id FROM public.alerts WHERE id = alert_id)::text = (SELECT auth.uid())::text OR
  (SELECT role FROM public.users WHERE id::text = (SELECT auth.uid())::text) IN ('security', 'admin')
);
```

---

## 🔍 Detalles Técnicos de las Advertencias Resueltas

### 1. Limpieza de ScanFace (`students`, `attendance_logs`, `vector`)
- **Razón**: Al separar la base de datos de otros proyectos, estas tablas y la extensión `vector` se eliminan por completo, liberando espacio en disco y reduciendo la complejidad del esquema.
- **Acción**: `DROP ... CASCADE` remueve las tablas junto con cualquier índice, regla o política asociada a ellas.

### 2. Auth RLS Initialization Plan (`users`)
- **Problema**: El analizador de rendimiento de Supabase advierte que llamar funciones volátiles de autenticación como `auth.uid()` directamente en la cláusula `USING` obliga a PostgreSQL a re-evaluar la función por cada fila consultada, degradando críticamente el rendimiento de la tabla.
- **Solución**: Envolver la función dentro de una subconsulta selectora `(SELECT auth.uid())` le indica a PostgreSQL que evalúe la expresión una sola vez y la trate como un valor constante para todo el plan de ejecución de la consulta.

### 3. RLS Policy Always True (`alerts`, `attendance_logs`)
- **Problema**: Las políticas creadas anteriormente tenían condiciones generales `USING (true)` que desactivaban en la práctica la protección de RLS para usuarios conectados, permitiendo a cualquier alumno ver las alertas de otros.
- **Solución**: Se reescribieron las políticas para validar que la identidad del creador coincida con `(SELECT auth.uid())`, permitiendo el acceso general únicamente a personal autorizado con roles `'security'` o `'admin'`.

### 4. Public Can Execute SECURITY DEFINER Function (`rls_auto_enable`)
- **Problema**: PostgreSQL otorga permisos de ejecución a todos los usuarios (`PUBLIC` y `anon`) sobre funciones recién creadas por defecto. En funciones creadas con privilegios de administrador (`SECURITY DEFINER`), esto abre una brecha de seguridad grave.
- **Solución**: `REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated` bloquea de forma exhaustiva el acceso a cualquier rol no privilegiado.

### 5. Unused Index (`idx_alerts_user_id`, `idx_alert_status_logs_alert_id`)
- **Explicación**: El panel de control de Supabase advierte que estos índices no registran consultas activas (`number_of_scans = 0`). **Esta advertencia es completamente normal** para índices creados recientemente y con poca actividad de datos.
- **Acción**: **NO se deben borrar estos índices**. Son vitales para mantener la integridad referencial y asegurar que las operaciones de eliminación en cascada (`ON DELETE CASCADE`) y las uniones (`JOIN`) no causen escaneos de tablas completas a medida que el sistema crezca.

---

## 🛠️ Instrucciones de Despliegue

1. Accede a tu consola de [Supabase](https://supabase.com).
2. Abre la sección de **SQL Editor** y haz clic en **New Query**.
3. Pega el script anterior y presiona **Run**.
4. Verifica en la pestaña **Database -> Advisors** que las alertas se hayan resuelto exitosamente.
