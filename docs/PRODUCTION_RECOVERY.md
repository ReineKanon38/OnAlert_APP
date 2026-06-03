# OnAlert - Recovery Guide (Production)

This guide restores production stack in this order:
1. Supabase
2. Render (API)
3. Resend (email)
4. Vercel (dashboard)
5. Android app build/release

## 0) Known production URLs
- Backend API: https://onalert-api.onrender.com
- API Health: https://onalert-api.onrender.com/health
- API Docs: https://onalert-api.onrender.com/docs
- Dashboard: Vercel project URL

## 1) Supabase checks
Confirm project is active and reachable.

Required values:
- DATABASE_URL (PostgreSQL connection string)
- SUPABASE_URL
- SUPABASE_SERVICE_KEY (service role key)
- SUPABASE_STORAGE_BUCKET=profile-photos

Storage:
- Bucket profile-photos exists
- Public read enabled for profile photos if app depends on public URLs

DB sanity:
- users table exists
- alerts table exists
- alert_status_logs table exists

## 2) Render API checks
Render service expected from backend/render.yaml:
- Service name: onalert-api
- Runtime: Node
- Root directory: backend
- Build command: npm install
- Start command: npm start

Required environment variables in Render:
- DATABASE_URL
- JWT_SECRET
- SECURITY_SEED_PASSWORD
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
- SUPABASE_STORAGE_BUCKET=profile-photos
- FIREBASE_SERVICE_ACCOUNT_JSON
- COORD_EMAILS
- ADMIN_EMAILS
- RESEND_API_KEY

Optional/legacy SMTP values (not required for Resend flow):
- SMTP_HOST
- SMTP_PORT
- SMTP_SECURE
- SMTP_USER
- SMTP_PASS

Health verification:
- Open https://onalert-api.onrender.com/health and verify JSON contains ok=true
- Open https://onalert-api.onrender.com/docs and verify Swagger loads

## 3) Resend checks
In Resend:
- API key active
- Sender domain configured (recommended)

In Render env:
- RESEND_API_KEY set and valid

Behavior note:
- If RESEND_API_KEY is missing, backend keeps running but email notifications are skipped.

## 4) Vercel dashboard checks
Project folder: dashboard_guardias

Required environment variable in Vercel:
- VITE_API_URL=https://onalert-api.onrender.com

Build/runtime:
- Install command: npm install
- Build command: npm run build
- Output: dist

After deploy:
- Login from dashboard works
- Alerts list and status updates call backend without CORS/network errors

## 5) Android app (production)
Build app with production API URL:

  cd app_movil
  flutter pub get
  flutter build apk --release --target-platform android-arm64 --dart-define=API_BASE_URL=https://onalert-api.onrender.com

APK output:
- app_movil/build/app/outputs/flutter-apk/app-release.apk

GitHub release flow used in this repository:
- Release tag: v1.0.0-build1
- Asset: OnAlert-android-release.apk

## 6) Smoke test (end-to-end)
1. Mobile login works
2. Create test alert from app
3. Dashboard receives/refreshes alert
4. Guard updates status in dashboard
5. App sees updated status
6. Incident report email arrives (Resend)

## 7) Fast triage map
If /health fails:
- Check Render logs first
- Validate DATABASE_URL and JWT_SECRET

If app can login but profile photo fails:
- Check SUPABASE_URL and SUPABASE_SERVICE_KEY
- Check profile-photos bucket

If app and dashboard do not sync real-time:
- Check Socket.IO traffic on backend logs
- Verify dashboard uses VITE_API_URL pointing to Render

If no emails:
- Check RESEND_API_KEY
- Check recipients in COORD_EMAILS and ADMIN_EMAILS

## 8) Current app version reference
From app_movil/pubspec.yaml:
- version: 1.0.0+1
