# Email Service Configuration - OnAlert

## Overview

OnAlert includes an automated email notification system for incident reporting. The system sends professional HTML emails to coordinators when incidents are closed or classified as false alarms.

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Recipients
COORD_EMAILS=coordinator1@university.edu,coordinator2@university.edu
ADMIN_EMAILS=admin@university.edu
```

### 2. Gmail Setup (Recommended)

1. **Enable "App Passwords":**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Copy the generated 16-character password
   - Use this in `SMTP_PASS`

2. **Alternative (Less Secure):**
   - If App Passwords not available, enable "Less secure app access"
   - Use your regular Gmail password in `SMTP_PASS`

### 3. Custom SMTP Server

For company/institutional mail servers:
- Contact your IT department for SMTP credentials
- Typical ports: 587 (TLS) or 25 (no encryption)
- Some servers require authentication (username/password)

## Email Templates

The system includes 4 professional email templates:

### 1. Incident Report Template
- **Trigger:** When incident is closed (`estado: 'cerrada'`)
- **Recipients:** COORD_EMAILS
- **Content:** Complete incident details, user info, location, timeline
- **Use Case:** Final incident documentation for coordinators

### 2. Pending Alert Template
- **Trigger:** Urgent pending alerts
- **Recipients:** COORD_EMAILS
- **Content:** Urgent notification with action link to map
- **Use Case:** Real-time alerting for active incidents

### 3. False Alarm Template
- **Trigger:** When incident marked as false alarm (`estado: 'falsa_alarma'`)
- **Recipients:** COORD_EMAILS
- **Content:** Incident ID, classifier info, reason, timestamp
- **Use Case:** Institutional tracking of false alarms

### 4. Daily Summary Template
- **Trigger:** Optional - can be scheduled
- **Recipients:** COORD_EMAILS
- **Content:** Statistics grid with daily metrics
- **Use Case:** Daily briefing for coordinators

## Email Service API

Located in `backend/services/emailService.js`:

### Functions

#### `sendIncidentReport(alert, guardName)`
Sends professional incident report email when incident is resolved or marked as false alarm.

```javascript
emailService.sendIncidentReport({
  alert: { id, usuario, email, descripcion, observacion, estado, ... },
  guardName: 'Guard Name'
});
```

#### `sendUrgentAlertNotification(alert, userName)`
Sends urgent notification for pending alerts.

```javascript
emailService.sendUrgentAlertNotification({
  alert: { id, latitude, longitude, ... },
  userName: 'Alert Creator'
});
```

#### `sendFalseAlarmConfirmation(alert, guardName, reason)`
Sends false alarm classification confirmation.

```javascript
emailService.sendFalseAlarmConfirmation({
  alert: { id, ... },
  guardName: 'Guard Name',
  reason: 'Reason for false alarm'
});
```

#### `sendDailySummary(summary, date)`
Sends daily statistics summary.

```javascript
emailService.sendDailySummary({
  summary: {
    total: 10,
    cerradas: 8,
    pendientes: 1,
    falsas_alarmas: 1
  },
  date: '2026-01-15'
});
```

#### `isEmailConfigured()`
Returns `true` if SMTP is properly configured.

```javascript
if (emailService.isEmailConfigured()) {
  // Email system is ready
}
```

## Testing Email Delivery

### 1. Check Configuration

```bash
# From backend directory
node -e "const e = require('./services/emailService'); console.log('Email configured:', e.isEmailConfigured())"
```

### 2. Send Test Email

```javascript
const emailService = require('./services/emailService');

const testAlert = {
  id: 'TEST-001',
  usuario: 'John Doe',
  email: 'john@example.com',
  descripcion: 'Test incident',
  observacion: 'Test observation',
  estado: 'cerrada',
  latitude: 14.0543,
  longitude: -87.1921,
  createdAt: new Date(),
  updatedAt: new Date(),
  prioridad: 'alta'
};

emailService.sendIncidentReport({
  alert: testAlert,
  guardName: 'Test Guard'
}).then(result => console.log('Email result:', result));
```

### 3. Check Server Logs

When an email is sent, you'll see:

```
[Email] ✅ Correo enviado: [OnAlert] Incidente Resuelta — John Doe
[Email] Destinatarios: coordinator@university.edu
```

## Troubleshooting

### "Email not configured" Warning

**Solution:** Verify `.env` file has:
```env
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

### SMTP Connection Timeout

**Possible causes:**
- Wrong SMTP_HOST or SMTP_PORT
- Firewall blocking SMTP connections
- ISP blocking port 25 (try 587 or 465)

**Solution:**
- Verify port with: `telnet smtp.gmail.com 587`
- Try SMTP_PORT=465 with SMTP_SECURE=true

### "Invalid sender address"

**Solution:**
- SMTP_USER must match the email account credentials
- Gmail requires the sender to be the same account as SMTP_USER

### Emails Not Received

**Check:**
1. Email recipient in COORD_EMAILS is correct
2. Check spam/junk folder
3. Verify email is being sent (check server logs)
4. Check email provider's delivery settings

## Security Best Practices

1. **Never commit `.env` file** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate passwords regularly** (especially Gmail App Passwords)
4. **Use HTTPS/TLS** for SMTP (SMTP_SECURE=true or port 465)
5. **Limit email recipients** to necessary coordinators only
6. **Monitor email delivery** logs for suspicious activity

## Future Enhancements

- [ ] Email read receipts tracking
- [ ] Scheduled daily summary emails
- [ ] Custom email templates per organization
- [ ] Email delivery status dashboard
- [ ] Bounce and retry logic
- [ ] Multi-language email support
- [ ] Email template editor in admin panel

## Reference

- Nodemailer Docs: https://nodemailer.com/
- Gmail App Passwords: https://support.google.com/accounts/answer/185833
- SMTP Protocol: https://en.wikipedia.org/wiki/Simple_Mail_Transfer_Protocol
