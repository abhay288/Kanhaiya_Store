import React, { useEffect, useState } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { Category, Product } from '../types';
import { repository } from '../api/productRepository';
import { ProductCard } from '../components/product/ProductCard';
import { CategoryIcon } from '../components/common/CategoryIcon';
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
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Search chakki atta, pulses, pure ghee, spices...
        </span>
      </div>

      {/* Hero Welcome Announcement */}
      <div
        style={{
          padding: '18px',
          backgroundColor: 'var(--primary)',
          borderRadius: 'var(--radius-md)',
          color: '#ffffff',
          marginBottom: '24px',
          border: '1px solid var(--primary-dark)',
        }}
      >
        <span
          style={{
            fontSize: '0.68rem',
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: '3px 8px',
            borderRadius: '4px',
            display: 'inline-block',
            marginBottom: '8px',
          }}
        >
          Neighborhood Daily Store
        </span>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, lineHeight: 1.3 }}>
          Free Doorstep Delivery on Orders Above ₹500
        </h2>
        <p style={{ fontSize: '0.78rem', opacity: 0.88, marginTop: '4px' }}>
          Hand-picked quality, farm-sourced lentils, authentic brands & daily essentials.
        </p>
      </div>

      {/* Quick Category Grid */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Shop By Category</h3>
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
              <div className="category-icon-wrapper">
                <CategoryIcon slug={cat.slug} size={18} />
              </div>
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
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Popular Daily Essentials</h3>
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
