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
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { Category, Product } from './types';
import { repository } from './api/productRepository';
import { WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // URL Parsing and Deep-linking router
  const parseRouteFromUrl = async () => {
    const path = window.location.pathname;
    const search = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    // Check for product route: /product/:idOrSlug or /p/:idOrSlug or ?product=:id or #product=:id
    let productIdOrSlug: string | null = null;
    const match = path.match(/^\/(?:product|p)\/([^/?#]+)/i);
    if (match) {
      productIdOrSlug = decodeURIComponent(match[1]);
    } else if (search.get('product')) {
      productIdOrSlug = search.get('product');
    } else if (hash.startsWith('#product=')) {
      productIdOrSlug = hash.replace('#product=', '');
    }

    if (productIdOrSlug) {
      try {
        const prod = await repository.getProductById(productIdOrSlug);
        if (prod) {
          setSelectedProduct(prod);
          setIsAdminOpen(false);
          setIsCheckoutOpen(false);
          document.title = `${prod.name} | Kanhaiya General Store`;
          return;
        }
      } catch {
        // Fallback
      }
    } else {
      setSelectedProduct(null);
      document.title = 'Kanhaiya General Store | Daily Groceries & Essentials';
    }

    if (path === '/admin' || hash === '#admin') {
      setIsAdminOpen(true);
    } else if (path === '/cart') {
      setActiveTab('cart');
    } else if (path === '/orders') {
      setActiveTab('orders');
    }
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial URL routing check
    parseRouteFromUrl();

    // Browser back/forward navigation support
    const handlePopState = () => {
      parseRouteFromUrl();
    };
    window.addEventListener('popstate', handlePopState);

    // Custom event to view auto-created product page from admin or other components
    const handleViewProduct = (e: Event) => {
      const customEvt = e as CustomEvent<{ product?: Product; productId?: string }>;
      if (customEvt.detail?.product) {
        handleSelectProduct(customEvt.detail.product);
      } else if (customEvt.detail?.productId) {
        repository.getProductById(customEvt.detail.productId).then((p) => {
          if (p) handleSelectProduct(p);
        });
      }
    };
    window.addEventListener('kgs_view_product', handleViewProduct);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('kgs_view_product', handleViewProduct);
    };
  }, []);

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setSearchQuery('');
    setActiveTab('categories');
    setSelectedProduct(null);
    setIsAdminOpen(false);
    if (window.location.pathname.startsWith('/product/')) {
      window.history.pushState(null, '', '/');
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsAdminOpen(false);
    setIsCheckoutOpen(false);
    const productRoute = `/product/${product.slug || product.id}`;
    if (window.location.pathname !== productRoute) {
      window.history.pushState({ productId: product.id }, '', productRoute);
    }
    document.title = `${product.name} | Kanhaiya General Store`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackFromDetail = () => {
    setSelectedProduct(null);
    window.history.pushState(null, '', '/');
    document.title = 'Kanhaiya General Store | Daily Groceries & Essentials';
  };

  const handleViewAllProducts = (query?: string) => {
    setSelectedCategory(null);
    setSearchQuery(query || '');
    setActiveTab('categories');
    setSelectedProduct(null);
    setIsAdminOpen(false);
    if (window.location.pathname.startsWith('/product/')) {
      window.history.pushState(null, '', '/');
    }
  };

  const renderMainContent = () => {
    // If Admin Console is open
    if (isAdminOpen) {
      return (
        <AdminDashboardPage
          onBack={() => setIsAdminOpen(false)}
        />
      );
    }

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
        return (
          <OrdersPage
            onBrowseStore={() => setActiveTab('home')}
            onSignIn={() => setActiveTab('profile')}
          />
        );
      case 'profile':
        return <ProfilePage onOpenAdmin={() => setIsAdminOpen(true)} />;
      default:
        return null;
    }
  };

  return (
    <CartProvider>
      <div className={`app-container ${isAdminOpen ? 'app-container-admin' : ''}`}>
        {!isOnline && (
          <div className="offline-banner">
            <WifiOff size={16} />
            <span>You are browsing in offline mode. Cached essentials remain available.</span>
          </div>
        )}

        {!isAdminOpen && <Header />}
        {!isAdminOpen && <InstallBanner />}

        <main className="main-content">
          {renderMainContent()}
        </main>

        {!isCheckoutOpen && !selectedProduct && !isAdminOpen && (
          <BottomNav
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSelectedProduct(null);
              setIsCheckoutOpen(false);
              setIsAdminOpen(false);
              if (tab !== 'categories') setSelectedCategory(null);
            }}
          />
        )}
      </div>
    </CartProvider>
  );
};

export default App;
