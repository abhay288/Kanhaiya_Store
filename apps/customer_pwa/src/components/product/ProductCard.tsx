import React from 'react';
import { Plus, Check } from 'lucide-react';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';

interface ProductCardProps {
  product: Product;
  onSelect?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onSelect }) => {
  const { cart, addToCart } = useCart();
  const cartItem = cart.find((item) => item.product.id === product.id);
  const inCartCount = cartItem ? cartItem.quantity : 0;
  const discountPercent =
    product.mrp > product.sellingPrice
      ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
      : product.discountPercentage || 0;

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.add-btn')) return;
    if (onSelect) onSelect(product);
  };

  return (
    <div className="product-card" onClick={handleCardClick} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
      <div className="product-image-container">
        <img
          src={product.imageUrl || '/icons/icon-512x512.png'}
          alt={product.name}
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';
          }}
        />
        <span className="stock-badge">
          {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
        </span>
        {discountPercent > 0 && (
          <span className="discount-badge">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      <div className="product-info">
        {product.brand && (
          <span
            style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: '#C58B43',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            {product.brand}
          </span>
        )}
        <h3 className="product-name">{product.name}</h3>
        <span className="product-unit">{product.packSize || product.unit}</span>

        <div className="product-price-row">
          <span className="price-selling">₹{product.sellingPrice}</span>
          {product.mrp > product.sellingPrice && (
            <span className="price-mrp">₹{product.mrp}</span>
          )}
        </div>

        <button
          className="add-btn"
          style={
            !product.isAvailable || product.stockQuantity === 0
              ? { backgroundColor: '#94a3b8', cursor: 'not-allowed' }
              : undefined
          }
          disabled={!product.isAvailable || product.stockQuantity === 0}
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product);
          }}
        >
          {!product.isAvailable || product.stockQuantity === 0 ? (
            'Out of Stock'
          ) : inCartCount > 0 ? (
            <>
              <Check size={14} /> Added ({inCartCount})
            </>
          ) : (
            <>
              <Plus size={14} /> Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
};
