// Example: Razorpay Payment Integration in React/TypeScript
// Add this to your tournament registration or payment page

import { useState } from 'react';
import { apiClient } from './api/client'; // Your API client

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface PaymentInitiateResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export function TournamentPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user details from your auth context/store
  const user = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '9999999999',
  };

  const handlePayment = async (tournamentId: string, amount: number) => {
    try {
      setLoading(true);
      setError(null);

      // Step 1: Create order on backend
      const response = await apiClient.post<{ success: boolean; data: PaymentInitiateResponse }>(
        '/api/payments/initiate',
        {
          tournamentId,
          amount,
        }
      );

      const { orderId, amount: orderAmount, currency, keyId } = response.data.data;

      // Step 2: Configure Razorpay options
      const options: RazorpayOptions = {
        key: keyId,
        amount: orderAmount,
        currency: currency,
        name: 'Score Ocean',
        description: 'Tournament Registration Fee',
        order_id: orderId,
        handler: async function (response: RazorpayResponse) {
          // Step 3: Verify payment on backend
          try {
            const verifyResponse = await apiClient.post('/api/payments/verify', {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });

            if (verifyResponse.data.success) {
              // Payment successful
              alert('Payment successful! Your registration is confirmed.');
              // Redirect to success page or refresh data
              window.location.href = '/tournaments?payment=success';
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            setError('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone,
        },
        theme: {
          color: '#3399cc', // Your brand color
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            console.log('Payment cancelled by user');
          },
        },
      };

      // Step 3: Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();

      razorpay.on('payment.failed', function (response: any) {
        setError(`Payment failed: ${response.error.description}`);
        setLoading(false);
      });
    } catch (error: any) {
      console.error('Payment initiation failed:', error);
      setError(error.response?.data?.message || 'Failed to initiate payment');
      setLoading(false);
    }
  };

  return (
    <div className="payment-container">
      <h2>Tournament Registration</h2>
      
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="tournament-details">
        <p>Registration Fee: ₹500</p>
        <p>Platform Fee (5%): ₹25</p>
        <p><strong>Total: ₹525</strong></p>
      </div>

      <button
        onClick={() => handlePayment('tournament-id-123', 525)}
        disabled={loading}
        className="pay-button"
        style={{
          padding: '12px 24px',
          backgroundColor: '#3399cc',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
        }}
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>

      <p style={{ marginTop: '1rem', fontSize: '12px', color: '#666' }}>
        Secure payment powered by Razorpay
      </p>
    </div>
  );
}

// Don't forget to add Razorpay script to your index.html:
// <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
