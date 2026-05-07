# OnAlert — Sistema de Alertas de Emergencia

Sistema institucional de alertas en tiempo real para el TESCH (Tecnológico de Estudios Superiores de Chimalhuacán). Permite a alumnos y profesores enviar alertas de emergencia desde su dispositivo móvil, que son recibidas al instante por guardias y coordinadores.

---

## Arquitectura

```
app_movil/          Flutter 3.x — Android (arm64)
backend/            Node.js + Express + Socket.IO — desplegado en Render
dashboard_guardias/ React + Vite + TypeScript — desplegado en Vercel
```

**Servicios externos:**
- **Base de datos:** PostgreSQL vía Supabase (`arjsqaftsrfdxzrluxxe`)
- **Almacenamiento:** Supabase Storage (bucket `profile-photos`)
- **Push notifications:** Firebase Cloud Messaging (proyecto `onalert-7082f`)
- **Email:** SMTP Gmail con App Password (Nodemailer)

---

## URLs de producción

| Servicio | URL |
|---|---|
| API / Backend | `https://onalert-api.onrender.com` |
| Dashboard guardias | Vercel (ver configuración de Vercel) |
| Docs API (Swagger) | `https://onalert-api.onrender.com/docs` |
| Health check | `https://onalert-api.onrender.com/health` |

---

## Módulos principales

### App móvil (`app_movil/`)
- Login con validación de dominio `@tesch.edu.mx` y `@onalert.local`
- Envío de alerta con geolocalización, descripción y foto de perfil
- Pantalla de guardia (`GuardHomeScreen`): lista de alertas en tiempo real vía WebSocket
- Push notifications (FCM) cuando llega una alerta nueva
- Perfil de usuario con foto subida a Supabase Storage

**Roles:**
- `student` / `professor` → pantalla de alerta (`HomeScreen`)
- `security` / `admin` → pantalla de guardia (`GuardHomeScreen`)

### Backend (`backend/`)
- REST API con JWT (Express 5)
- WebSocket con Socket.IO para tiempo real
- Lógica de alertas con cooldown configurable (`ALERT_COOLDOWN_SECONDS`)
- Deduplicación por `idempotency_key`
- Push a guardias vía Firebase Admin SDK
- Reportes de incidente por email al cerrar/marcar falsa alarma
- Keep-alive automático cada 10 min (evita cold start en Render free tier)

**Endpoints principales:**

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/register` | Registro de usuario |
| `POST` | `/auth/login` | Login, devuelve JWT |
| `GET` | `/auth/me` | Perfil del usuario autenticado |
| `PUT` | `/auth/me` | Actualizar perfil / foto |
| `POST` | `/auth/fcm-token` | Registrar token FCM del dispositivo |
| `POST` | `/alerts` | Crear alerta de emergencia |
| `GET` | `/alerts` | Listar alertas (solo seguridad/admin) |
| `PATCH` | `/alerts/:id/status` | Actualizar estado de alerta |
| `GET` | `/alerts/:id/logs` | Bitácora de cambios de estado |
| `GET` | `/alerts/:id/report` | Reporte PDF/JSON del incidente |
| `GET` | `/dashboard/summary` | Resumen estadístico |
| `GET` | `/health` | Estado del servicio |

**Eventos WebSocket:**

| Evento | Dirección | Descripción |
|---|---|---|
| `guard-join` | cliente → servidor | Guardia se registra como activo |
| `guard-status` | servidor → todos | Lista de guardias móviles conectados |
| `new-alert` | servidor → todos | Nueva alerta creada |
| `alert-updated` | servidor → todos | Estado de alerta modificado |
| `alert-status-changed` | cliente → servidor | Dashboard notifica cambio de estado |

### Dashboard de guardias (`dashboard_guardias/`)
- Login exclusivo para roles `security` / `admin`
- Vista en tiempo real de alertas con modal de alerta entrante
- Mapa embebido (OpenStreetMap) por cada alerta
- Cambio de estado, prioridad y observación
- Indicador de conexión WebSocket y contador de guardias móviles activos
- Resumen estadístico (total, pendientes, urgentes, cerradas, falsas alarmas)

---

## Setup local

### Requisitos
- Flutter 3.x (`flutter --version`)
- Node.js 18+ (`node --version`)
- Git

### Backend
```bash
cd backend
cp .env.example .env   # Edita con tus credenciales
npm install
node server.js
```

### Dashboard
```bash
cd dashboard_guardias
npm install
# Crea .env.local con:
# VITE_API_URL=http://localhost:3000
npm run dev
```

### App móvil
```bash
cd app_movil
flutter pub get
flutter run --dart-define=API_BASE_URL=http://TU_IP_LOCAL:3000
```

Para generar APK de producción:
```bash
flutter build apk --release --target-platform android-arm64 \
  --dart-define=API_BASE_URL=https://onalert-api.onrender.com
# APK en: build/app/outputs/flutter-apk/app-release.apk (~17.8 MB)
```

---

## Variables de entorno (backend)

Ver `backend/.env.example` para la lista completa. Variables críticas para producción:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL (Supabase) |
| `JWT_SECRET` | Secreto para firmar tokens JWT |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON de cuenta de servicio Firebase (minificado, una línea) |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key de Supabase (bypasa RLS) |
| `SUPABASE_STORAGE_BUCKET` | Nombre del bucket (`profile-photos`) |
| `SMTP_HOST` | Servidor SMTP (`smtp.gmail.com`) |
| `SMTP_PORT` | Puerto SMTP (`587`) |
| `SMTP_SECURE` | `false` para TLS |
| `SMTP_USER` | Correo Gmail remitente |
| `SMTP_PASS` | App Password de 16 caracteres de Gmail |
| `COORD_EMAILS` | Correos de coordinadores separados por coma |
| `RENDER_EXTERNAL_URL` | Auto-inyectado por Render en producción |

---

## Usuarios de prueba

| Email | Contraseña | Rol | Acceso |
|---|---|---|---|
| `guardia@onalert.local` | `Guardia123#` | security | App móvil (GuardHomeScreen) + Dashboard |
| `rotsen_lh1@tesch.edu.mx` | `Rotsen123#` | student | App móvil (HomeScreen) |
| `cesar_202214024@tesch.edu.mx` | `Cesar123#` | student | App móvil (HomeScreen) |

---

## Flujo de ramas (Git)

- `main` — Producción estable
- `develop` — Integración continua de features
- `feature/*` — Trabajo de funcionalidad nueva
- `fix/*` — Correcciones no urgentes
- `hotfix/*` — Correcciones urgentes sobre producción
- `chore/*` — Tareas técnicas (deps, tooling)

Guia completa en `CONTRIBUTING.md` y `WORKFLOW_GUIDE.md`.