# 📧 OnAlert Email System - Quick Start Guide

## ⚡ 2-Minute Setup

### 1. Configure SMTP (Gmail Example)

Add to `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=16-char-app-password
COORD_EMAILS=coordinator@university.edu,admin@university.edu
```

**Get App Password:**
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" + "Windows Computer"
3. Copy 16-character password → paste in SMTP_PASS

### 2. Test Email Templates

```bash
cd backend
node scripts/test-templates.js
```

Output: HTML files generated in `backend/scripts/dist/` ✅

### 3. Test Email Delivery

```bash
cd backend
node scripts/test-email-delivery.js
```

Sends 4 test emails to your COORD_EMAILS ✅

## 🎯 What Emails Are Sent?

| Event | Template | Recipients | Purpose |
|-------|----------|-----------|---------|
| Incident Closed | Incident Report | COORD_EMAILS | Final documentation |
| Incident → False Alarm | False Alarm Confirmation | COORD_EMAILS | Classification logging |
| Manual Trigger | Urgent Alert | COORD_EMAILS | Immediate response |
| Scheduled | Daily Summary | COORD_EMAILS | Morning briefing |

## 📱 Mobile App Integration

When a guard closes an incident on the dashboard:

1. Guard changes incident state → **"Resuelto"**
2. Backend creates status log + sends incident report email
3. Email arrives at coordinator inbox within seconds
4. Email includes: user info, location map, description, observations

## 🔧 Configuration Options

### Optional Settings

```env
# Admin notifications (separate from coordinators)
ADMIN_EMAILS=admin@university.edu

# Email retry settings
EMAIL_RETRY_ATTEMPTS=3
EMAIL_RETRY_DELAY=5000

# Sender name customization
EMAIL_SENDER_NAME=OnAlert Security System

# Daily summary schedule (cron format)
DAILY_SUMMARY_TIME=09:00
```

### Recipients Priority

```
COORD_EMAILS    → Primary (incident reports)
ADMIN_EMAILS    → Secondary (system notifications)
```

## 🧪 Testing Checklist

- [ ] SMTP credentials configured
- [ ] Recipients list not empty
- [ ] Test templates: `node scripts/test-templates.js`
- [ ] Test delivery: `node scripts/test-email-delivery.js`
- [ ] Check inbox for 4 test emails
- [ ] Verify HTML renders correctly
- [ ] Check spam/junk folder

## ❌ Troubleshooting

### "Email not configured" message
```bash
# Solution: Verify .env has SMTP_USER and SMTP_PASS
grep SMTP .env
```

### Emails not received
```bash
# Check server logs
npm start 2>&1 | grep "[Email]"

# Verify recipients
echo $COORD_EMAILS
```

### SMTP Connection Failed
```bash
# Test SMTP connection
telnet smtp.gmail.com 587

# Try different port
SMTP_PORT=465
SMTP_SECURE=true
```

## 🚀 Production Deployment

```bash
# 1. Set environment variables securely
export SMTP_HOST=smtp.company.com
export SMTP_USER=noreply@company.edu
export SMTP_PASS=secure-password
export COORD_EMAILS="coord1@company.edu,coord2@company.edu"

# 2. Start backend
npm start

# 3. Verify emails are being sent
npm start 2>&1 | grep "[Email]"
```

## 📊 Email Statistics

View email logs in server console:

```
[Email] ✅ Correo enviado: [OnAlert] Incidente Resuelta — Carlos García
[Email] Destinatarios: coordinator@university.edu
[Email] Message ID: <CAabc123...@gmail.com>
```

## 🔐 Security Tips

1. **Never commit .env** to Git
2. **Use environment variables** for passwords
3. **Rotate passwords regularly** (especially Gmail App Passwords)
4. **Use HTTPS/TLS** for production (SMTP_SECURE=true)
5. **Limit recipients** to necessary staff only
6. **Monitor email logs** for anomalies

## 📚 Full Documentation

See [backend/EMAIL_SETUP.md](./backend/EMAIL_SETUP.md) for:
- Detailed configuration guide
- Custom SMTP servers
- Email API reference
- Advanced troubleshooting

## 🆘 Getting Help

1. **Test scripts fail?**
   - Run: `node -c backend/services/emailService.js`
   - Check: `echo $SMTP_USER`

2. **Emails not sending?**
   - Check server logs: `npm start`
   - Review: [EMAIL_SETUP.md](./backend/EMAIL_SETUP.md)
   - Verify SMTP credentials

3. **Template rendering issues?**
   - Check HTML files: `backend/scripts/dist/`
   - Open in browser for preview
   - Verify inline CSS is preserved

## ✨ Features

✅ Professional HTML templates with responsive design  
✅ Centralized email service with error handling  
✅ Multiple recipient lists (coordinators/admins)  
✅ Embedded maps and real-time information  
✅ Automatic status-based email triggers  
✅ Test scripts for validation  
✅ Comprehensive logging  
✅ Security-first design  

## 🎯 Next Steps

1. ✅ Configure SMTP in .env
2. ✅ Run template test: `node scripts/test-templates.js`
3. ✅ Run delivery test: `node scripts/test-email-delivery.js`
4. ✅ Check inbox for test emails
5. ✅ Deploy to production

---

**Questions?** Check [EMAIL_SETUP.md](./backend/EMAIL_SETUP.md) or review test scripts for examples.
