import React from 'react';
import { Phone } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'Kanhaiya General Store', 
  subtitle = 'Fresh Essentials & Daily Groceries • Fatehpur Roshnai, Kanpur D. UP' 
}) => {
  return (
    <header className="store-header">
      <div className="header-brand">
        <img
          src="/logo.png"
          alt="Kanhaiya General Store Logo"
          style={{
            width: '38px',
            height: '38px',
            objectFit: 'contain',
            borderRadius: 'var(--radius-sm)',
          }}
        />
        <div className="brand-text">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <a
        href="tel:+919936269347"
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
