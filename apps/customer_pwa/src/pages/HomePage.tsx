import React, { useEffect, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { Category, Product } from '../types';
import { repository } from '../api/productRepository';
import { ProductCard } from '../components/product/ProductCard';
import { LoadingState, ErrorState } from '../components/common/FeedbackStates';

interface HomePageProps {
  onSelectCategory: (category: Category) => void;
  onSelectProduct: (product: Product) => void;
  onViewAllProducts: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectCategory,
  onSelectProduct,
  onViewAllProducts,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cats, prods] = await Promise.all([
        repository.getCategories(),
        repository.getProducts(),
      ]);
      setCategories(cats);
      setFeaturedProducts(prods);
    } catch {
      setError('Could not load storefront catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingState message="Fetching fresh groceries..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div style={{ padding: '16px' }}>
      {/* Search Header Bar */}
      <div
        onClick={onViewAllProducts}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 14px',
          backgroundColor: '#f1f5f9',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          marginBottom: '20px',
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Search atta, dal, oil, spices...
        </span>
      </div>

      {/* Hero Welcome Announcement */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#166534',
          borderRadius: 'var(--radius-lg)',
          color: '#ffffff',
          marginBottom: '24px',
          backgroundImage: 'linear-gradient(135deg, #166534 0%, #15803d 100%)',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            backgroundColor: 'rgba(255,255,255,0.2)',
            padding: '3px 8px',
            borderRadius: '4px',
            display: 'inline-block',
            marginBottom: '8px',
          }}
        >
          Daily Neighborhood Specials
        </span>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.3 }}>
          Free Home Delivery on Orders Above ₹500
        </h2>
        <p style={{ fontSize: '0.8rem', opacity: 0.9, marginTop: '4px' }}>
          Genuine brands, untouched pulses, chakki atta & pantry essentials.
        </p>
      </div>

      {/* Quick Category Grid */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Shop By Category</h3>
          <span
            onClick={onViewAllProducts}
            style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            All Categories <ChevronRight size={14} />
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {categories.slice(0, 8).map((cat) => (
            <div
              key={cat.id}
              className="category-pill"
              onClick={() => onSelectCategory(cat)}
            >
              <div className="category-icon">{cat.icon}</div>
              <div className="category-title" style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                {cat.name.split(',')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Featured Products */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Popular Daily Essentials</h3>
          <span
            onClick={onViewAllProducts}
            style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
          >
            See all
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={onSelectProduct}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
