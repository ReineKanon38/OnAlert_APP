#!/usr/bin/env node

/**
 * Test Script: Email Service - Delivery Test
 * Tests actual email delivery with SMTP configuration
 */

require('dotenv').config();
const emailService = require('../services/emailService');

console.log('📧 OnAlert Email Service - Delivery Test\n');

// Check if email is configured
if (!emailService.isEmailConfigured()) {
  console.error('❌ Error: Email is not configured!');
  console.error('\nPlease add these to your .env file:');
  console.error('  SMTP_HOST=smtp.gmail.com');
  console.error('  SMTP_PORT=587');
  console.error('  SMTP_USER=your-email@gmail.com');
  console.error('  SMTP_PASS=your-app-password');
  console.error('  COORD_EMAILS=coordinator@university.edu');
  process.exit(1);
}

console.log('✅ Email configuration detected');
console.log(`   Recipients: ${emailService.getRecipients().join(', ')}\n`);

// Sample data
const testAlert = {
  id: 'TEST-DELIVERY-001',
  usuario: 'Test User',
  email: 'testuser@university.edu',
  role: 'student',
  descripcion: 'This is a test incident for email delivery validation',
  observacion: 'Email service is working correctly',
  estado: 'cerrada',
  prioridad: 'media',
  latitude: 14.054333,
  longitude: -87.192111,
  createdAt: new Date(),
  updatedAt: new Date(),
};

async function runTests() {
  console.log('🧪 Running email delivery tests...\n');

  try {
    // Test 1: Send Incident Report
    console.log('1️⃣  Sending incident report email...');
    const result1 = await emailService.sendIncidentReport({
      alert: testAlert,
      guardName: 'Test Guard',
    });
    if (result1.success) {
      console.log('   ✅ Incident report sent successfully');
      console.log(`   Message ID: ${result1.messageId}\n`);
    } else {
      console.error(`   ❌ Failed: ${result1.error || result1.reason}\n`);
    }

    // Test 2: Send Urgent Alert Notification
    console.log('2️⃣  Sending urgent alert notification...');
    const result2 = await emailService.sendUrgentAlertNotification({
      alert: { ...testAlert, estado: 'pendiente' },
      userName: 'Urgent Alert User',
    });
    if (result2.success) {
      console.log('   ✅ Urgent alert sent successfully');
      console.log(`   Message ID: ${result2.messageId}\n`);
    } else {
      console.error(`   ❌ Failed: ${result2.error || result2.reason}\n`);
    }

    // Test 3: Send False Alarm Confirmation
    console.log('3️⃣  Sending false alarm confirmation...');
    const result3 = await emailService.sendFalseAlarmConfirmation({
      alert: testAlert,
      guardName: 'Test Guard',
      reason: 'System test - no actual false alarm',
    });
    if (result3.success) {
      console.log('   ✅ False alarm confirmation sent successfully');
      console.log(`   Message ID: ${result3.messageId}\n`);
    } else {
      console.error(`   ❌ Failed: ${result3.error || result3.reason}\n`);
    }

    // Test 4: Send Daily Summary
    console.log('4️⃣  Sending daily summary...');
    const result4 = await emailService.sendDailySummary({
      summary: {
        total: 5,
        cerradas: 3,
        pendientes: 1,
        falsas_alarmas: 1,
      },
      date: new Date().toLocaleDateString('es-MX'),
    });
    if (result4.success) {
      console.log('   ✅ Daily summary sent successfully');
      console.log(`   Message ID: ${result4.messageId}\n`);
    } else {
      console.error(`   ❌ Failed: ${result4.error || result4.reason}\n`);
    }

    console.log('✨ All tests completed!');
    console.log('📧 Check your email inbox (and spam folder) for test messages.');
  } catch (error) {
    console.error('❌ Test error:', error.message);
    process.exit(1);
  }
}

runTests().then(() => {
  console.log('\n✅ Test completed successfully');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
