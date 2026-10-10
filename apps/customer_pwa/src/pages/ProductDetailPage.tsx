import React from 'react';
import { ArrowLeft, Plus, Check, ShieldCheck, Truck } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ product, onBack }) => {
  const { cart, addToCart } = useCart();
  const cartItem = cart.find((item) => item.product.id === product.id);
  const inCartCount = cartItem ? cartItem.quantity : 0;

  return (
    <div style={{ padding: '16px' }}>
      {/* Top Bar */}
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
          marginBottom: '12px',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        <ArrowLeft size={18} /> Back to Catalog
      </button>

      {/* Hero Image */}
      <div
        style={{
          width: '100%',
          height: '240px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
          marginBottom: '16px',
          border: '1px solid var(--border)',
        }}
      >
        <img
          src={product.imageUrl}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Header Info */}
      <div style={{ marginBottom: '16px' }}>
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--primary)',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          {product.categoryName}
        </span>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '4px' }}>
          {product.name}
        </h1>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          Pack Size: <strong>{product.unit}</strong>
        </div>
      </div>

      {/* Price & Stock Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'var(--primary-subtle)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
            ₹{product.sellingPrice}
          </span>
          {product.mrp > product.sellingPrice && (
            <span style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'line-through' }}>
              ₹{product.mrp}
            </span>
          )}
        </div>
        <div
          style={{
            padding: '4px 10px',
            backgroundColor: '#ffffff',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: product.stockQuantity > 0 ? 'var(--primary)' : '#dc2626',
          }}
        >
          {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
          Product Details
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {product.description}
        </p>
      </div>

      {/* Trust Badges */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          <ShieldCheck size={18} color="var(--primary)" />
          <span>100% Genuine Quality</span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px',
            backgroundColor: '#f8fafc',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}
        >
          <Truck size={18} color="var(--primary)" />
          <span>Fast Doorstep Delivery</span>
        </div>
      </div>

      {/* Add To Cart Floating Button */}
      <button
        className="add-btn"
        style={{
          padding: '12px',
          fontSize: '0.95rem',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          borderRadius: 'var(--radius-md)',
        }}
        disabled={!product.isAvailable || product.stockQuantity === 0}
        onClick={() => addToCart(product)}
      >
        {inCartCount > 0 ? (
          <>
            <Check size={18} /> In Your Cart ({inCartCount}) — Add More
          </>
        ) : (
          <>
            <Plus size={18} /> Add to Cart — ₹{product.sellingPrice}
          </>
        )}
      </button>
    </div>
  );
};
