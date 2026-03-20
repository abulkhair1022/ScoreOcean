# Razorpay Setup Guide for India

## Why Razorpay?

Razorpay is perfect for Indian businesses with:
- Support for UPI, Cards, Net Banking, Wallets
- Better local payment method support
- Instant settlements
- Lower fees for Indian transactions
- Easy KYC and onboarding

## 1. Create Your Razorpay Account

1. Go to https://razorpay.com
2. Click "Sign Up" 
3. Fill in your details:
   - Email address
   - Mobile number
   - Business name
4. Verify your email and mobile number
5. Complete your business profile

## 2. Get Your API Keys

### Test Mode Keys (for development)

1. Log in to Razorpay Dashboard: https://dashboard.razorpay.com
2. Make sure you're in "Test Mode" (toggle in the left sidebar)
3. Go to **Settings** → **API Keys**
4. Click **Generate Test Key** (if not already generated)
5. You'll see two keys:
   - **Key ID** (starts with `rzp_test_`)
   - **Key Secret** (click "Show" to reveal)

⚠️ **Important**: Keep your Key Secret secure and never commit it to version control!

### Live Mode Keys (for production)

1. Complete KYC verification:
   - Go to **Account & Settings** → **KYC**
   - Upload required documents (PAN, GST, Bank details)
   - Wait for approval (usually 24-48 hours)

2. Once approved, switch to "Live Mode"
3. Go to **Settings** → **API Keys**
4. Generate live keys:
   - **Key ID** (starts with `rzp_live_`)
   - **Key Secret**

## 3. Configure Webhooks

Webhooks notify your backend when payment events occur.

### Setup Steps:

1. In Razorpay Dashboard, go to **Settings** → **Webhooks**
2. Click **Create New Webhook**
3. Enter your webhook URL:
   - Development: `http://localhost:3000/api/payments/webhook`
   - Production: `https://your-domain.com/api/payments/webhook`
4. Select events to listen to:
   - ✅ `payment.captured`
   - ✅ `payment.failed`
   - ✅ `order.paid`
5. Enter a **Webhook Secret** (create a strong random string)
6. Click **Create Webhook**

### For Local Development (using ngrok):

Since Razorpay needs a public URL for webhooks, use ngrok:

```bash
# Install ngrok
# Download from https://ngrok.com/download

# Start your backend server
cd apps/backend
npm run dev

# In another terminal, expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Add webhook in Razorpay: https://abc123.ngrok.io/api/payments/webhook
```

## 4. Update Environment Variables

Edit `apps/backend/.env`:

```bash
# Payment Gateway (Razorpay)
# For Test Mode:
PAYMENT_GATEWAY_KEY=rzp_test_YOUR_KEY_ID_HERE
PAYMENT_GATEWAY_SECRET=YOUR_KEY_SECRET_HERE
PAYMENT_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET_HERE

# Commission rate (5% = 0.05)
COMMISSION_RATE=0.05

# Frontend URL for payment redirects
FRONTEND_URL=http://localhost:5173
```

### Example:
```bash
PAYMENT_GATEWAY_KEY=rzp_test_1234567890abcd
PAYMENT_GATEWAY_SECRET=abcdefghijklmnopqrstuvwxyz123456
PAYMENT_WEBHOOK_SECRET=my_super_secret_webhook_key_2024
COMMISSION_RATE=0.05
FRONTEND_URL=http://localhost:5173
```

## 5. Install Dependencies

```bash
# Navigate to backend
cd apps/backend

# Remove Stripe and install Razorpay
npm uninstall stripe
npm install razorpay

# Install dependencies
npm install
```

## 6. Frontend Integration

You'll need to add Razorpay checkout to your frontend. Add this script to your HTML:

```html
<!-- In apps/frontend/index.html, add before </body> -->
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

### Frontend Payment Flow Example:

```typescript
// Example payment initiation in your frontend
async function initiatePayment(tournamentId: string, amount: number) {
  try {
    // Step 1: Create order on backend
    const response = await fetch('http://localhost:3000/api/payments/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourAuthToken}`
      },
      body: JSON.stringify({ tournamentId, amount })
    });

    const { data } = await response.json();
    const { orderId, amount: orderAmount, currency, keyId } = data;

    // Step 2: Open Razorpay checkout
    const options = {
      key: keyId, // Your Razorpay Key ID
      amount: orderAmount, // Amount in paise
      currency: currency,
      name: 'Score Ocean',
      description: 'Tournament Registration',
      order_id: orderId,
      handler: async function (response: any) {
        // Step 3: Verify payment on backend
        const verifyResponse = await fetch('http://localhost:3000/api/payments/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${yourAuthToken}`
          },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature
          })
        });

        if (verifyResponse.ok) {
          alert('Payment successful!');
          // Redirect to success page
          window.location.href = '/payment/success';
        }
      },
      prefill: {
        name: 'User Name',
        email: 'user@example.com',
        contact: '9999999999'
      },
      theme: {
        color: '#3399cc'
      }
    };

    const razorpay = new (window as any).Razorpay(options);
    razorpay.open();
  } catch (error) {
    console.error('Payment initiation failed:', error);
  }
}
```

## 7. Test Your Integration

### Using Razorpay Test Cards:

When in test mode, use these test payment methods:

#### Test Cards:
- **Success**: `4111 1111 1111 1111`
- **Failure**: `4111 1111 1111 1234`
- CVV: Any 3 digits
- Expiry: Any future date

#### Test UPI:
- UPI ID: `success@razorpay`
- UPI ID (failure): `failure@razorpay`

#### Test Net Banking:
- Select any bank
- Use credentials provided on test page

### Test Payment Flow:

1. Start your backend:
```bash
cd apps/backend
npm run dev
```

2. Start your frontend:
```bash
cd apps/frontend
npm run dev
```

3. Register for a tournament that requires payment
4. Complete the Razorpay checkout with test credentials
5. Verify the payment status updates correctly

## 8. Verify Webhook Events

### Test Webhooks Locally:

1. Use ngrok to expose your local server:
```bash
ngrok http 3000
```

2. Update webhook URL in Razorpay Dashboard with ngrok URL

3. Make a test payment and check your backend logs

4. You should see webhook events being received and processed

### Check Backend Logs:

Your backend should log:
- Order creation
- Payment capture
- Webhook events
- Notification sending

## 9. Go Live Checklist

Before switching to production:

- [ ] Complete Razorpay KYC verification
- [ ] Add bank account details for settlements
- [ ] Verify business details (PAN, GST if applicable)
- [ ] Switch to live API keys in production environment
- [ ] Update webhook endpoint to production URL
- [ ] Test with real payment methods (small amounts)
- [ ] Set up proper error monitoring
- [ ] Enable 2FA on Razorpay account
- [ ] Review settlement schedule (instant/daily/weekly)

## 10. Payment Methods Supported

Razorpay supports all major Indian payment methods:

- 💳 **Credit/Debit Cards**: Visa, Mastercard, RuPay, Amex
- 📱 **UPI**: Google Pay, PhonePe, Paytm, BHIM
- 🏦 **Net Banking**: 50+ banks
- 💰 **Wallets**: Paytm, PhonePe, Mobikwik, Freecharge
- 💵 **EMI**: Credit card EMI, Cardless EMI
- 🏪 **Pay Later**: LazyPay, Simpl, ZestMoney

## 11. Fees and Pricing

Razorpay charges:
- **Domestic Cards**: 2% per transaction
- **UPI**: 2% per transaction (free for first ₹50,000)
- **Net Banking**: 2% per transaction
- **Wallets**: 2% per transaction
- **International Cards**: 3% + ₹2 per transaction

No setup fees, no annual fees, no hidden charges!

## 12. Settlement Schedule

- **Instant Settlements**: Available for verified businesses (T+0)
- **Standard Settlements**: T+2 to T+7 days
- **Settlement Account**: Add your bank account in Dashboard

## 13. Currency Configuration

Your app is configured for INR (Indian Rupees). Razorpay supports:
- INR (Indian Rupee) - Primary
- USD, EUR, GBP - For international payments

## 14. Commission Rate

The platform takes a 5% commission by default. To change:

```bash
# In .env file
COMMISSION_RATE=0.05  # 5% commission
```

## 15. Troubleshooting

### Common Issues:

1. **"Payment gateway is not configured"**
   - Check that your `.env` file has the correct Razorpay keys
   - Restart your backend server after updating `.env`
   - Verify keys are not expired

2. **Webhook signature verification failed**
   - Ensure `PAYMENT_WEBHOOK_SECRET` matches your webhook configuration
   - Check that webhook secret is correctly set in Razorpay Dashboard
   - Verify the signature header is `x-razorpay-signature`

3. **Payment succeeds but registration not confirmed**
   - Check backend logs for webhook processing errors
   - Verify webhook events are being received
   - Check database for payment status updates

4. **Razorpay checkout not opening**
   - Ensure Razorpay script is loaded in HTML
   - Check browser console for errors
   - Verify Key ID is correct

5. **"Order not found" error**
   - Ensure order is created before opening checkout
   - Check that order ID is passed correctly
   - Verify order hasn't expired (orders expire after 15 minutes)

## 16. Security Best Practices

1. ✅ Never commit API keys to version control
2. ✅ Use environment variables for all secrets
3. ✅ Always verify webhook signatures
4. ✅ Always verify payment signatures on backend
5. ✅ Use HTTPS in production
6. ✅ Implement rate limiting on payment endpoints
7. ✅ Log all payment events for audit trails
8. ✅ Enable 2FA on Razorpay account
9. ✅ Regularly rotate API keys
10. ✅ Monitor for suspicious transactions

## 17. Testing Checklist

- [ ] Test successful payment with card
- [ ] Test successful payment with UPI
- [ ] Test failed payment
- [ ] Test webhook events
- [ ] Test payment verification
- [ ] Test duplicate payment prevention
- [ ] Test payment timeout
- [ ] Test refund flow (if applicable)
- [ ] Test with different browsers
- [ ] Test on mobile devices

## 18. Support Resources

- **Razorpay Documentation**: https://razorpay.com/docs/
- **API Reference**: https://razorpay.com/docs/api/
- **Integration Guide**: https://razorpay.com/docs/payments/payment-gateway/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/
- **Support**: support@razorpay.com
- **Phone**: 1800-102-0555 (India)

## 19. Compliance & Legal

- Razorpay is PCI DSS Level 1 certified
- Compliant with RBI guidelines
- Automatic GST invoicing
- TDS handling for settlements
- Automatic reconciliation

## 20. Next Steps

1. ✅ Create Razorpay account
2. ✅ Get test API keys
3. ✅ Update `.env` file
4. ✅ Install dependencies
5. ✅ Test payment flow
6. ✅ Set up webhooks
7. ✅ Complete KYC for live mode
8. ✅ Go live!

---

## Quick Reference

### Environment Variables:
```bash
PAYMENT_GATEWAY_KEY=rzp_test_YOUR_KEY_ID
PAYMENT_GATEWAY_SECRET=YOUR_KEY_SECRET
PAYMENT_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET
COMMISSION_RATE=0.05
FRONTEND_URL=http://localhost:5173
```

### Test Credentials:
- Card: `4111 1111 1111 1111`
- UPI: `success@razorpay`
- CVV: Any 3 digits
- Expiry: Any future date

### Important URLs:
- Dashboard: https://dashboard.razorpay.com
- Docs: https://razorpay.com/docs/
- Support: support@razorpay.com

---

Need help? Check the troubleshooting section or contact Razorpay support!
