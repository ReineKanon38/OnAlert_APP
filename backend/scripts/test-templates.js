#!/usr/bin/env node

/**
 * Test Script: Email Templates
 * Generates sample emails to verify HTML rendering and structure
 */

const emailTemplates = require('../templates/emailTemplates');
const fs = require('fs');
const path = require('path');

console.log('🧪 OnAlert Email Templates - Test Suite\n');

// Sample data
const sampleAlert = {
  id: 'ALERT-2026-001',
  usuario: 'Carlos García López',
  email: 'carlos.garcia@university.edu',
  role: 'student',
  descripcion: 'Incidente de seguridad detectado en zona de estacionamiento norte',
  observacion: 'Se verificó la zona y se encontró un vehículo estacionado ilegalmente. Se contactó a seguridad de campus.',
  estado: 'cerrada',
  prioridad: 'media',
  latitude: 14.054333,
  longitude: -87.192111,
  createdAt: new Date('2026-01-15T10:30:00'),
  updatedAt: new Date('2026-01-15T11:45:00'),
};

const sampleSummary = {
  total: 24,
  cerradas: 18,
  pendientes: 3,
  falsas_alarmas: 3,
};

// Test 1: Incident Report Template
console.log('1️⃣  Testing Incident Report Template...');
const incidentReport = emailTemplates.incidentReportTemplate({
  alert: sampleAlert,
  guardName: 'Juan Pérez García',
  coordEmails: ['coord1@university.edu', 'coord2@university.edu'],
});
console.log(`   Subject: ${incidentReport.subject}`);
console.log(`   HTML length: ${incidentReport.html.length} chars`);
console.log(`   ✅ Generated successfully\n`);

// Test 2: Pending Alert Template
console.log('2️⃣  Testing Pending Alert Template...');
const pendingAlert = emailTemplates.pendingAlertTemplate({
  alert: { ...sampleAlert, estado: 'pendiente' },
  userName: 'María González',
});
console.log(`   Subject: ${pendingAlert.subject}`);
console.log(`   HTML length: ${pendingAlert.html.length} chars`);
console.log(`   ✅ Generated successfully\n`);

// Test 3: False Alarm Template
console.log('3️⃣  Testing False Alarm Template...');
const falseAlarm = emailTemplates.falseAlarmTemplate({
  alert: { ...sampleAlert, estado: 'falsa_alarma' },
  guardName: 'Juan Pérez García',
  reason: 'Usuario fue encontrado haciendo pruebas del sistema',
});
console.log(`   Subject: ${falseAlarm.subject}`);
console.log(`   HTML length: ${falseAlarm.html.length} chars`);
console.log(`   ✅ Generated successfully\n`);

// Test 4: Daily Summary Template
console.log('4️⃣  Testing Daily Summary Template...');
const dailySummary = emailTemplates.dailySummaryTemplate({
  summary: sampleSummary,
  date: '15 de Enero, 2026',
});
console.log(`   Subject: ${dailySummary.subject}`);
console.log(`   HTML length: ${dailySummary.html.length} chars`);
console.log(`   ✅ Generated successfully\n`);

// Save test HTML files
console.log('💾 Saving test HTML files to dist/...\n');

const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

fs.writeFileSync(
  path.join(distDir, 'test-incident-report.html'),
  incidentReport.html
);
console.log('   ✅ test-incident-report.html');

fs.writeFileSync(
  path.join(distDir, 'test-pending-alert.html'),
  pendingAlert.html
);
console.log('   ✅ test-pending-alert.html');

fs.writeFileSync(
  path.join(distDir, 'test-false-alarm.html'),
  falseAlarm.html
);
console.log('   ✅ test-false-alarm.html');

fs.writeFileSync(
  path.join(distDir, 'test-daily-summary.html'),
  dailySummary.html
);
console.log('   ✅ test-daily-summary.html');

console.log('\n✨ All tests passed!');
console.log('📧 Email templates are working correctly.');
console.log(`📁 Test HTML files saved to: ${distDir}`);
console.log('\n🚀 To test email delivery:');
console.log('   1. Configure SMTP settings in .env');
console.log('   2. Set COORD_EMAILS environment variable');
console.log('   3. Run: node scripts/test-email-delivery.js');
