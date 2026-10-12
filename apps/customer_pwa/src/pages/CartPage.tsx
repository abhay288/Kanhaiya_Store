import React, { useState } from 'react';
import { Trash2, Plus, Minus, ArrowRight, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
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
  const {
    cart,
    updateQuantity,
    clearCart,
    subtotal,
    savings,
    totalToPay,
    adjustmentNotice,
    clearAdjustmentNotice,
    revalidateCart,
    isValidating,
  } = useCart();

  const [showClearConfirm, setShowClearConfirm] = useState(false);

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
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
            Shopping Cart ({cart.length} {cart.length === 1 ? 'item' : 'items'})
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Prices & stock verified with store catalog
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => revalidateCart()}
            disabled={isValidating}
            title="Refresh availability and prices"
            style={{
              background: 'none',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 8px',
              cursor: isValidating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={14} color="var(--text-muted)" className={isValidating ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--error)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '6px 8px',
            }}
          >
            Clear Cart
          </button>
        </div>
      </div>

      {/* Stock Adjustment Alert Banner */}
      {adjustmentNotice && (
        <div
          style={{
            padding: '12px',
            backgroundColor: '#FEF3C7',
            border: '1px solid #F59E0B',
            borderRadius: 'var(--radius-md)',
            color: '#92400E',
            fontSize: '0.78rem',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <AlertTriangle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{adjustmentNotice}</span>
          </div>
          <button
            onClick={clearAdjustmentNotice}
            style={{
              background: 'none',
              border: 'none',
              fontWeight: 800,
              cursor: 'pointer',
              color: '#92400E',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cart Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {cart.map((item) => {
          const maxStock = item.product.stockQuantity;
          const isAtMaxStock = item.quantity >= maxStock;

          return (
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
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'contain', backgroundColor: '#f8fafc' }}
                />
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', maxWidth: '170px' }}>
                    {item.product.name}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {item.product.packSize || item.product.unit} • ₹{item.product.sellingPrice} each
                  </span>
                  <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                    ₹{item.product.sellingPrice * item.quantity}
                  </div>
                </div>
              </div>

              {/* Stepper controls */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    style={{
                      width: '30px',
                      height: '30px',
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

                  <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: '22px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>

                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    disabled={isAtMaxStock}
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '6px',
                      border: '1px solid var(--border)',
                      background: isAtMaxStock ? '#e2e8f0' : '#f8fafc',
                      color: isAtMaxStock ? '#94a3b8' : 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isAtMaxStock ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {isAtMaxStock && (
                  <span style={{ fontSize: '0.65rem', color: '#C58B43', fontWeight: 700 }}>
                    Max stock ({maxStock})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bill Summary */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          marginBottom: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '12px' }}>Bill Details</h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Item Subtotal</span>
          <span style={{ fontWeight: 600 }}>₹{subtotal}</span>
        </div>

        {savings > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
            <span style={{ color: '#16a34a' }}>Your MRP Savings</span>
            <span style={{ color: '#16a34a', fontWeight: 700 }}>-₹{savings}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)' }}>Order Fulfillment</span>
          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>In-Store Pickup Only</span>
        </div>

        <div
          style={{
            padding: '8px 10px',
            backgroundColor: 'var(--primary-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.72rem',
            color: 'var(--primary-dark)',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          📍 In-Store Pickup Only: We do not deliver products anywhere. Collect your items directly at the store counter.
        </div>

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
          <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}>₹{totalToPay}</span>
        </div>
      </div>

      {/* Safe checkout notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px',
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          marginBottom: '20px',
        }}
      >
        <ShieldCheck size={16} color="var(--primary)" />
        <span>Inventory reserved only during order confirmation. No prepayment required.</span>
      </div>

      {/* Floating Checkout Button */}
      <div
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          maxWidth: '480px',
          margin: '0 auto',
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          borderTop: '1px solid var(--border)',
          zIndex: 40,
          boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
        }}
      >
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

      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '320px',
              width: '100%',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '8px' }}>Clear Your Cart?</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Are you sure you want to remove all {cart.length} items from your shopping basket?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowClearConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearCart();
                  setShowClearConfirm(false);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  backgroundColor: 'var(--error)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Yes, Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
