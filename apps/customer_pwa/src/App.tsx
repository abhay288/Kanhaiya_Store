import React, { useState, useEffect } from 'react';
import { CartProvider } from './context/CartContext';
import { Header } from './components/common/Header';
import { BottomNav, NavTab } from './components/common/BottomNav';
import { InstallBanner } from './components/common/InstallBanner';
import { HomePage } from './pages/HomePage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductListPage } from './pages/ProductListPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrdersPage } from './pages/OrdersPage';
import { ProfilePage } from './pages/ProfilePage';
import { Category, Product } from './types';
import { WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setSearchQuery('');
    setActiveTab('categories');
    setSelectedProduct(null);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
  };

  const handleBackFromDetail = () => {
    setSelectedProduct(null);
  };

  const handleViewAllProducts = (query?: string) => {
    setSelectedCategory(null);
    setSearchQuery(query || '');
    setActiveTab('categories');
    setSelectedProduct(null);
  };

  const renderMainContent = () => {
    // If a product detail is open
    if (selectedProduct) {
      return (
        <ProductDetailPage
          product={selectedProduct}
          onBack={handleBackFromDetail}
          onSelectProduct={handleSelectProduct}
        />
      );
    }

    // If checkout is open
    if (isCheckoutOpen) {
      return (
        <CheckoutPage
          onBack={() => setIsCheckoutOpen(false)}
          onOrderCompleted={() => {
            setIsCheckoutOpen(false);
            setActiveTab('orders');
          }}
        />
      );
    }

    // Tab routing
    switch (activeTab) {
      case 'home':
        return (
          <HomePage
            onSelectCategory={handleSelectCategory}
            onSelectProduct={handleSelectProduct}
            onViewAllProducts={handleViewAllProducts}
          />
        );
      case 'categories':
        if (selectedCategory || searchQuery) {
          return (
            <ProductListPage
              selectedCategory={selectedCategory}
              initialSearch={searchQuery}
              onSelectProduct={handleSelectProduct}
              onBack={() => {
                setSelectedCategory(null);
                setSearchQuery('');
              }}
            />
          );
        }
        return <CategoriesPage onSelectCategory={handleSelectCategory} />;
      case 'cart':
        return (
          <CartPage
            onStartShopping={() => setActiveTab('home')}
            onProceedToCheckout={() => setIsCheckoutOpen(true)}
          />
        );
      case 'orders':
        return <OrdersPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return null;
    }
  };

  return (
    <CartProvider>
      <div className="app-container">
        {!isOnline && (
          <div className="offline-banner">
            <WifiOff size={16} />
            <span>You are browsing in offline mode. Cached essentials remain available.</span>
          </div>
        )}

        <Header />
        <InstallBanner />

        <main className="main-content">
          {renderMainContent()}
        </main>

        {!isCheckoutOpen && !selectedProduct && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSelectedProduct(null);
              setIsCheckoutOpen(false);
              if (tab !== 'categories') setSelectedCategory(null);
            }}
          />
        )}
      </div>
    </CartProvider>
  );
};

export default App;
