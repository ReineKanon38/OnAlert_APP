# CONTRIBUTING - OnAlert

Esta guia define un flujo de trabajo simple para avanzar rapido sin romper `main`.

## 1) Ramas base

- `main`: estado productivo.
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

- Movil (`app_movil`): build local, smoke test de login y navegacion basica, evidencia visual.
- Backend (`backend`): pruebas locales o script de verificacion, endpoints criticos validados.
- Dashboard (`dashboard_guardias`): build exitoso, validacion de vistas afectadas, evidencia visual.

Ver template: `.github/PULL_REQUEST_TEMPLATE.md`.

## 10) Versionado y tags

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
