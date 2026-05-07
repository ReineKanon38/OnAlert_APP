# RELEASE - OnAlert

Guia de versionado, publicacion y historial de versiones del sistema.

---

## Historial de versiones

### v1.0.0 — 2026-05-07 (Produccion temprana)

**App movil (`app_movil/`)**
- Login con validacion de dominio `@tesch.edu.mx` y `@onalert.local`
- Envio de alerta con GPS, descripcion y foto de perfil
- Foto de perfil subida a Supabase Storage (bucket `profile-photos`)
- Push notifications via Firebase Cloud Messaging (FCM v1 / Admin SDK)
- Pantalla de guardia (`GuardHomeScreen`) con alertas en tiempo real via WebSocket
- Routing por rol: `student`/`professor` → HomeScreen, `security`/`admin` → GuardHomeScreen
- APK arm64 release: ~17.8 MB

**Backend (`backend/`)**
- API REST con JWT (Express 5 + Node.js)
- WebSocket tiempo real con Socket.IO
- Cooldown de alertas configurable (`ALERT_COOLDOWN_SECONDS`)
- Deduplicacion por `idempotency_key`
- Push a guardias via Firebase Admin SDK
- Reporte de incidente por email (Nodemailer + Gmail SMTP) al cerrar/falsa alarma
- Keep-alive cada 10 min (anti cold-start Render free tier)
- Documentacion Swagger en `/docs`
- Supabase Storage con service role key (bypass RLS)

**Dashboard (`dashboard_guardias/`)**
- Login exclusivo para `security`/`admin`
- Vista en tiempo real con modal de alerta entrante + mapa OpenStreetMap
- Cambio de estado, prioridad y observacion
- Contador de guardias moviles conectados
- Indicador de conexion WebSocket
- Desplegado en Vercel con `VITE_API_URL` de produccion

**Infraestructura**
- Backend: Render (free tier) — `https://onalert-api.onrender.com`
- Dashboard: Vercel
- Base de datos: PostgreSQL via Supabase (`arjsqaftsrfdxzrluxxe`)
- Storage: Supabase Storage
- FCM: Firebase proyecto `onalert-7082f`

---

## Esquema de version

SemVer con prefijo `v`:

- `PATCH` (`v1.0.1`): bugfixes y ajustes internos compatibles
- `MINOR` (`v1.1.0`): nuevas capacidades compatibles
- `MAJOR` (`v2.0.0`): cambios incompatibles o rediseno mayor

---

## Flujo de release

```bash
# 1. Crear rama de release desde develop
git checkout develop && git pull
git checkout -b release/2026-05-07-v1.0.0

# 2. Solo fixes de estabilizacion en esta rama
# 3. Abrir PR hacia main, completar checklist

# 4. Al mergear, crear tag anotado
git checkout main && git pull
git tag -a v1.0.0 -m "Release v1.0.0 — produccion temprana"
git push origin v1.0.0

# 5. Sincronizar develop
git checkout develop
git merge main
git push origin develop
```

---

## Checklist antes de publicar release

**Backend:**
- [ ] `node --check server.js` sin errores
- [ ] Health check en produccion: `https://onalert-api.onrender.com/health`
- [ ] Variables de entorno en Render verificadas

**App movil:**
- [ ] `flutter analyze lib/` sin errores (warnings OK)
- [ ] APK arm64 release compilado y probado en dispositivo fisico
- [ ] Login de alumno y guardia funcional con credenciales de prueba
- [ ] Flujo completo: alerta → dashboard recibe → push llega

**Dashboard:**
- [ ] `npm run build` exitoso
- [ ] Login en produccion (Vercel) funcional
- [ ] WebSocket conecta y muestra alertas en tiempo real
- [ ] Email de reporte llega al cerrar incidente

---

## Checklist de notas de release en GitHub

En cada GitHub Release incluir:

- Resumen ejecutivo (1 parrafo)
- Cambios por modulo: `app_movil`, `backend`, `dashboard_guardias`
- Migraciones o pasos manuales (p.ej. variables nuevas en Render)
- APK adjunto para distribucion
- Riesgos conocidos

---

## Hotfix en produccion

```bash
git checkout -b hotfix/modulo-incidente main
# fix minimo y validado
git checkout main && git merge hotfix/modulo-incidente
git tag -a v1.0.1 -m "Hotfix: descripcion"
git push origin main --tags
git checkout develop && git merge main && git push
```