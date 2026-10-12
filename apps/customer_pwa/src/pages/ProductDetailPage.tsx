import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Check, ShieldCheck, Store, AlertCircle } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { repository } from '../api/productRepository';
import { ProductCard } from '../components/product/ProductCard';

interface ProductDetailPageProps {
  product: Product;
  onBack: () => void;
  onSelectProduct?: (product: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  product,
  onBack,
  onSelectProduct,
}) => {
  const { cart, addToCart, addRecentlyViewed } = useCart();
  const cartItem = cart.find((item) => item.product.id === product.id);
  const inCartCount = cartItem ? cartItem.quantity : 0;

  const [activeImage, setActiveImage] = useState<string>(product.imageUrl);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Track recently viewed and fetch related items
  useEffect(() => {
    addRecentlyViewed(product);
    setActiveImage(product.imageUrl);

    repository
      .getRelatedProducts(product.id)
      .then((items) => {
        setRelatedProducts(items);
      })
      .catch(() => {});
  }, [product.id, addRecentlyViewed]);

  const imagesList =
    product.images && product.images.length > 0
      ? product.images.map((img) => img.url)
      : [product.imageUrl];

  const inStock = Boolean(product.isAvailable && product.stockQuantity > 0);
  const isMaxStockReached = inCartCount >= product.stockQuantity;

  return (
    <div style={{ padding: '16px', paddingBottom: '90px' }}>
      {/* Top Back Navigation Bar */}
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

      {/* Hero Image Showcase */}
      <div
        style={{
          width: '100%',
          height: '240px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          marginBottom: '12px',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={activeImage || product.imageUrl}
          alt={product.name}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=600';
          }}
        />
      </div>

      {/* Gallery Thumbnails */}
      {imagesList.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
          {imagesList.map((url, idx) => (
            <button
              key={idx}
              onClick={() => setActiveImage(url)}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden',
                border: activeImage === url ? '2px solid var(--primary)' : '1px solid var(--border)',
                padding: '4px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <img src={url} alt={`${product.name} ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </button>
          ))}
        </div>
      )}

      {/* Header Info */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          {product.brand && (
            <span
              style={{
                fontSize: '0.75rem',
                color: '#C58B43',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {product.brand}
            </span>
          )}
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
        </div>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-main)' }}>
          {product.name}
        </h1>

        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Pack Size: <strong>{product.packSize || product.unit}</strong>
          {product.sku && <span> • SKU: <code>{product.sku}</code></span>}
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
            <>
              <span style={{ fontSize: '0.9rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                ₹{product.mrp}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#C58B43',
                  backgroundColor: '#FBF4EA',
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)}% OFF
              </span>
            </>
          )}
        </div>
        <div
          style={{
            padding: '4px 10px',
            backgroundColor: '#ffffff',
            borderRadius: '999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: inStock ? 'var(--primary)' : '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {inStock ? `${product.stockQuantity} in stock` : 'Out of stock'}
        </div>
      </div>

      {/* Description */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '6px' }}>
          Product Details
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {product.description || 'Authentic daily kirana essentials curated for freshness and pure quality.'}
        </p>

        {product.tags && product.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
            {product.tags.map((tag, i) => (
              <span
                key={i}
                style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
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
          <Store size={18} color="var(--primary)" />
          <span>In-Store Pickup Only</span>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <div style={{ marginTop: '28px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
            Similar Items in {product.categoryName}
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                onSelect={(p) => onSelectProduct ? onSelectProduct(p) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fixed Bottom Action Bar */}
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
          className="add-btn"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '0.95rem',
            backgroundColor: !inStock ? '#94a3b8' : isMaxStockReached ? '#475569' : 'var(--primary)',
            color: '#ffffff',
            borderRadius: 'var(--radius-md)',
            cursor: !inStock || isMaxStockReached ? 'not-allowed' : 'pointer',
            border: 'none',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          disabled={!inStock || isMaxStockReached}
          onClick={() => addToCart(product, 1)}
        >
          {!inStock ? (
            <>
              <AlertCircle size={18} /> Out of Stock
            </>
          ) : isMaxStockReached ? (
            <>
              <Check size={18} /> Max Stock Reached ({inCartCount})
            </>
          ) : inCartCount > 0 ? (
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
    </div>
  );
};
