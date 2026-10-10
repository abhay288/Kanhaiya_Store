import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, QrCode, Banknote } from 'lucide-react';
import { useCart } from '../context/CartContext';

interface CheckoutPageProps {
  onBack: () => void;
  onOrderCompleted: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({ onBack, onOrderCompleted }) => {
  const { cart, subtotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'whatsapp_qr'>('cod');
  const [address] = useState({
    name: 'Abhay Kushwaha',
    phone: '+91 98765 43210',
    street: 'House 42, Main Bazar, Near City Post Office',
    city: 'New Delhi',
    pincode: '110001',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrderNumber, setSubmittedOrderNumber] = useState<string | null>(null);

  const deliveryFee = subtotal >= 500 ? 0 : 30;
  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulating order dispatch entry point (Phase 1 client simulation)
    setTimeout(() => {
      const mockOrderNo = `KS-202610-${Math.floor(1000 + Math.random() * 9000)}`;
      setSubmittedOrderNumber(mockOrderNo);
      setIsSubmitting(false);
      clearCart();
    }, 800);
  };

  if (submittedOrderNumber) {
    return (
      <div style={{ padding: '32px 20px', textAlign: 'center' }}>
        <div style={{ color: 'var(--primary)', marginBottom: '16px' }}>
          <CheckCircle2 size={54} />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>
          Order Placed Successfully!
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Order reference: <strong>{submittedOrderNumber}</strong>
        </p>

        {paymentMethod === 'whatsapp_qr' && (
          <div
            style={{
              padding: '14px',
              backgroundColor: '#fef3c7',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fde68a',
              marginBottom: '20px',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: '4px' }}>
              WhatsApp UPI Payment Notice
            </div>
            <p style={{ fontSize: '0.78rem', color: '#78350f' }}>
              Please send your UPI payment screenshot to <strong>+91 9876543210</strong> quoting order <strong>{submittedOrderNumber}</strong>. Store admin will verify and dispatch.
            </p>
          </div>
        )}

        <button
          onClick={onOrderCompleted}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          View My Orders
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <button
        onClick={onBack}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-main)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '16px',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={18} /> Back to Cart
      </button>

      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '16px' }}>
        Checkout & Delivery
      </h2>

      <form onSubmit={handlePlaceOrder}>
        {/* Address Card */}
        <div
          style={{
            padding: '14px',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
          }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>
            Delivery Address
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
            <strong>{address.name}</strong> • {address.phone}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {address.street}, {address.city} - {address.pincode}
          </div>
        </div>

        {/* Payment Method Selector */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '10px' }}>
            Payment Method
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: paymentMethod === 'cod' ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: paymentMethod === 'cod' ? 'var(--primary-subtle)' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'cod'}
                onChange={() => setPaymentMethod('cod')}
              />
              <Banknote size={20} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Cash on Delivery (COD)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Pay cash or scanner to the delivery agent upon receipt
                </div>
              </div>
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                border: paymentMethod === 'whatsapp_qr' ? '2px solid var(--primary)' : '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: paymentMethod === 'whatsapp_qr' ? 'var(--primary-subtle)' : '#ffffff',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'whatsapp_qr'}
                onChange={() => setPaymentMethod('whatsapp_qr')}
              />
              <QrCode size={20} color="var(--primary)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Store WhatsApp QR / UPI</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Pay via any UPI App and share receipt on store WhatsApp
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Amount to pay */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Payable ({cart.length} items)</div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)' }}>₹{totalAmount}</div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || cart.length === 0}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            {isSubmitting ? 'Confirming...' : 'Place Order'}
          </button>
        </div>
      </form>
    </div>
  );
};
