import React from 'react';
import { Home, Grid, ShoppingBag, Clock, User } from 'lucide-react';
import { useCart } from '../../context/CartContext';

export type NavTab = 'home' | 'categories' | 'cart' | 'orders' | 'profile';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const { totalItems } = useCart();

  return (
    <nav className="bottom-nav">
      <button
        className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => onTabChange('home')}
      >
        <Home size={22} />
        <span>Home</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
        onClick={() => onTabChange('categories')}
      >
        <Grid size={22} />
        <span>Categories</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'cart' ? 'active' : ''}`}
        onClick={() => onTabChange('cart')}
      >
        <ShoppingBag size={22} />
        <span>Cart</span>
        {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
      </button>

      <button
        className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
        onClick={() => onTabChange('orders')}
      >
        <Clock size={22} />
        <span>Orders</span>
      </button>

      <button
        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTabChange('profile')}
      >
        <User size={22} />
        <span>Profile</span>
      </button>
    </nav>
  );
};
