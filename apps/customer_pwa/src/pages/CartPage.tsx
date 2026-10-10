import React from 'react';
import { Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { EmptyState } from '../components/common/FeedbackStates';

interface CartPageProps {
  onStartShopping: () => void;
  onProceedToCheckout: () => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  onStartShopping,
  onProceedToCheckout,
}) => {
  const { cart, updateQuantity, subtotal } = useCart();
  const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 30;
  const totalAmount = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <EmptyState
        title="Your Cart is Empty"
        description="Add grains, oils, dals, or household essentials from our grocery catalog."
        actionText="Start Shopping"
        onAction={onStartShopping}
      />
    );
  }

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>
        Shopping Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
      </h2>

      {/* Cart Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {cart.map((item) => (
          <div
            key={item.product.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={item.product.imageUrl}
                alt={item.product.name}
                style={{ width: '54px', height: '54px', borderRadius: '8px', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: '170px' }}>
                  {item.product.name}
                </h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {item.product.unit} • ₹{item.product.sellingPrice} each
                </span>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                  ₹{item.product.sellingPrice * item.quantity}
                </div>
              </div>
            </div>

            {/* Stepper controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                {item.quantity === 1 ? <Trash2 size={14} color="#dc2626" /> : <Minus size={14} />}
              </button>

              <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                {item.quantity}
              </span>

              <button
                onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bill Summary */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          marginBottom: '20px',
        }}
      >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '12px' }}>Bill Details</h3>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Item Subtotal</span>
          <span>₹{subtotal}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Delivery Partner Fee</span>
          <span style={{ color: deliveryFee === 0 ? 'var(--primary)' : 'inherit', fontWeight: deliveryFee === 0 ? 700 : 400 }}>
            {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
          </span>
        </div>

        {subtotal < 500 && (
          <p style={{ fontSize: '0.72rem', color: 'var(--accent)', marginBottom: '8px' }}>
            💡 Add ₹{500 - subtotal} more to qualify for FREE Delivery!
          </p>
        )}

        <div
          style={{
            borderTop: '1px dashed var(--border)',
            paddingTop: '10px',
            marginTop: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>To Pay</span>
          <span style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--primary)' }}>₹{totalAmount}</span>
        </div>
      </div>

      {/* Checkout Button */}
      <button
        onClick={onProceedToCheckout}
        style={{
          width: '100%',
          padding: '14px',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          fontWeight: 700,
          fontSize: '0.95rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span>Proceed to Checkout</span>
        <ArrowRight size={18} />
      </button>
    </div>
  );
};
