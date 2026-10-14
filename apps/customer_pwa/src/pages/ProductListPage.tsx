import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Search, ArrowLeft, SlidersHorizontal, X, Clock } from 'lucide-react';
import { Category, Product, ProductFilterParams } from '../types';
import { repository } from '../api/productRepository';
import { ProductCard } from '../components/product/ProductCard';
import { LoadingState, EmptyState } from '../components/common/FeedbackStates';

interface ProductListPageProps {
  selectedCategory?: Category | null;
  initialSearch?: string;
  onSelectProduct: (product: Product) => void;
  onBack: () => void;
}

const RECENT_SEARCHES_KEY = 'ks_recent_searches_v1';

export const ProductListPage: React.FC<ProductListPageProps> = ({
  selectedCategory,
  initialSearch = '',
  onSelectProduct,
  onBack,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isIncrementalLoading, setIsIncrementalLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [search, setSearch] = useState(initialSearch);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'name_asc'>('newest');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Recent searches state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const activeRequestRef = useRef<number>(0);

  // Save recent search
  const saveRecentSearch = (query: string) => {
    if (!query.trim()) return;
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.toLowerCase() !== query.toLowerCase());
      const updated = [query.trim(), ...filtered].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  };

  // Fetch products with backend pagination and filtering
  const fetchCatalog = useCallback(
    async (currentPage = 1, append = false) => {
      const requestId = ++activeRequestRef.current;
      if (append) {
        setIsIncrementalLoading(true);
      } else {
        setLoading(true);
      }

      try {
        const filter: ProductFilterParams = {
          categoryId: selectedCategory ? selectedCategory.id : undefined,
          search: search.trim() || undefined,
          brand: selectedBrand || undefined,
          inStock: onlyInStock ? true : undefined,
          sort: sortBy,
          page: currentPage,
          limit: 12,
        };

        const result = await repository.getPaginatedProducts(filter);

        // Cancel / ignore if a newer request was dispatched
        if (requestId !== activeRequestRef.current) return;

        if (append) {
          setProducts((prev) => [...prev, ...result.items]);
        } else {
          setProducts(result.items);
        }

        setTotalCount(result.total);
        setPage(result.page);
        setTotalPages(result.totalPages);

        if (search.trim()) {
          saveRecentSearch(search.trim());
        }
      } catch {
        // error fallback
      } finally {
        if (requestId === activeRequestRef.current) {
          setLoading(false);
          setIsIncrementalLoading(false);
        }
      }
    },
    [selectedCategory, search, selectedBrand, onlyInStock, sortBy]
  );

  // Debounce search and filter updates
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCatalog(1, false);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchCatalog]);

  // Real-time catalog updates when admin uploads or edits products
  useEffect(() => {
    const handleCatalogUpdate = () => {
      fetchCatalog(1, false);
    };
    window.addEventListener('kgs_catalog_updated', handleCatalogUpdate);
    return () => {
      window.removeEventListener('kgs_catalog_updated', handleCatalogUpdate);
    };
  }, [fetchCatalog]);

  const handleLoadMore = () => {
    if (page < totalPages && !isIncrementalLoading) {
      fetchCatalog(page + 1, true);
    }
  };

  const resetAllFilters = () => {
    setSearch('');
    setSelectedBrand('');
    setOnlyInStock(false);
    setSortBy('newest');
  };

  const hasActiveFilters = Boolean(search || selectedBrand || onlyInStock || sortBy !== 'newest');

  // Available unique brands from loaded products
  const availableBrands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  return (
    <div style={{ padding: '16px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-main)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>
              {selectedCategory ? selectedCategory.name : 'Store Catalog'}
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Showing {products.length} of {totalCount} products
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowFilterDrawer(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: hasActiveFilters ? 'var(--primary-subtle)' : '#ffffff',
            border: `1px solid ${hasActiveFilters ? 'var(--primary)' : 'var(--border)'}`,
            padding: '6px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: hasActiveFilters ? 'var(--primary)' : 'var(--text-main)',
            cursor: 'pointer',
          }}
        >
          <SlidersHorizontal size={14} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary)',
              }}
            />
          )}
        </button>
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: '#FFFFFF',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
          marginBottom: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <Search size={18} color="var(--text-muted)" />
        <input
          type="text"
          placeholder="Filter products by name or brand..."
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
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
            }}
          >
            <X size={16} color="var(--text-muted)" />
          </button>
        )}
      </div>

      {/* Recent Searches Pills (if search is empty and recent exists) */}
      {!search && recentSearches.length > 0 && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> Recent Searches
            </span>
            <button
              onClick={clearRecentSearches}
              style={{ background: 'none', border: 'none', fontSize: '0.7rem', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {recentSearches.map((term, i) => (
              <span
                key={i}
                onClick={() => setSearch(term)}
                style={{
                  fontSize: '0.72rem',
                  padding: '4px 10px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '16px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                }}
              >
                {term}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filter / Sort Quick Chips */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', marginBottom: '12px' }}>
        <button
          onClick={() => setOnlyInStock(!onlyInStock)}
          style={{
            padding: '5px 12px',
            borderRadius: '16px',
            border: `1px solid ${onlyInStock ? 'var(--primary)' : 'var(--border)'}`,
            backgroundColor: onlyInStock ? 'var(--primary)' : '#ffffff',
            color: onlyInStock ? '#ffffff' : 'var(--text-main)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {onlyInStock ? '✓ In Stock Only' : 'In Stock Only'}
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          style={{
            padding: '5px 10px',
            borderRadius: '16px',
            border: '1px solid var(--border)',
            backgroundColor: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="newest">Sort: Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Name: A to Z</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={resetAllFilters}
            style={{
              padding: '5px 12px',
              borderRadius: '16px',
              border: '1px dashed var(--error)',
              backgroundColor: '#fff',
              color: 'var(--error)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Product List Content */}
      {loading ? (
        <LoadingState message="Updating product catalog..." />
      ) : products.length === 0 ? (
        <EmptyState
          title="No Products Found"
          description="Try clearing your search query or removing active filters."
          actionText="Clear All Filters"
          onAction={resetAllFilters}
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={onSelectProduct}
              />
            ))}
          </div>

          {/* Incremental Load More */}
          {page < totalPages && (
            <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '20px' }}>
              <button
                onClick={handleLoadMore}
                disabled={isIncrementalLoading}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--primary)',
                  cursor: isIncrementalLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isIncrementalLoading ? 'Loading more items...' : `Load More (${totalCount - products.length} left)`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Filter Modal / Drawer */}
      {showFilterDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-end',
          }}
          onClick={() => setShowFilterDrawer(false)}
        >
          <div
            style={{
              width: '100%',
              maxHeight: '80vh',
              backgroundColor: '#ffffff',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px',
              padding: '20px',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Catalog Filters</h3>
              <button
                onClick={() => setShowFilterDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sort Section */}
            <div style={{ marginBottom: '16px' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Sort By</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: 'Newest Arrivals', val: 'newest' },
                  { label: 'Price: Low to High', val: 'price_asc' },
                  { label: 'Price: High to Low', val: 'price_desc' },
                  { label: 'Alphabetical: A to Z', val: 'name_asc' },
                ].map((s) => (
                  <label key={s.val} style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="sortOption"
                      checked={sortBy === s.val}
                      onChange={() => setSortBy(s.val as any)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Brand Section */}
            {availableBrands.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '8px' }}>Brand</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <button
                    onClick={() => setSelectedBrand('')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: `1px solid ${!selectedBrand ? 'var(--primary)' : 'var(--border)'}`,
                      backgroundColor: !selectedBrand ? 'var(--primary-subtle)' : '#fff',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    All Brands
                  </button>
                  {availableBrands.map((b) => (
                    <button
                      key={b}
                      onClick={() => setSelectedBrand(selectedBrand === b ? '' : b!)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '12px',
                        border: `1px solid ${selectedBrand === b ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selectedBrand === b ? 'var(--primary-subtle)' : '#fff',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                />
                Show In-Stock Products Only
              </label>
            </div>

            {/* Apply & Reset Buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={resetAllFilters}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterDrawer(false)}
                style={{
                  flex: 2,
                  padding: '12px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
