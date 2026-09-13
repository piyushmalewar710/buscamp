import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '../lib/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBanner from '../components/ErrorBanner';

export default function BookingFlow({ trip, onClose }) {
  const [step, setStep] = useState('confirm'); // confirm -> processing -> success/error
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setStep('processing');
    setError(null);

    try {
      const res = await loadRazorpay();
      if (!res) throw new Error('Razorpay SDK failed to load. Are you online?');

      // 1. Create order on backend
      const orderData = await apiPost('/api/bookings', { trip_id: trip.id });
      
      // 2. Open Razorpay
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: 'INR',
        name: 'BUSCAMP',
        description: `Bus Ticket - ${trip.direction === 'college_to_city' ? 'College to City' : 'City to College'}`,
        order_id: orderData.order_id,
        handler: async function (response) {
          try {
            setStep('processing');
            // 3. Verify payment on backend
            await apiPost('/api/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              payment_id: orderData.payment_id
            });
            
            navigate('/tickets', { state: { success: true } });
          } catch (err) {
            setError('Payment verification failed: ' + err.message);
            setStep('confirm');
          }
        },
        modal: {
          ondismiss: function() {
            setStep('confirm');
            setError('Payment was cancelled');
          }
        },
        theme: {
          color: '#2563EB' // blue-600
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response){
        setError(`Payment Failed: ${response.error.description}`);
        setStep('confirm');
      });
      rzp.open();

    } catch (err) {
      setError(err.message || 'Failed to initiate booking');
      setStep('confirm');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Confirm Booking</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" disabled={step === 'processing'}>✕</button>
          </div>

          {error && <ErrorBanner message={error} />}

          {step === 'confirm' && (
            <>
              <div className="bg-blue-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Route</span>
                  <span className="font-medium text-gray-900">{trip.direction === 'college_to_city' ? 'College → City' : 'City → College'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium text-gray-900">{trip.departure_time.substring(0, 5)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Bus</span>
                  <span className="font-medium text-gray-900">{trip.buses?.bus_number || 'TBD'}</span>
                </div>
                <div className="border-t border-blue-100 pt-2 mt-2 flex justify-between font-bold">
                  <span>Total Amount</span>
                  <span>₹{trip.price}</span>
                </div>
              </div>

              <button
                onClick={handlePayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-colors"
              >
                Confirm & Pay ₹{trip.price}
              </button>
            </>
          )}

          {step === 'processing' && (
            <div className="py-8">
              <LoadingSpinner text="Processing payment..." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
