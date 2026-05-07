# WORKFLOW GUIDE - OnAlert

Guia practica para usar el flujo Git/GitHub implementado en este repositorio.

> **Deploys automaticos:** push a `main` → Render redespliega el backend + Vercel redespliega el dashboard.  
> **APK:** se genera manualmente y se distribuye al dispositivo del guardia.

## 1) Que ya esta configurado

- Estrategia de ramas: `main`, `develop`, `release/*`, `hotfix/*`, `feature/*`, `fix/*`, `chore/*`.
- Template de Pull Request con checklist por modulo.
- Templates de issues para bug y feature.
- Politica de versionado SemVer + guia de tags.

Archivos clave:

- `README.md` — arquitectura completa, endpoints, setup, usuarios de prueba
- `CONTRIBUTING.md` — convenciones de commits, ramas y checklists de PR
- `RELEASE.md` — proceso de release y versionado
- `backend/.env.example` — todas las variables de entorno necesarias
- `.github/PULL_REQUEST_TEMPLATE.md`

## 2) Flujo diario recomendado (developer)

1. Sincroniza `develop`.
2. Crea tu rama de trabajo desde `develop`.
3. Implementa cambios y commitea en bloques pequenos.
4. Sube tu rama.
5. Abre PR hacia `develop` y completa checklist.
6. Corrige feedback y mergea.

```bash
git checkout develop
git pull
git checkout -b feature/modulo-cambio

# despues de tus cambios
git add .
git commit -m "feat(modulo): descripcion corta"
git push -u origin feature/modulo-cambio
```

## 3) Comandos frecuentes por modulo

### Backend — verificar y correr local
```bash
cd backend
cp .env.example .env   # completar con credenciales reales
npm install
node --check server.js  # verifica sintaxis
node server.js          # corre en puerto 3000
```

Health check: `http://localhost:3000/health`  
Swagger docs: `http://localhost:3000/docs`

### Dashboard — dev local
```bash
cd dashboard_guardias
npm install
# .env.local con: VITE_API_URL=http://localhost:3000
npm run dev
# Login: guardia@onalert.local / Guardia123#
```

### App movil — build y prueba
```bash
cd app_movil
flutter pub get
flutter analyze lib/   # solo debe haber warnings, no errores

# Correr en dispositivo fisico (recomendado para geolocation y FCM)
flutter run --dart-define=API_BASE_URL=http://TU_IP_LOCAL:3000

# Build APK produccion (arm64, ~17.8 MB)
flutter build apk --release --target-platform android-arm64 \
  --dart-define=API_BASE_URL=https://onalert-api.onrender.com
# Salida: app_movil/build/app/outputs/flutter-apk/app-release.apk
```

## 4) Usuarios de prueba

| Email | Contrasena | Rol | Donde se usa |
|---|---|---|---|
| `guardia@onalert.local` | `Guardia123#` | security | App movil (guardia) + Dashboard |
| `rotsen_lh1@tesch.edu.mx` | `Rotsen123#` | student | App movil (alumno) |
| `cesar_202214024@tesch.edu.mx` | `Cesar123#` | student | App movil (alumno) |

## 5) Como abrir un issue correctamente

### Bug
1. Ve a GitHub → Issues → New Issue → `Bug report`.
2. Completa modulo, pasos de reproduccion, evidencia e impacto.

### Feature
1. Ve a GitHub → Issues → New Issue → `Feature request`.
2. Completa problema, propuesta y criterios de aceptacion.

## 6) Como usar el PR template

Al abrir un PR, el template aparece automaticamente. Completar:

- Resumen del cambio y tipo.
- Modulos afectados y su checklist especifico.
- Evidencia (captura, video, output de consola).
- Riesgo y plan de rollback.

**Regla:** no mergear PR con checklist incompleto.

## 7) Flujos por tipo de trabajo

### A) Feature normal
Origen: `feature/*` desde `develop` → PR a `develop`.

### B) Fix no urgente
Origen: `fix/*` desde `develop` → PR a `develop`.

### C) Release planificada
```bash
git checkout -b release/2026-05-07-v1.1.0 develop
# solo fixes de estabilizacion
git checkout main ; git merge release/...
git tag v1.1.0
git checkout develop ; git merge main
git push --tags
```

### D) Hotfix de produccion
```bash
git checkout -b hotfix/backend-crash main
# fix minimo
git checkout main ; git merge hotfix/...
git tag v1.0.1
git checkout develop ; git merge main
git push --tags
```

## 8) Variables de entorno en Render

Cuando se agrega una nueva variable al backend:
1. Actualizarla en `backend/.env.example`.
2. Agregarla en Render → tu servicio → **Environment → Add Environment Variable**.
3. Render reinicia automaticamente el servicio.

Variables criticas ya configuradas en Render:
`DATABASE_URL`, `JWT_SECRET`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_STORAGE_BUCKET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `COORD_EMAILS`
4. Tag patch (`vX.Y.Z+1`).
5. Merge de `main` a `develop`.

## 6) Versionado y tags (SemVer)

- `PATCH`: correcciones compatibles (`v0.1.1`).
- `MINOR`: nuevas features compatibles (`v0.2.0`).
- `MAJOR`: cambios incompatibles (`v1.0.0`).

Comandos:

```bash
git checkout main
git pull
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## 7) Reglas para monorepo (evitar friccion)

- Prioriza PR por modulo (`app_movil`, `backend`, `dashboard_guardias`).
- Evita mezclar cambios de modulos no relacionados en el mismo PR.
- Si tocas varios modulos, explica dependencias en el resumen del PR.

## 8) Do / Don't rapido

Do:

- Trabajar desde `develop` para cambios normales.
- Mantener PR chicos.
- Adjuntar evidencia de prueba.

Don't:

- Push directo a `main`.
- PR sin descripcion ni checklist.
- Mezclar refactor masivo con bugfix urgente.

## 9) Checklist operativo para lider tecnico

Antes de mergear:

1. El destino del PR es correcto.
2. El checklist del modulo esta completo.
3. Hay evidencia minima.
4. Riesgo y rollback estan claros.
5. El alcance coincide con el issue.

## 10) Branch Protection y checks obligatorios

Para que el proceso sea obligatorio (y no opcional), configura reglas de proteccion en GitHub.

### A) Regla para `main`

En GitHub:

1. Settings -> Branches -> Add branch protection rule.
2. Branch name pattern: `main`.
3. Activa:
	- Require a pull request before merging.
	- Require approvals (recomendado: 1 o 2).
	- Dismiss stale approvals when new commits are pushed.
	- Require status checks to pass before merging.
	- Require branches to be up to date before merging.
	- Include administrators (recomendado).
	- Restrict who can push to matching branches (opcional, recomendado).

Checks recomendados para marcar como required:

- `backend-check`
- `dashboard-build`
- `flutter-quality`

### B) Regla para `develop`

Repite el proceso con branch name pattern `develop`.

Minimo recomendado:

- PR obligatorio.
- 1 aprobacion minima.
- Status checks obligatorios.

### C) Regla para `release/*` y `hotfix/*`

Opcional pero recomendado en equipos:

- Pattern `release/*`: requerir PR + checks.
- Pattern `hotfix/*`: permitir velocidad, pero mantener checks.

## 11) CI implementado en el repo

Ya existen workflows en `.github/workflows/`:

- `backend-ci.yml` -> job `backend-check`
- `dashboard-ci.yml` -> job `dashboard-build`
- `app-movil-ci.yml` -> job `flutter-quality`

Como funcionan:

- Se ejecutan en PR cuando hay cambios del modulo correspondiente.
- Se ejecutan en push a `main`, `develop`, `release/**`, `hotfix/**`.
- Usan filtros por path para no correr todo si no hace falta.

Nota: los checks exactos que aparezcan en Branch Protection los veras en el dropdown de GitHub despues de la primera ejecucion exitosa de cada workflow.

## 12) Cierre automatico de Branch Protection

Si quieres dejar esto aplicado en minutos sin hacerlo manualmente en UI, usa:

- `scripts/setup_branch_protection.ps1`

Que hace este script:

- Configura proteccion para `main` y `develop` via GitHub API.
- Exige PR con aprobacion minima.
- Activa resolucion de conversaciones.
- Activa historial lineal.
- Bloquea force-push y borrado de rama.
- Marca checks requeridos:
	- `backend-check`
	- `dashboard-build`
	- `flutter-quality`

Prerequisitos:

1. Crear un Personal Access Token (GitHub) con permisos de administracion del repo.
2. Exportar token en terminal:

```powershell
$env:GITHUB_TOKEN = "tu_token"
```

Ejecucion:

```powershell
./scripts/setup_branch_protection.ps1
```

Si necesitas otro repo/owner:

```powershell
./scripts/setup_branch_protection.ps1 -Owner "mi_owner" -Repo "mi_repo"
```

## 13) Definicion de listo (Done)

Considera este setup cerrado cuando se cumpla todo:

1. Templates de issue y PR visibles en GitHub.
2. Workflows corriendo en Actions sin errores.
3. `main` y `develop` con branch protection activa.
4. Required checks configurados con los 3 jobs.
5. Equipo creando ramas desde `develop` y mergeando solo por PR.

## 14) Guardrails de produccion para OnAlert

Reglas operativas ya aplicadas en la app y backend:

- Contrasenas: sin longitud maxima artificial; deben incluir al menos 1 mayuscula, 1 numero y 1 simbolo.
- Boton de alerta: flujo de un solo toque. Al presionarlo inicia la cuenta atras y la alerta se envia automaticamente al terminar.
- Cuenta atras: la preparacion de ubicacion corre en paralelo al conteo para reducir espera percibida.
- Anti saturacion: el backend bloquea alertas nuevas si el usuario ya tiene una alerta activa (`pendiente` o `en_proceso`).
- Cooldown: el backend impone una espera corta entre alertas consecutivas del mismo usuario. Valor actual recomendado: 30s.
- Robustez cliente: si el servidor responde HTML o texto en un error, la app ya no debe mostrar el `<!DOCTYPE html>` crudo como si fuera JSON valido.

Recomendacion de arquitectura para la siguiente etapa:

1. Mantener el bloqueo principal en backend, no solo en UI.
2. Agregar `idempotency key` por envio de alerta para deduplicar reintentos de red.
3. Registrar metricas de rechazo por cooldown y alerta activa para ajustar la ventana sin adivinar.
4. Mover fotos de perfil a storage dedicado y guardar solo URL en base de datos.
5. Separar configuracion operativa por entorno con variables como `ALERT_COOLDOWN_SECONDS`.
