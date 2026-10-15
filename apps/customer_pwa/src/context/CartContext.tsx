import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, Product, ValidatedCartResponse } from '../types';
import { repository } from '../api/productRepository';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  totalMrp: number;
  savings: number;
  deliveryFee: number;
  totalToPay: number;
  validationData: ValidatedCartResponse | null;
  isValidating: boolean;
  adjustmentNotice: string | null;
  clearAdjustmentNotice: () => void;
  revalidateCart: () => Promise<void>;
  recentlyViewed: Product[];
  addRecentlyViewed: (product: Product) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getCartStorageKey = () => {
  const phone = localStorage.getItem('kgs_profile_phone');
  const token = localStorage.getItem('kanhaiya_auth_token');
  if (phone) return `ks_pwa_cart_${phone.replace(/\D/g, '')}`;
  if (token) return `ks_pwa_cart_${token.slice(-12)}`;
  return 'ks_pwa_cart_guest';
};

const RECENT_STORAGE_KEY = 'ks_pwa_recent_viewed_v2';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const key = getCartStorageKey();
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Listen for account change / login events and reload the scoped cart
  useEffect(() => {
    const handleAccountChange = () => {
      try {
        const key = getCartStorageKey();
        const saved = localStorage.getItem(key);
        setCart(saved ? JSON.parse(saved) : []);
      } catch {
        setCart([]);
      }
    };

    window.addEventListener('kgs_profile_updated', handleAccountChange);
    window.addEventListener('kgs_user_updated', handleAccountChange);
    return () => {
      window.removeEventListener('kgs_profile_updated', handleAccountChange);
      window.removeEventListener('kgs_user_updated', handleAccountChange);
    };
  }, []);

  const [recentlyViewed, setRecentlyViewed] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(RECENT_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [validationData, setValidationData] = useState<ValidatedCartResponse | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [adjustmentNotice, setAdjustmentNotice] = useState<string | null>(null);

  // Save cart to user-scoped local storage
  useEffect(() => {
    try {
      const key = getCartStorageKey();
      localStorage.setItem(key, JSON.stringify(cart));
    } catch {
      // ignore storage full
    }
  }, [cart]);

  // Save recently viewed
  useEffect(() => {
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(recentlyViewed.slice(0, 10)));
    } catch {
      // ignore
    }
  }, [recentlyViewed]);

  const addRecentlyViewed = useCallback((product: Product) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      return [product, ...filtered].slice(0, 10);
    });
  }, []);

  // Revalidate cart with backend
  const revalidateCart = useCallback(async () => {
    if (cart.length === 0) {
      setValidationData(null);
      return;
    }

    try {
      setIsValidating(true);
      const itemsPayload = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
      }));

      const res = await repository.validateCart(itemsPayload);
      setValidationData(res);

      if (res.hasAdjustments) {
        // Collect messages
        const msgs = res.items
          .filter((i) => i.status !== 'valid' && i.message)
          .map((i) => `${i.name}: ${i.message}`);

        if (msgs.length > 0) {
          setAdjustmentNotice(msgs.join(' • '));
        }

        // Synchronize local cart with adjustments
        setCart((prev) => {
          const updated: CartItem[] = [];
          for (const item of prev) {
            const serverItem = res.items.find((si) => si.productId === item.product.id);
            if (!serverItem || serverItem.status === 'unavailable' || serverItem.status === 'out_of_stock' || serverItem.validQuantity === 0) {
              // Item dropped
              continue;
            }
            updated.push({
              product: {
                ...item.product,
                sellingPrice: serverItem.sellingPrice,
                mrp: serverItem.mrp,
                stockQuantity: serverItem.availableStock,
              },
              quantity: serverItem.validQuantity,
            });
          }
          return updated;
        });
      }
    } catch (_err) {
      // offline / network error
    } finally {
      setIsValidating(false);
    }
  }, [cart]);

  // Auto-validate on cart change (debounced)
  useEffect(() => {
    if (cart.length === 0) return;
    const timer = setTimeout(() => {
      revalidateCart();
    }, 400);
    return () => clearTimeout(timer);
  }, [cart.length]);

  const addToCart = (product: Product, qty: number = 1) => {
    // Basic local check
    if (!product.isAvailable || product.stockQuantity === 0) {
      setAdjustmentNotice(`${product.name} is currently out of stock.`);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const nextQty = existing.quantity + qty;
        if (nextQty > product.stockQuantity) {
          setAdjustmentNotice(`Maximum available stock for ${product.name} is ${product.stockQuantity}.`);
          return prev.map((item) =>
            item.product.id === product.id ? { ...item, quantity: product.stockQuantity } : item
          );
        }
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: nextQty } : item
        );
      }
      return [...prev, { product, quantity: Math.min(qty, product.stockQuantity) }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stockQuantity;
          if (quantity > maxStock) {
            setAdjustmentNotice(`Maximum stock available for ${item.product.name} is ${maxStock}.`);
            return { ...item, quantity: maxStock };
          }
          return { ...item, quantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setValidationData(null);
    setAdjustmentNotice(null);
  };

  const clearAdjustmentNotice = () => setAdjustmentNotice(null);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = validationData?.subtotal ?? cart.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const totalMrp = validationData?.totalMrp ?? cart.reduce((sum, item) => sum + (item.product.mrp || item.product.sellingPrice) * item.quantity, 0);
  const savings = validationData?.savings ?? (totalMrp > subtotal ? totalMrp - subtotal : 0);
  const deliveryFee = 0;
  const totalToPay = subtotal;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        totalMrp,
        savings,
        deliveryFee,
        totalToPay,
        validationData,
        isValidating,
        adjustmentNotice,
        clearAdjustmentNotice,
        revalidateCart,
        recentlyViewed,
        addRecentlyViewed,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
