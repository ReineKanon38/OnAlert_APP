# CONTRIBUTING - OnAlert

Esta guia define el flujo de trabajo para el monorepo OnAlert (Flutter + Node.js + React).

> **Stack:** Flutter 3.x · Node.js 18+ · React + Vite + TypeScript · PostgreSQL (Supabase) · Socket.IO · Firebase FCM

## 1) Ramas base

- `main`: estado productivo — auto-despliega en Render y Vercel.
- `develop`: rama de trabajo diario.
- `release/*`: preparacion de version.
- `hotfix/*`: correccion urgente en produccion.

## 2) Flujo diario

1. Actualizar `develop`.
2. Crear rama de trabajo desde `develop`.
3. Hacer commits pequenos y descriptivos.
4. Subir rama y abrir PR a `develop`.
5. Resolver comentarios y mergear.

Comandos:

```bash
git checkout develop
git pull
git checkout -b feature/mi-cambio
```

## 3) Convencion de nombres

- `feature/<modulo>-<cambio>`
- `fix/<modulo>-<bug>`
- `chore/<area>-<tarea>`
- `release/<yyyy-mm-dd>-<version>`
- `hotfix/<modulo>-<incidente>`

## 4) Convencion de commits

Formato sugerido:

```text
tipo(scope): descripcion corta
```

Tipos recomendados:

- `feat`
- `fix`
- `chore`
- `refactor`
- `docs`
- `test`

Ejemplos:

- `feat(auth): agrega refresh token`
- `fix(api): corrige timeout en login`
- `chore(ci): agrega cache de npm`

## 5) Politica de PR

- PR pequeno: idealmente < 400 lineas netas.
- Incluir contexto breve: que cambia y por que.
- Adjuntar evidencia minima:
  - App movil: captura o video corto.
  - Backend/dashboard: output de pruebas o screenshot.

## 6) Releases

1. Crear `release/*` desde `develop`.
2. Congelar features; solo fixes de estabilizacion.
3. Merge a `main` al finalizar QA.
4. Etiquetar version (`vX.Y.Z`).
5. Merge de vuelta a `develop`.

## 7) Hotfixes

1. Crear `hotfix/*` desde `main`.
2. Aplicar y validar fix minimo.
3. Merge a `main`.
4. Merge a `develop` para mantener historial alineado.

## 8) Recomendaciones para este monorepo

- Si el cambio afecta solo un modulo, enfocarlo en ese directorio:
  - `app_movil/`
  - `backend/`
  - `dashboard_guardias/`
- Evitar commits mezclados entre frontend, backend y movil salvo cambios de integracion.

## 9) Checklists de PR por modulo

Los PR deben usar el template del repositorio y completar la seccion del modulo afectado.

**App móvil (`app_movil`):**
- `flutter analyze lib/` sin errores (warnings de `avoid_print` son aceptables)
- Build APK exitoso: `flutter build apk --release --target-platform android-arm64 --dart-define=API_BASE_URL=https://onalert-api.onrender.com`
- Smoke test: login con `rotsen_lh1@tesch.edu.mx` / `Rotsen123#` y envío de alerta
- Smoke test guardia: login con `guardia@onalert.local` / `Guardia123#` y recepción de alerta
- Evidencia visual (captura o video)

**Backend (`backend`):**
- `node --check server.js` sin errores
- Health check local: `curl http://localhost:3000/health`
- Probar endpoint afectado con Swagger: `http://localhost:3000/docs`
- Confirmar que `initSchema` no rompe la BD existente

**Dashboard (`dashboard_guardias`):**
- `npm run build` exitoso (TypeScript sin errores)
- Login con `guardia@onalert.local` / `Guardia123#`
- Verificar indicador de conexión WebSocket en verde
- Evidencia visual

Ver template: `.github/PULL_REQUEST_TEMPLATE.md`.

## 10) Variables de entorno al hacer PR

Nunca commitear `.env`. Usar `.env.example` para documentar nuevas variables.

Si agregas una variable nueva:
1. Añadirla a `backend/.env.example` con descripción.
2. Mencionarla explícitamente en el PR.
3. Agregarla manualmente en el dashboard de Render (Environment).

## 11) Versionado y tags

Se usa SemVer con prefijo `v`:

- `vMAJOR.MINOR.PATCH`
- Ejemplo: `v0.2.0`

Reglas sugeridas:

- `PATCH`: bugfixes sin romper contratos.
- `MINOR`: nuevas features compatibles.
- `MAJOR`: cambios incompatibles.

Flujo rapido de release:

1. Crear `release/*` desde `develop`.
2. Cerrar fixes de estabilizacion.
3. Merge a `main`.
4. Crear tag anotado y push:

```bash
git checkout main
git pull
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

Guia completa: `RELEASE.md`.
