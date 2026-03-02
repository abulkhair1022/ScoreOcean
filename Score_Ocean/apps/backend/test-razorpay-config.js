// Quick test to verify Razorpay environment variables are loaded
require('dotenv').config();

console.log('\n=== Razorpay Configuration Check ===\n');

const checks = {
  'PAYMENT_GATEWAY_KEY': process.env.PAYMENT_GATEWAY_KEY,
  'PAYMENT_GATEWAY_SECRET': process.env.PAYMENT_GATEWAY_SECRET,
  'PAYMENT_WEBHOOK_SECRET': process.env.PAYMENT_WEBHOOK_SECRET,
  'COMMISSION_RATE': process.env.COMMISSION_RATE,
  'FRONTEND_URL': process.env.FRONTEND_URL
};

let allConfigured = true;

for (const [key, value] of Object.entries(checks)) {
  const status = value ? '✓' : '✗';
  const display = value ? (key.includes('SECRET') ? '***hidden***' : value) : 'NOT SET';
  console.log(`${status} ${key}: ${display}`);
  if (!value) allConfigured = false;
}

console.log('\n' + (allConfigured ? '✓ All Razorpay config is set!' : '✗ Some config is missing!') + '\n');

if (allConfigured) {
  console.log('Testing Razorpay SDK initialization...\n');
  try {
    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.PAYMENT_GATEWAY_KEY,
      key_secret: process.env.PAYMENT_GATEWAY_SECRET,
    });
    console.log('✓ Razorpay SDK initialized successfully!\n');
  } catch (error) {
    console.log('✗ Razorpay SDK initialization failed:', error.message, '\n');
  }
}
