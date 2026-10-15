import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Package, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../../api/client';

interface AdminProductsManagementProps {
  onToast: (type: 'success' | 'error', message: string) => void;
  onNavigateAddProduct?: () => void;
}

export const AdminProductsManagement: React.FC<AdminProductsManagementProps> = ({ onToast, onNavigateAddProduct }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [liveFilter, setLiveFilter] = useState<'ALL' | 'LIVE' | 'UNLIVE'>('ALL');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts(false);

    // Real-time synchronization: poll products inventory every 10 seconds
    const interval = setInterval(() => {
      fetchProducts(true);
    }, 10000);

    const handleCatalogUpdated = () => {
      fetchProducts(true);
    };
    window.addEventListener('kgs_catalog_updated', handleCatalogUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener('kgs_catalog_updated', handleCatalogUpdated);
    };
  }, []);

  const fetchProducts = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiClient.getProducts({ limit: 100 });
      if (res.data?.items) {
        setProducts(res.data.items);
      } else if (Array.isArray(res.data)) {
        setProducts(res.data);
      } else {
        setProducts([]);
      }
    } catch (err: unknown) {
      if (!silent) {
        const e = err as { message?: string };
        onToast('error', `Failed to load products: ${e?.message || 'Server error'}`);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleToggleLive = async (product: any) => {
    const newStatus = !product.isPublished;
    setTogglingId(product._id);
    try {
      await apiClient.toggleProductLive(product._id, newStatus);
      setProducts((prev) =>
        prev.map((p) => (p._id === product._id ? { ...p, isPublished: newStatus } : p))
      );
      
      // Notify all store views of the live status change
      window.dispatchEvent(
        new CustomEvent('kgs_catalog_updated', { detail: { productId: product._id, isPublished: newStatus } })
      );

      if (newStatus) {
        onToast('success', `🟢 "${product.name}" is now LIVE on store catalog!`);
      } else {
        onToast('success', `⚪ "${product.name}" is now UNLIVE (hidden from customer store)`);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      onToast('error', `Failed to update status: ${e?.message || 'Error'}`);
    } finally {
      setTogglingId(null);
    }
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase());
    const matchesLive =
      liveFilter === 'ALL' ||
      (liveFilter === 'LIVE' && p.isPublished === true) ||
      (liveFilter === 'UNLIVE' && !p.isPublished);
    return matchesSearch && matchesLive;
  });

  const liveCount = products.filter((p) => p.isPublished).length;
  const unliveCount = products.filter((p) => !p.isPublished).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header & Stats Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '14px 16px',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)',
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>
            📦 Store Catalog & LIVE Status
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '3px 0 0' }}>
            Instantly turn products LIVE or UNLIVE to control customer store visibility.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              fontSize: '0.78rem',
              fontWeight: 800,
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#16a34a' }} />
            {liveCount} LIVE
          </span>

          <span
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '0.78rem',
              fontWeight: 800,
              border: '1px solid #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#94a3b8' }} />
            {unliveCount} UNLIVE
          </span>

          {onNavigateAddProduct && (
            <button
              onClick={onNavigateAddProduct}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search products by name, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px 8px 34px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              fontSize: '0.82rem',
              backgroundColor: 'var(--surface)',
              color: 'var(--text-main)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          {(['ALL', 'LIVE', 'UNLIVE'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setLiveFilter(filter)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: liveFilter === filter ? '2px solid var(--primary)' : '1px solid var(--border)',
                backgroundColor: liveFilter === filter ? 'var(--primary-subtle)' : 'var(--surface)',
                color: liveFilter === filter ? 'var(--primary)' : 'var(--text-muted)',
              }}
            >
              {filter === 'ALL' ? `All (${products.length})` : filter === 'LIVE' ? `🟢 LIVE (${liveCount})` : `⚪ UNLIVE (${unliveCount})`}
            </button>
          ))}

          <button
            onClick={() => fetchProducts(false)}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--surface)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.78rem',
              color: 'var(--text-main)',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* Products List */}
      {loading && products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border)',
            color: 'var(--text-muted)',
          }}
        >
          <Package size={36} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>No products found</div>
          <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            {search ? 'Try different search keywords.' : 'No products match the selected LIVE filter.'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredProducts.map((p) => {
            const isLive = p.isPublished;
            const isUpdating = togglingId === p._id;
            const img = p.images?.[0] || p.imageUrl || '';

            return (
              <div
                key={p._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  backgroundColor: 'var(--surface)',
                  borderRadius: 'var(--radius-md)',
                  border: isLive ? '1px solid var(--border)' : '1px dashed #cbd5e1',
                  opacity: isLive ? 1 : 0.85,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0,
                  }}
                >
                  {img ? (
                    <img src={img} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Package size={22} color="#94a3b8" />
                  )}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.name}
                    </span>

                    {/* LIVE / UNLIVE BADGE */}
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        backgroundColor: isLive ? '#dcfce7' : '#f1f5f9',
                        color: isLive ? '#166534' : '#64748b',
                        border: isLive ? '1px solid #bbf7d0' : '1px solid #cbd5e1',
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: isLive ? '#16a34a' : '#94a3b8',
                          boxShadow: isLive ? '0 0 6px #16a34a' : 'none',
                        }}
                      />
                      {isLive ? '🟢 LIVE' : '⚪ UNLIVE'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {p.brand && <span>Brand: {p.brand}</span>}
                    {p.packSize && <span>Pack: {p.packSize}</span>}
                    <span>Stock: <strong style={{ color: p.stockQuantity > 0 ? '#16a34a' : '#dc2626' }}>{p.stockQuantity ?? 0}</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '3px' }}>
                    <span style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--primary)' }}>
                      ₹{p.sellingPrice}
                    </span>
                    {p.mrp > p.sellingPrice && (
                      <span style={{ fontSize: '0.74rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                        ₹{p.mrp}
                      </span>
                    )}
                  </div>
                </div>

                {/* Instant Toggle Live Button */}
                <div style={{ flexShrink: 0, textAlign: 'right' }}>
                  <button
                    onClick={() => handleToggleLive(p)}
                    disabled={isUpdating}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: isUpdating ? 'wait' : 'pointer',
                      border: isLive ? '1px solid #fecaca' : '1px solid #bbf7d0',
                      backgroundColor: isLive ? '#fef2f2' : '#f0fdf4',
                      color: isLive ? '#991b1b' : '#166534',
                      transition: 'all 0.2s ease',
                    }}
                    title={isLive ? 'Click to hide from store (make UNLIVE)' : 'Click to make LIVE on store'}
                  >
                    {isUpdating ? (
                      <RefreshCw size={14} className="spin" />
                    ) : isLive ? (
                      <>
                        <EyeOff size={14} />
                        <span>Make UNLIVE</span>
                      </>
                    ) : (
                      <>
                        <Eye size={14} />
                        <span>Make LIVE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
