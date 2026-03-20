# Razorpay Integration Complete! 🎉

## ✅ What's Been Set Up

### Backend Configuration
- ✅ Razorpay SDK installed (v2.9.2)
- ✅ Environment variables configured in `.env`
- ✅ Payment service implemented with Razorpay
- ✅ Payment routes registered (`/api/payments/*`)
- ✅ Webhook handling configured

### Frontend Integration
- ✅ Razorpay Checkout script added to HTML
- ✅ Payment flow integrated in Tournaments page
- ✅ Payment verification implemented

### Your Credentials (Test Mode)
```
Key ID: rzp_test_SKhbFR6udRnBrL
Secret: cY8xiCgTvreWKzxPUrPPYSMK
Webhook Secret: score_ocean_webhook_secret_2024
Commission Rate: 5%
```

## 🧪 How to Test

### Step 1: Start Your Servers

**Terminal 1 - Backend:**
```bash
cd apps/backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd apps/frontend
npm run dev
```

### Step 2: Test Payment Flow

1. Open your app at `http://localhost:5173`
2. Login to your account
3. Go to Tournaments page
4. Find a tournament with a registration fee
5. Click "Register" and select your team
6. Click "Confirm Registration"
7. Razorpay checkout modal will open

### Step 3: Use Test Credentials

**Test Card (Success):**
- Card Number: `4111 1111 1111 1111`
- CVV: Any 3 digits (e.g., `123`)
- Expiry: Any future date (e.g., `12/25`)
- Name: Any name

**Test UPI (Success):**
- UPI ID: `success@razorpay`

**Test Card (Failure):**
- Card Number: `4111 1111 1111 1234`

### Step 4: Verify Payment

After successful payment:
- ✅ You'll see a success toast notification
- ✅ Your registration status will update to "CONFIRMED"
- ✅ Payment record will be created in database
- ✅ You'll receive an in-app notification

## 📋 API Endpoints Available

### 1. Initiate Payment
```
POST /api/payments/initiate
Authorization: Bearer <token>

Body:
{
  "tournamentId": "uuid",
  "amount": 500
}

Response:
{
  "success": true,
  "data": {
    "orderId": "order_xxx",
    "amount": 50000,
    "currency": "INR",
    "keyId": "rzp_test_xxx"
  }
}
```

### 2. Verify Payment
```
POST /api/payments/verify
Authorization: Bearer <token>

Body:
{
  "orderId": "order_xxx",
  "paymentId": "pay_xxx",
  "signature": "signature_xxx"
}

Response:
{
  "success": true,
  "message": "Payment verified successfully"
}
```

### 3. Get Payment Details
```
GET /api/payments/:paymentId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "uuid",
    "tournamentId": "uuid",
    "amount": 500,
    "commission": 25,
    "status": "COMPLETED",
    "gatewayTransactionId": "order_xxx",
    "createdAt": "2024-01-01T00:00:00Z",
    "completedAt": "2024-01-01T00:05:00Z"
  }
}
```

### 4. Get Transaction History
```
GET /api/payments/history/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [...]
}
```

### 5. Get Host Revenue
```
GET /api/payments/revenue/me
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "revenue": 9500
  }
}
```

## 🔔 Setting Up Webhooks (For Production)

### For Local Development (using ngrok):

1. **Install ngrok:**
   ```bash
   # Download from https://ngrok.com/download
   ```

2. **Start your backend:**
   ```bash
   cd apps/backend
   npm run dev
   ```

3. **Expose with ngrok:**
   ```bash
   ngrok http 3000
   ```

4. **Configure in Razorpay Dashboard:**
   - Go to: https://dashboard.razorpay.com/app/webhooks
   - Click "Create New Webhook"
   - URL: `https://your-ngrok-url.ngrok.io/api/payments/webhook`
   - Secret: `score_ocean_webhook_secret_2024`
   - Events to select:
     - ✅ payment.captured
     - ✅ payment.failed
     - ✅ order.paid

### For Production:

Update webhook URL to your production domain:
```
https://your-domain.com/api/payments/webhook
```

## 🎯 Payment Flow Diagram

```
User clicks "Register" 
    ↓
Frontend calls /api/payments/initiate
    ↓
Backend creates Razorpay Order
    ↓
Frontend opens Razorpay Checkout Modal
    ↓
User completes payment
    ↓
Razorpay sends response to frontend
    ↓
Frontend calls /api/payments/verify
    ↓
Backend verifies signature
    ↓
Registration status updated to CONFIRMED
    ↓
Notifications sent to user & team members
    ↓
Webhook confirms payment (backup)
```

## 🔍 Troubleshooting

### Issue: "Payment gateway is not configured"
**Solution:** 
- Check `.env` file has correct keys
- Restart backend server: `npm run dev`

### Issue: Razorpay modal not opening
**Solution:**
- Check browser console for errors
- Verify Razorpay script is loaded in HTML
- Check that `window.Razorpay` is available

### Issue: Payment succeeds but registration not confirmed
**Solution:**
- Check backend logs for errors
- Verify webhook is configured correctly
- Check database for payment status

### Issue: "Invalid payment signature"
**Solution:**
- Ensure webhook secret matches in both places:
  - `.env` file: `PAYMENT_WEBHOOK_SECRET`
  - Razorpay Dashboard webhook configuration

## 📊 Database Tables

### Payments Table
```sql
SELECT * FROM payments;
```

Columns:
- id (UUID)
- user_id (UUID)
- tournament_id (UUID)
- amount (DECIMAL)
- commission (DECIMAL)
- status (ENUM: PENDING, PROCESSING, COMPLETED, FAILED, REFUNDED)
- gateway_transaction_id (VARCHAR) - Razorpay order_id
- created_at (TIMESTAMP)
- completed_at (TIMESTAMP)

## 💰 Commission Calculation

Default commission: 5% (configurable in `.env`)

Example:
- Registration Fee: ₹500
- Commission (5%): ₹25
- Host Receives: ₹475

## 🚀 Next Steps

1. **Test the payment flow** with test credentials
2. **Set up webhooks** using ngrok for local testing
3. **Complete KYC** in Razorpay Dashboard for live mode
4. **Switch to live keys** when ready for production
5. **Monitor payments** in Razorpay Dashboard

## 📚 Resources

- **Razorpay Dashboard:** https://dashboard.razorpay.com
- **Test Cards:** https://razorpay.com/docs/payments/payments/test-card-details/
- **API Docs:** https://razorpay.com/docs/api/
- **Support:** support@razorpay.com

## ✨ Features Implemented

- ✅ Payment initiation with Razorpay Orders API
- ✅ Secure payment verification with signature validation
- ✅ Webhook handling for payment events
- ✅ Automatic registration confirmation on payment
- ✅ Notifications to users on payment success/failure
- ✅ Transaction history tracking
- ✅ Host revenue calculation
- ✅ Commission management
- ✅ Test mode support

---

**Your Razorpay integration is ready to use!** 🎊

Start testing with the test credentials above, and let me know if you encounter any issues.
