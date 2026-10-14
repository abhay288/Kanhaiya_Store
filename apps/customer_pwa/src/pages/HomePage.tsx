import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, Sparkles, Flame, Clock } from 'lucide-react';
import { Category, Product, CollectionsData } from '../types';
import { repository } from '../api/productRepository';
import { ProductCard } from '../components/product/ProductCard';
import { CategoryIcon } from '../components/common/CategoryIcon';
import { LoadingState, ErrorState } from '../components/common/FeedbackStates';
import { useCart } from '../context/CartContext';

interface HomePageProps {
  onSelectCategory: (category: Category) => void;
  onSelectProduct: (product: Product) => void;
  onViewAllProducts: (searchQuery?: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onSelectCategory,
  onSelectProduct,
  onViewAllProducts,
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [collections, setCollections] = useState<CollectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');

  const { recentlyViewed } = useCart();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [cats, cols] = await Promise.all([
        repository.getCategories(),
        repository.getCollections(),
      ]);
      setCategories(cats.filter((c) => c.isActive !== false));
      setCollections(cols);
    } catch {
      setError('Could not load storefront catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Instant update whenever admin uploads or updates products
    const handleCatalogUpdate = () => {
      loadData();
    };
    window.addEventListener('kgs_catalog_updated', handleCatalogUpdate);

    return () => {
      window.removeEventListener('kgs_catalog_updated', handleCatalogUpdate);
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onViewAllProducts(searchInput.trim());
    } else {
      onViewAllProducts();
    }
  };

  if (loading) return <LoadingState message="Fetching fresh store catalog..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const featured = collections?.featured || [];
  const newArrivals = collections?.newArrivals || [];
  const bestsellers = collections?.bestsellers || [];
  const essentials = collections?.essentials || [];

  return (
    <div style={{ padding: '16px' }}>
      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} style={{ marginBottom: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Search size={18} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search chakki atta, pulses, pure ghee, milk products & breads..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              fontFamily: 'inherit',
              background: 'transparent',
            }}
          />
          {searchInput && (
            <button
              type="submit"
              style={{
                border: 'none',
                background: 'var(--primary)',
                color: '#fff',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          )}
        </div>
      </form>

      {/* Categories Horizontal Carousel */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Shop By Category</h3>
          <span
            onClick={() => onViewAllProducts()}
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
              style={{ cursor: 'pointer' }}
            >
              <div className="category-icon-wrapper">
                {cat.imageUrl ? (
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                  />
                ) : (
                  <CategoryIcon slug={cat.slug} size={18} />
                )}
              </div>
              <div className="category-title" style={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                {cat.name.split(',')[0]}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Popular Everyday Essentials */}
      {essentials.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Popular Everyday Essentials</h3>
            <span
              onClick={() => onViewAllProducts()}
              style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer' }}
            >
              See all
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {essentials.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Featured Products */}
      {featured.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Sparkles size={16} color="#C58B43" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Featured Products</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {featured.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bestsellers */}
      {bestsellers.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Flame size={16} color="#dc2626" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>Bestsellers</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {bestsellers.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <Clock size={16} color="var(--primary)" />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>New Arrivals</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {newArrivals.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recently Viewed Products */}
      {recentlyViewed.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '12px' }}>
            Recently Viewed
          </h3>

          <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
            {recentlyViewed.slice(0, 6).map((product) => (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                style={{
                  minWidth: '130px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  style={{ width: '100%', height: '80px', objectFit: 'contain', marginBottom: '6px' }}
                />
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {product.name}
                </div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                  ₹{product.sellingPrice}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
