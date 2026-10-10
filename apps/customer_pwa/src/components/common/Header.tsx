import React from 'react';
import { Store, Phone } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'Kanhaiya General Store', 
  subtitle = 'Daily Essentials & Groceries • Wholesale Rates' 
}) => {
  return (
    <header className="store-header">
      <div className="header-brand">
        <div className="brand-logo-badge">
          <Store size={20} />
        </div>
        <div className="brand-text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <a
        href="tel:+919876543210"
        aria-label="Call Store"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-subtle)',
          color: 'var(--primary)',
          textDecoration: 'none',
        }}
      >
        <Phone size={18} />
      </a>
    </header>
  );
};
