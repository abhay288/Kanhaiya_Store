import React, { useEffect, useState } from 'react';
import { Search, ArrowLeft } from 'lucide-react';
import { Category, Product } from '../types';
import { repository } from '../api/productRepository';
import { ProductCard } from '../components/product/ProductCard';
import { LoadingState, EmptyState } from '../components/common/FeedbackStates';

interface ProductListPageProps {
  selectedCategory?: Category | null;
  onSelectProduct: (product: Product) => void;
  onBack: () => void;
}

export const ProductListPage: React.FC<ProductListPageProps> = ({
  selectedCategory,
  onSelectProduct,
  onBack,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    repository
      .getProducts(selectedCategory ? selectedCategory.id : undefined, search)
      .then((data) => {
        setProducts(data);
        setLoading(false);
      });
  }, [selectedCategory, search]);

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
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
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>
            {selectedCategory ? selectedCategory.name : 'All Store Products'}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Showing {products.length} products
          </span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#f1f5f9',
          borderRadius: 'var(--radius-md)',
          marginBottom: '16px',
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Filter by product name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            border: 'none',
            background: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
          }}
        />
      </div>

      {loading ? (
        <LoadingState message="Updating product catalog..." />
      ) : products.length === 0 ? (
        <EmptyState
          title="No Products Found"
          description="Try clearing your search query or selecting a different category."
          actionText="Clear Filter"
          onAction={() => setSearch('')}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      )}
    </div>
  );
};
