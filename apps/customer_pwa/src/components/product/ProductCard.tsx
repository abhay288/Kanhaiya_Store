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
  const discountPercent = product.mrp > product.sellingPrice
    ? Math.round(((product.mrp - product.sellingPrice) / product.mrp) * 100)
    : 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // If not clicking the button, navigate to details
    if ((e.target as HTMLElement).closest('.add-btn')) return;
    if (onSelect) onSelect(product);
  };

  return (
    <div className="product-card" onClick={handleCardClick} style={{ cursor: onSelect ? 'pointer' : 'default' }}>
      <div className="product-image-container">
        <img src={product.imageUrl} alt={product.name} loading="lazy" />
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
        <h3 className="product-name">{product.name}</h3>
        <span className="product-unit">{product.unit}</span>

        <div className="product-price-row">
          <span className="price-selling">₹{product.sellingPrice}</span>
          {product.mrp > product.sellingPrice && (
            <span className="price-mrp">₹{product.mrp}</span>
          )}
        </div>

        <button
          className="add-btn"
          disabled={!product.isAvailable || product.stockQuantity === 0}
          onClick={(e) => {
            e.stopPropagation();
            addToCart(product);
          }}
        >
          {inCartCount > 0 ? (
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
