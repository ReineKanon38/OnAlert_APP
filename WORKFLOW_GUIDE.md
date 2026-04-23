# WORKFLOW GUIDE - OnAlert

Guia practica para usar el flujo Git/GitHub implementado en este repositorio.

## 1) Que ya esta configurado

- Estrategia de ramas: `main`, `develop`, `release/*`, `hotfix/*`, `feature/*`, `fix/*`, `chore/*`.
- Template de Pull Request con checklist por modulo.
- Templates de issues para bug y feature.
- Politica de versionado SemVer + guia de tags.

Archivos clave:

- `CONTRIBUTING.md`
- `RELEASE.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/ISSUE_TEMPLATE/bug_report.yml`
- `.github/ISSUE_TEMPLATE/feature_request.yml`

## 2) Flujo diario recomendado (developer)

1. Sincroniza `develop`.
2. Crea tu rama de trabajo desde `develop`.
3. Implementa cambios y commitea en bloques pequenos.
4. Sube tu rama.
5. Abre PR hacia `develop` y completa checklist.
6. Corrige feedback y mergea.

Comandos base:

```bash
git checkout develop
git pull
git checkout -b feature/modulo-cambio

# despues de tus cambios
git add .
git commit -m "feat(modulo): descripcion corta"
git push -u origin feature/modulo-cambio
```

## 3) Como abrir un issue correctamente

### Bug

1. Ve a GitHub -> Issues -> New Issue.
2. Elige `Bug report`.
3. Completa modulo, pasos de reproduccion, evidencia e impacto.

Resultado: el bug queda listo para priorizar y asignar sin pedir mas contexto.

### Feature

1. Ve a GitHub -> Issues -> New Issue.
2. Elige `Feature request`.
3. Completa problema, propuesta y criterios de aceptacion.

Resultado: la feature queda lista para planning tecnico.

## 4) Como usar el PR template

Al abrir un PR, el template aparece automaticamente. Debes completar:

- Resumen de cambio.
- Tipo de cambio.
- Modulo(s) afectados.
- Checklist general.
- Checklist especifico por modulo.
- Evidencia.
- Riesgo y rollback.

Regla operativa: no mergear PR con checklist incompleto.

## 5) Flujos por tipo de trabajo

### A) Feature normal

Rama origen: `feature/*` desde `develop`.

Rama destino PR: `develop`.

### B) Fix no urgente

Rama origen: `fix/*` desde `develop`.

Rama destino PR: `develop`.

### C) Release planificada

1. Crea `release/<fecha>-vX.Y.Z` desde `develop`.
2. Solo fixes de estabilizacion.
3. PR a `main`.
4. Tag en `main`.
5. Merge de `main` a `develop`.

### D) Hotfix de produccion

1. Crea `hotfix/<modulo>-<incidente>` desde `main`.
2. Aplica fix minimo y valida.
3. PR a `main`.
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
