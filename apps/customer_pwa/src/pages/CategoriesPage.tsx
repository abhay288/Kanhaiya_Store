import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Category } from '../types';
import { repository } from '../api/productRepository';
import { LoadingState } from '../components/common/FeedbackStates';

interface CategoriesPageProps {
  onSelectCategory: (category: Category) => void;
}

export const CategoriesPage: React.FC<CategoriesPageProps> = ({ onSelectCategory }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repository.getCategories().then((data) => {
      setCategories(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Loading store aisles..." />;

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>
        Store Categories
      </h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Browse through our full inventory of fresh foods & essentials
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            onClick={() => onSelectCategory(cat)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--primary-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                }}
              >
                {cat.icon}
              </div>
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {cat.name}
                </h4>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {cat.itemCount} Items available
                </span>
              </div>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>
        ))}
      </div>
    </div>
  );
};
