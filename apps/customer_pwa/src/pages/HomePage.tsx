import React, { useEffect, useState } from 'react';
import { Search, ChevronRight, Sparkles, Flame, Clock, Smartphone, Star, MapPin, ShieldCheck, ExternalLink } from 'lucide-react';
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

  const rawFeatured = collections?.featured || [];
  const rawNewArrivals = collections?.newArrivals || [];
  const rawBestsellers = collections?.bestsellers || [];
  const rawEssentials = collections?.essentials || [];

  const displayedIds = new Set<string>();
  const essentials = rawEssentials.filter((p) => {
    if (displayedIds.has(p.id)) return false;
    displayedIds.add(p.id);
    return true;
  });
  const featured = rawFeatured.filter((p) => {
    if (displayedIds.has(p.id)) return false;
    displayedIds.add(p.id);
    return true;
  });
  const bestsellers = rawBestsellers.filter((p) => {
    if (displayedIds.has(p.id)) return false;
    displayedIds.add(p.id);
    return true;
  });
  const newArrivals = rawNewArrivals.filter((p) => {
    if (displayedIds.has(p.id)) return false;
    displayedIds.add(p.id);
    return true;
  });

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

      {/* Google Play Store Official App Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)',
          borderRadius: 'var(--radius-md)',
          padding: '14px 16px',
          marginBottom: '20px',
          color: '#ffffff',
          boxShadow: '0 4px 12px rgba(20, 83, 45, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '2px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                marginBottom: '6px',
              }}
            >
              Official Android App
            </span>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, lineHeight: 1.25 }}>
              Kanhaiya General Store
            </h2>
            <p style={{ fontSize: '0.75rem', opacity: 0.9, marginTop: '4px', margin: 0 }}>
              Order daily kirana essentials & skip the counter queue with fast pickup!
            </p>
          </div>
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: '8px',
              padding: '6px 8px',
              textAlign: 'center',
              flexShrink: 0,
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
              4.9 <Star size={12} fill="#facc15" color="#facc15" />
            </div>
            <div style={{ fontSize: '0.62rem', opacity: 0.85 }}>Play Store</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
          <a
            href="https://play.google.com/store/apps/details?id=com.kanhaiya.store.customer"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              backgroundColor: '#ffffff',
              color: '#14532d',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            <Smartphone size={16} />
            <span>Install on Google Play</span>
          </a>
          <span style={{ fontSize: '0.7rem', opacity: 0.85 }}>
            • Free Download • Instant Pickup
          </span>
        </div>
      </div>

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

      {/* Local SEO & EEAT Trust Footer Card */}
      <footer
        style={{
          marginTop: '32px',
          padding: '18px 16px',
          backgroundColor: '#ffffff',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldCheck size={20} color="#15803d" />
          <div>
            <strong style={{ color: 'var(--text-main)', fontSize: '0.82rem' }}>
              Kanhaiya General Store (KGS)
            </strong>
            <div style={{ fontSize: '0.7rem', color: '#166534' }}>
              FSSAI Reg. No: 12722046000057 • GSTIN: 09ANBPL4077E1Z1
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <MapPin size={16} color="#475569" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            Ground Floor, Main Road, Fatehpur Roshnai, Sarvankhera, Kanpur Dehat, Uttar Pradesh - 209304
            <br />
            <a
              href="https://maps.app.goo.gl/29REpExE1db9jAbK9"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#15803d', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}
            >
              Locate on Google Maps <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Hours:</strong> 8:00 AM – 9:00 PM IST (Daily) • <strong>Call/WhatsApp:</strong> <a href="https://wa.me/919936269347" target="_blank" rel="noopener noreferrer" style={{ color: '#15803d', fontWeight: 600 }}>+91 9936269347</a>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="/terms" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms</a>
            <span>•</span>
            <a href="/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy</a>
            <span>•</span>
            <a href="/delete-account" style={{ color: 'inherit', textDecoration: 'underline' }}>Account</a>
            <span>•</span>
            <a
              href="https://play.google.com/store/apps/details?id=com.kanhaiya.store.customer"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#15803d', fontWeight: 700, textDecoration: 'none' }}
            >
              Google Play App
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
