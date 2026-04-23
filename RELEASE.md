# RELEASE - OnAlert

Esta guia define como versionar y publicar versiones estables.

## 1) Esquema de version

Usamos SemVer con prefijo `v`:

- `vMAJOR.MINOR.PATCH`
- Ejemplos: `v0.1.0`, `v0.1.1`, `v1.0.0`

## 2) Cuando subir version

- `PATCH` (`v0.1.1`): bugfixes y ajustes internos compatibles.
- `MINOR` (`v0.2.0`): nuevas capacidades compatibles.
- `MAJOR` (`v1.0.0`): cambios incompatibles.

## 3) Flujo de release recomendado

1. Crear rama `release/<fecha>-vX.Y.Z` desde `develop`.
2. Hacer solo fixes de estabilizacion en esa rama.
3. Abrir PR de release hacia `main`.
4. Al mergear, crear tag anotado y publicar.
5. Merge de `main` de vuelta a `develop`.

## 4) Comandos de tagging

```bash
git checkout main
git pull
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

## 5) Notas de release

En GitHub Release incluir:

- Resumen ejecutivo (1 parrafo).
- Cambios por modulo:
  - app_movil
  - backend
  - dashboard_guardias
- Migraciones o pasos manuales.
- Riesgos conocidos.

## 6) Hotfix en produccion

1. Crear `hotfix/<modulo>-<incidente>` desde `main`.
2. Validar fix minimo.
3. Merge a `main` y tag patch (`vX.Y.Z+1`).
4. Merge a `develop` para mantener consistencia.