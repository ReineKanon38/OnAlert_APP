# OnAlert_APP

Repositorio monorepo de OnAlert con:

- `app_movil`: App Flutter.
- `backend`: API Node.js.
- `dashboard_guardias`: Dashboard web (Vite + React + TS).

## Flujo de ramas (Git)

Para optimizar desarrollo y reducir conflictos, usamos este modelo:

- `main`: Produccion estable.
- `develop`: Integracion continua de features.
- `release/*`: Estabilizacion previa a liberar.
- `hotfix/*`: Correcciones urgentes sobre produccion.
- `feature/*`: Trabajo de funcionalidad nueva.
- `fix/*`: Correcciones no urgentes.
- `chore/*`: Tareas tecnicas (deps, tooling, CI).

Ejemplos:

- `feature/auth-refresh`
- `fix/alerts-filter`
- `chore/flutter-upgrade-3-32`

## Reglas rapidas

- No trabajar directo sobre `main`.
- Todo cambio entra por PR hacia `develop`.
- Solo `release/*` y `hotfix/*` pueden mergear a `main`.
- Commits pequenos, claros y frecuentes.

## Primer setup local

```bash
git checkout develop
git pull
```

Crear feature:

```bash
git checkout -b feature/nombre-corto develop
```

Publicar feature:

```bash
git push -u origin feature/nombre-corto
```

Guia completa en `CONTRIBUTING.md`.

Guia operativa paso a paso en `WORKFLOW_GUIDE.md`.

Guia de diagramas UML y modelo de BD en `UML_SUPABASE_GUIDE.md`.