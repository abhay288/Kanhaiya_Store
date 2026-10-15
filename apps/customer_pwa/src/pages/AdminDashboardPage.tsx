import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Package, PlusCircle, FileText, CheckCircle,
  AlertCircle, Printer, Share2, Upload, Trash2, Image as ImageIcon,
  Phone, Mail, MapPin, RefreshCw, X, Store, Users, Plus, Eye, Bell, Download
} from 'lucide-react';
import { apiClient } from '../api/client';
import { AdminProductsManagement } from '../components/admin/AdminProductsManagement';
import { AdminUsersManagement } from '../components/admin/AdminUsersManagement';
import { AdminCreateOrderModal } from '../components/admin/AdminCreateOrderModal';
import { NotificationsModal } from '../components/common/NotificationsModal';

interface AdminDashboardPageProps {
  onBack: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'addProduct' | 'users' | 'settings'>('orders');

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Admin Notification State for Immediate Customer Order Alerts
  const [adminNotifications, setAdminNotifications] = useState<any[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  // Add Product State
  const [productName, setProductName] = useState('');
  const [categoryName, setCategoryName] = useState('Atta & Flours');
  const [sku, setSku] = useState(() => {
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `KGS-ATT-GEN-${rand}`;
  });
  const [brand, setBrand] = useState('');
  const [unit, setUnit] = useState('kg');
  const [packSize, setPackSize] = useState('1 kg');
  const [mrp, setMrp] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('20');
  const [description, setDescription] = useState('');
  // Up to 3 photos
  const [photos, setPhotos] = useState<string[]>(['', '', '']);
  const [photoFiles, setPhotoFiles] = useState<(File | null)[]>([null, null, null]);
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [productSuccessMsg, setProductSuccessMsg] = useState<string | null>(null);
  const [recentlyCreatedProduct, setRecentlyCreatedProduct] = useState<any | null>(null);

  const getCategorySkuCode = (cat: string) => {
    const map: Record<string, string> = {
      'Atta & Flours': 'ATT',
      'Rice & Grains': 'RIC',
      'Edible Oils & Ghee': 'OIL',
      'Pulses & Dal': 'DAL',
      'Spices & Masala': 'SPC',
      'Dairy & Bakery': 'DRY',
      'Snacks & Beverages': 'SNK',
      'Personal Care': 'PCR',
      'Household Cleaners': 'HCL',
    };
    return map[cat] || 'GEN';
  };

  const generateSkuNumber = (cat: string, name?: string) => {
    const code = getCategorySkuCode(cat);
    const namePart = name && name.trim().length >= 3
      ? name.trim().slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
      : 'GEN';
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `KGS-${code}-${namePart}-${rand}`;
  };

  // Load orders and admin notifications on mount with real-time polling
  useEffect(() => {
    fetchOrders(false);
    fetchAdminNotifications();

    // Real-time synchronization: poll incoming orders and alerts every 8 seconds
    const interval = setInterval(() => {
      fetchAdminNotifications();
      fetchOrders(true);
    }, 8000);

    const handleExternalOrderChange = () => {
      fetchOrders(true);
      fetchAdminNotifications();
    };
    window.addEventListener('kgs_order_placed', handleExternalOrderChange);
    window.addEventListener('kgs_order_updated', handleExternalOrderChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('kgs_order_placed', handleExternalOrderChange);
      window.removeEventListener('kgs_order_updated', handleExternalOrderChange);
    };
  }, []);

  const fetchAdminNotifications = async () => {
    try {
      const res = await apiClient.getNotifications(undefined, true);
      if (res.data) {
        setAdminNotifications(res.data);
        const unread = res.data.filter((n: any) => !n.isRead).length;
        setUnreadAlertsCount(unread);
      }
    } catch {
      // Background poll silently resumes
    }
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) {
      setLoadingOrders(true);
      setActionMsg(null);
    }
    try {
      const res = await apiClient.getAdminOrders({ limit: 50 });
      if (res.data?.items) {
        setOrders(res.data.items);
      } else {
        setOrders([]);
      }
    } catch (err: unknown) {
      if (!silent) {
        const e = err as { message?: string };
        setActionMsg({
          type: 'error',
          text: `Failed to load orders: ${e?.message || 'Check connection'}`
        });
      }
    } finally {
      if (!silent) {
        setLoadingOrders(false);
      }
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await apiClient.updateOrderStatus(orderId, newStatus, `Updated via Admin Web to ${newStatus}`);
      setActionMsg({ type: 'success', text: `Order status updated to ${newStatus}` });
      fetchOrders();
      if (selectedOrderForInvoice && selectedOrderForInvoice._id === orderId) {
        setSelectedOrderForInvoice({ ...selectedOrderForInvoice, orderStatus: newStatus });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionMsg({ type: 'error', text: e?.message || 'Status update failed' });
    }
  };

  const handleVerifyPayment = async (orderId: string) => {
    try {
      await apiClient.verifyPayment(orderId, 'ADMIN_VERIFIED_WEB');
      setActionMsg({ type: 'success', text: 'WhatsApp payment marked as VERIFIED' });
      fetchOrders();
      if (selectedOrderForInvoice && selectedOrderForInvoice._id === orderId) {
        setSelectedOrderForInvoice({
          ...selectedOrderForInvoice,
          paymentStatus: 'PAID',
          paymentVerificationStatus: 'VERIFIED'
        });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionMsg({ type: 'error', text: e?.message || 'Payment verification failed' });
    }
  };

  const handleCollectCod = async (orderId: string) => {
    try {
      await apiClient.collectCod(orderId);
      setActionMsg({ type: 'success', text: 'Cash payment marked as COLLECTED' });
      fetchOrders();
      if (selectedOrderForInvoice && selectedOrderForInvoice._id === orderId) {
        setSelectedOrderForInvoice({
          ...selectedOrderForInvoice,
          paymentStatus: 'PAID'
        });
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionMsg({ type: 'error', text: e?.message || 'COD collection failed' });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    setIsDeletingOrder(true);
    try {
      await apiClient.deleteOrder(orderId);
      setActionMsg({ type: 'success', text: 'Order permanently deleted and product inventory restored.' });
      fetchOrders();
      setDeletingOrderId(null);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionMsg({ type: 'error', text: `Failed to delete order: ${e?.message || 'Error'}` });
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Photo Upload Handler for Product
  const handlePhotoFileChange = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhotoIndex(index);
    try {
      const res = await apiClient.uploadImage(file);
      const newPhotos = [...photos];
      newPhotos[index] = res.data.url;
      setPhotos(newPhotos);
      const newFiles = [...photoFiles];
      newFiles[index] = file;
      setPhotoFiles(newFiles);
    } catch {
      // Fallback: Read as base64 data URL so admin can still add products seamlessly
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const newPhotos = [...photos];
        newPhotos[index] = result;
        setPhotos(newPhotos);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingPhotoIndex(null);
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos[index] = '';
    setPhotos(newPhotos);
    const newFiles = [...photoFiles];
    newFiles[index] = null;
    setPhotoFiles(newFiles);
  };

  const handlePhotoUrlChange = (index: number, val: string) => {
    const newPhotos = [...photos];
    newPhotos[index] = val;
    setPhotos(newPhotos);
  };

  // Add Product Form Submission
  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProduct(true);
    setProductSuccessMsg(null);
    setActionMsg(null);

    const priceNum = parseFloat(sellingPrice);
    const mrpNum = parseFloat(mrp) || priceNum;
    const stockNum = parseInt(stockQuantity, 10) || 0;

    if (!productName.trim() || isNaN(priceNum) || priceNum <= 0) {
      setActionMsg({ type: 'error', text: 'Please provide valid product name and selling price.' });
      setSubmittingProduct(false);
      return;
    }

    // Filter valid photos
    const validPhotos = photos.filter((p) => p.trim().length > 0);
    const imagesPayload = validPhotos.map((url, i) => ({
      url,
      publicId: `pwa_prod_${Date.now()}_${i}`,
      isPrimary: i === 0,
      sortOrder: i,
    }));

    // If no photo provided, default grocery placeholder
    if (imagesPayload.length === 0) {
      imagesPayload.push({
        url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
        publicId: 'default_grocery_asset',
        isPrimary: true,
        sortOrder: 0,
      });
    }

    try {
      // Fetch or use category ID
      let categoryId = '662b10000000000000000001';
      try {
        const catRes = await apiClient.getCategories();
        if (catRes.data && Array.isArray(catRes.data) && catRes.data.length > 0) {
          const matched = catRes.data.find(
            (c: any) => c.name.toLowerCase() === categoryName.toLowerCase()
          );
          if (matched?._id) categoryId = matched._id;
          else categoryId = catRes.data[0]._id;
        }
      } catch {
        // Fallback ObjectId
      }

      const payload = {
        name: productName.trim(),
        sku: sku.trim() || generateSkuNumber(categoryName, productName),
        brand: brand.trim() || undefined,
        categoryId,
        unit: unit.toLowerCase(),
        packSize: packSize.trim() || `${unit}`,
        mrp: mrpNum,
        sellingPrice: priceNum,
        stockQuantity: stockNum,
        description: description.trim() || `${productName} available at Kanhaiya General Store`,
        images: imagesPayload,
        isAvailable: stockNum > 0,
        isPublished: true,
      };

      const res = await apiClient.createProduct(payload);
      const createdProd = res.data;

      // Real-time catalog update across all store views
      window.dispatchEvent(
        new CustomEvent('kgs_catalog_updated', { detail: { product: createdProd } })
      );

      setRecentlyCreatedProduct(createdProd);
      setProductSuccessMsg(`✅ Product "${productName}" is now LIVE on store! Dedicated product page created automatically.`);
      // Reset form
      setProductName('');
      setSku(generateSkuNumber(categoryName, ''));
      setBrand('');
      setMrp('');
      setSellingPrice('');
      setStockQuantity('20');
      setDescription('');
      setPhotos(['', '', '']);
      setPhotoFiles([null, null, null]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionMsg({ type: 'error', text: `Failed to create product: ${e?.message || 'Server error'}` });
    } finally {
      setSubmittingProduct(false);
    }
  };

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.orderStatus === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(q)) ||
      (o.customerPhone && o.customerPhone.includes(q)) ||
      (o.customerName && o.customerName.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  // Executive KPI summary calculations
  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + (o.grandTotal ?? o.totalAmount ?? 0), 0);

  const pendingOrdersCount = orders.filter(
    o => o.orderStatus === 'PENDING' || o.orderStatus === 'CONFIRMED' || o.orderStatus === 'PACKING'
  ).length;

  const readyPickupCount = orders.filter(
    o => o.orderStatus === 'READY_FOR_PICKUP'
  ).length;

  const completedOrdersCount = orders.filter(
    o => o.orderStatus === 'COMPLETED'
  ).length;

  const statusCounts: Record<string, number> = {
    ALL: orders.length,
    PENDING: orders.filter(o => o.orderStatus === 'PENDING').length,
    CONFIRMED: orders.filter(o => o.orderStatus === 'CONFIRMED').length,
    PACKING: orders.filter(o => o.orderStatus === 'PACKING').length,
    READY_FOR_PICKUP: orders.filter(o => o.orderStatus === 'READY_FOR_PICKUP').length,
    COMPLETED: orders.filter(o => o.orderStatus === 'COMPLETED').length,
    CANCELLED: orders.filter(o => o.orderStatus === 'CANCELLED').length,
  };

  return (
    <div style={{ padding: '20px 24px', maxWidth: '1240px', margin: '0 auto', color: 'var(--text-main)', width: '100%' }}>
      {/* Sleek Executive Admin Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Brand & Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
          <img
            src="/logo.png"
            alt="Kanhaiya General Store"
            style={{
              width: '46px',
              height: '46px',
              objectFit: 'contain',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              border: '1px solid var(--border)',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.01em' }}>
                Kanhaiya General Store
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  padding: '3px 8px',
                  borderRadius: '20px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                Store Admin
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={12} color="var(--primary)" />
              Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat
            </div>
          </div>
        </div>

        {/* Right: Actions, Live Sync Indicator, Alerts & Exit */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Live Sync Status Pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: 700,
              color: '#166534',
            }}
            title="Real-time live sync polling active"
          >
            <span className="live-pulse-dot" />
            <span>Live Sync</span>
          </div>

          {/* Quick Create Order */}
          <button
            onClick={() => setShowCreateOrderModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(23, 77, 58, 0.2)',
              transition: 'all 0.15s ease',
            }}
          >
            <Plus size={16} />
            <span>+ New Order</span>
          </button>

          {/* Alerts Bell */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            style={{
              position: 'relative',
              background: '#f8fafc',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              color: unreadAlertsCount > 0 ? '#b91c1c' : 'var(--text-main)',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
            title="Customer Order Alerts"
          >
            <Bell size={16} />
            <span>Alerts</span>
            {unreadAlertsCount > 0 && (
              <span
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 900,
                  borderRadius: '10px',
                  minWidth: '18px',
                  height: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                }}
              >
                {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
              </span>
            )}
          </button>

          {/* Exit Admin */}
          <button
            onClick={onBack}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#ffffff',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              color: 'var(--text-muted)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.82rem',
            }}
          >
            <ArrowLeft size={16} />
            <span>Exit Store</span>
          </button>
        </div>
      </header>

      {/* Live KPI Metrics Summary Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Total Orders */}
        <div
          onClick={() => { setActiveTab('orders'); setStatusFilter('ALL'); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Orders
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '6px', backgroundColor: 'var(--primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
              <FileText size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: 'var(--text-main)', marginTop: '4px' }}>
            {orders.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            All-time customer requests
          </div>
        </div>

        {/* Pending Processing */}
        <div
          onClick={() => { setActiveTab('orders'); setStatusFilter('PENDING'); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: pendingOrdersCount > 0 ? '1px solid #fed7aa' : '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pendingOrdersCount > 0 ? '#c2410c' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Action
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '6px', backgroundColor: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c' }}>
              <AlertCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: pendingOrdersCount > 0 ? '#c2410c' : 'var(--text-main)', marginTop: '4px' }}>
            {pendingOrdersCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Needs confirmation or packing
          </div>
        </div>

        {/* Ready for Pickup */}
        <div
          onClick={() => { setActiveTab('orders'); setStatusFilter('READY_FOR_PICKUP'); }}
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: readyPickupCount > 0 ? '1px solid #bfdbfe' : '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: readyPickupCount > 0 ? '#1d4ed8' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Ready for Pickup
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Package size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: readyPickupCount > 0 ? '#1d4ed8' : 'var(--text-main)', marginTop: '4px' }}>
            {readyPickupCount}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Awaiting store customer pickup
          </div>
        </div>

        {/* Total Collected Revenue */}
        <div
          style={{
            padding: '14px 16px',
            backgroundColor: '#ffffff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Paid Revenue
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '6px', backgroundColor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <CheckCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 900, color: '#166534', marginTop: '4px' }}>
            ₹{totalRevenue.toLocaleString('en-IN')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            From {completedOrdersCount} verified orders
          </div>
        </div>
      </div>

      {/* Live Customer Order Notification Alert Banner */}
      {(() => {
        const latestOrderAlert = adminNotifications.find(
          n => !n.isRead && (n.type === 'ADMIN_ALERT' || n.isAdmin)
        );
        if (!latestOrderAlert) return null;
        return (
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              marginBottom: '16px',
              fontSize: '0.84rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: '#fef2f2',
              color: '#991b1b',
              border: '1.5px solid #f87171',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.12)',
            }}
          >
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bell size={18} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#7f1d1d' }}>
                  {latestOrderAlert.title}
                </span>
                <span style={{ fontSize: '0.72rem', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  Live Order Alert
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#991b1b', marginTop: '2px', lineHeight: 1.3 }}>
                {latestOrderAlert.message}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => {
                  setActiveTab('orders');
                  if (latestOrderAlert.orderNumber) {
                    setSearchQuery(latestOrderAlert.orderNumber);
                  }
                  fetchOrders();
                  apiClient.markNotificationRead(latestOrderAlert._id || latestOrderAlert.id);
                  setAdminNotifications(prev =>
                    prev.map(n =>
                      n._id === latestOrderAlert._id || n.id === latestOrderAlert.id
                        ? { ...n, isRead: true }
                        : n
                    )
                  );
                  setUnreadAlertsCount(prev => Math.max(0, prev - 1));
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                View Order
              </button>
              <button
                onClick={() => {
                  apiClient.markNotificationRead(latestOrderAlert._id || latestOrderAlert.id);
                  setAdminNotifications(prev =>
                    prev.map(n =>
                      n._id === latestOrderAlert._id || n.id === latestOrderAlert.id
                        ? { ...n, isRead: true }
                        : n
                    )
                  );
                  setUnreadAlertsCount(prev => Math.max(0, prev - 1));
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#991b1b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Action Messages */}
      {actionMsg && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '16px',
            fontSize: '0.82rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: actionMsg.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: actionMsg.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${actionMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          {actionMsg.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{actionMsg.text}</span>
          <button
            onClick={() => setActionMsg(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Executive Tab Switcher */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          marginBottom: '20px',
          borderBottom: '2px solid var(--border)',
        }}
      >
        {[
          { id: 'orders', label: 'Orders & Invoices', icon: FileText, count: orders.length },
          { id: 'products', label: 'Product Catalog', icon: Package },
          { id: 'addProduct', label: '+ Add Product', icon: PlusCircle },
          { id: 'users', label: 'Customer Accounts', icon: Users },
          { id: 'settings', label: 'Store Overview & Stats', icon: Store },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                backgroundColor: isActive ? '#ffffff' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                fontWeight: isActive ? 800 : 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    backgroundColor: isActive ? 'var(--primary)' : '#e2e8f0',
                    color: isActive ? '#ffffff' : '#475569',
                    padding: '2px 7px',
                    borderRadius: '12px',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ORDERS & INVOICES                                 */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div>
          {/* Search, Filter and Actions Toolbar */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '14px',
              backgroundColor: '#ffffff',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
              <input
                type="text"
                placeholder="Search orders by order #, customer phone, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.84rem',
                  backgroundColor: '#f8fafc',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => fetchOrders(false)}
              disabled={loadingOrders}
              style={{
                padding: '9px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}
              title="Refresh Orders from MongoDB"
            >
              <RefreshCw size={15} className={loadingOrders ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Status Filter Chips with real-time counters */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              paddingBottom: '8px',
              marginBottom: '16px',
            }}
          >
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'PENDING', label: 'Pending' },
              { id: 'CONFIRMED', label: 'Confirmed' },
              { id: 'PACKING', label: 'Packing' },
              { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map(({ id, label }) => {
              const count = statusCounts[id] ?? 0;
              const isSelected = statusFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setStatusFilter(id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: isSelected ? 'var(--primary)' : '#ffffff',
                    color: isSelected ? '#ffffff' : 'var(--text-main)',
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 4px rgba(23, 77, 58, 0.2)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Orders Listing */}
          {loadingOrders ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              Loading orders from database...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px',
                backgroundColor: 'var(--surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed var(--border)'
              }}
            >
              <Package size={36} color="var(--text-muted)" style={{ margin: '0 auto 8px' }} />
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>No Orders Found</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No orders match your filter criteria.'
                  : 'Customer orders placed in Kanhaiya General Store will appear here in real time.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
              {filteredOrders.map((order) => {
                const isPaid = order.paymentStatus === 'PAID';
                const isCod = order.paymentMethod === 'COD' || order.paymentMethod === 'CASH_ON_PICKUP';
                const isWhatsapp = order.paymentMethod === 'WHATSAPP_UPI';

                return (
                  <div
                    key={order._id || order.orderNumber}
                    style={{
                      padding: '16px',
                      backgroundColor: '#ffffff',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      {/* Order Card Top: Order Number & Amount */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.96rem', fontWeight: 900, color: 'var(--primary)' }}>
                              #{order.orderNumber || order._id?.slice(-6)}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '4px',
                                textTransform: 'uppercase',
                                backgroundColor:
                                  order.orderStatus === 'COMPLETED' ? '#dcfce7' :
                                    order.orderStatus === 'CANCELLED' ? '#fee2e2' :
                                      order.orderStatus === 'READY_FOR_PICKUP' ? '#dbeafe' : '#fef3c7',
                                color:
                                  order.orderStatus === 'COMPLETED' ? '#166534' :
                                    order.orderStatus === 'CANCELLED' ? '#991b1b' :
                                      order.orderStatus === 'READY_FOR_PICKUP' ? '#1e40af' : '#92400e',
                              }}
                            >
                              {order.orderStatus}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            {new Date(order.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                            ₹{order.grandTotal ?? order.totalAmount ?? 0}
                          </div>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              marginTop: '2px',
                              backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                              color: isPaid ? '#166534' : '#991b1b',
                            }}
                          >
                            {isPaid ? 'PAID' : 'PAYMENT PENDING'}
                          </span>
                        </div>
                      </div>

                      {/* Customer Info Box with Direct Call & WhatsApp */}
                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #f1f5f9',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          marginBottom: '10px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.84rem' }}>
                            👤 {order.customerName || 'Customer'}
                          </span>
                          {order.customerPhone && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <a
                                href={`tel:${order.customerPhone}`}
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#ffffff',
                                  border: '1px solid #cbd5e1',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  color: 'var(--primary)',
                                  textDecoration: 'none',
                                  fontWeight: 700,
                                }}
                                title="Direct Phone Call"
                              >
                                📞 Call
                              </a>
                              <a
                                href={`https://wa.me/91${order.customerPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                  padding: '2px 6px',
                                  backgroundColor: '#25D366',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  color: '#ffffff',
                                  textDecoration: 'none',
                                  fontWeight: 700,
                                }}
                                title="Direct WhatsApp Message"
                              >
                                💬 WhatsApp
                              </a>
                            </div>
                          )}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                          📞 +91 {order.customerPhone || 'N/A'} • {isWhatsapp ? '📲 WhatsApp UPI' : isCod ? '💵 Cash on Pickup' : order.paymentMethod}
                          {order.pickupSlot && ` • Slot: ${order.pickupSlot}`}
                        </div>
                      </div>

                      {/* Items Summary */}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Items ({order.items?.length || 0}): </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                          {order.items?.map((it: any, i: number) => (
                            <span
                              key={i}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              {it.productName || it.name} × {it.quantity || 1}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        paddingTop: '10px',
                        borderTop: '1px solid var(--border)',
                        alignItems: 'center',
                      }}
                    >
                      <button
                        onClick={() => setSelectedOrderForInvoice(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '7px 11px',
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <FileText size={14} /> View / Print Invoice
                      </button>

                      {/* Status select */}
                      <select
                        value={order.orderStatus}
                        onChange={(e) => handleUpdateStatus(order._id || order.orderNumber, e.target.value)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#ffffff',
                          cursor: 'pointer',
                        }}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PACKING">PACKING</option>
                        <option value="READY_FOR_PICKUP">READY FOR PICKUP</option>
                        <option value="COMPLETED">COMPLETED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>

                      {/* Payment verification button */}
                      {!isPaid && isWhatsapp && (
                        <button
                          onClick={() => handleVerifyPayment(order._id || order.orderNumber)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Verify UPI
                        </button>
                      )}

                      {!isPaid && isCod && (
                        <button
                          onClick={() => handleCollectCod(order._id || order.orderNumber)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Collect Cash
                        </button>
                      )}

                      {/* Delete Order button */}
                      <button
                        onClick={() => setDeletingOrderId(order._id || order.orderNumber)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 8px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          marginLeft: 'auto',
                        }}
                        title="Permanently Delete Order from MongoDB"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: PRODUCTS CATALOG (LIVE / UNLIVE MANAGEMENT)       */}
      {/* ======================================================== */}
      {activeTab === 'products' && (
        <AdminProductsManagement
          onToast={(type, text) => setActionMsg({ type, text })}
          onNavigateAddProduct={() => setActiveTab('addProduct')}
        />
      )}

      {/* ======================================================== */}
      {/* TAB 3: ADD PRODUCT (WITH UP TO 3 PHOTOS)                 */}
      {/* ======================================================== */}
      {activeTab === 'addProduct' && (
        <div
          style={{
            backgroundColor: 'var(--surface)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}
        >
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
              Add New Product to Kanhaiya General Store
            </h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Add product details with up to 3 high-resolution photos for customer browsing.
            </p>
          </div>

          {recentlyCreatedProduct && (
            <div
              style={{
                padding: '16px',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 'var(--radius-md)',
                marginBottom: '18px',
                boxShadow: '0 2px 6px rgba(22, 101, 52, 0.08)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.98rem' }}>
                <CheckCircle size={22} color="#16a34a" />
                <span>🎉 Live Product Page Auto-Created!</span>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#14532d', margin: '8px 0 12px', lineHeight: 1.5 }}>
                <strong>{recentlyCreatedProduct.name}</strong> is published live on the store. Customers can view and purchase it right now.
                <br />
                <span style={{ fontSize: '0.76rem', color: '#166534' }}>
                  Auto-Generated Route:{' '}
                  <code style={{ backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    /product/{recentlyCreatedProduct.slug || recentlyCreatedProduct._id}
                  </code>
                </span>
              </p>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent('kgs_view_product', {
                        detail: {
                          product: {
                            id: recentlyCreatedProduct._id || recentlyCreatedProduct.id,
                            name: recentlyCreatedProduct.name,
                            slug: recentlyCreatedProduct.slug,
                            sellingPrice: recentlyCreatedProduct.sellingPrice,
                            mrp: recentlyCreatedProduct.mrp,
                            packSize: recentlyCreatedProduct.packSize,
                            stockQuantity: recentlyCreatedProduct.stockQuantity,
                            isAvailable: true,
                            imageUrl: recentlyCreatedProduct.images?.[0]?.url || recentlyCreatedProduct.imageUrl || '',
                            images: recentlyCreatedProduct.images || [],
                            description: recentlyCreatedProduct.description,
                          },
                        },
                      })
                    );
                    onBack();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#166534',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  <Eye size={16} /> 👁️ View Live Product Page
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}/product/${recentlyCreatedProduct.slug || recentlyCreatedProduct._id}`;
                    await navigator.clipboard.writeText(url);
                    setActionMsg({ type: 'success', text: `Product page link copied: ${url}` });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#fff',
                    color: '#166534',
                    border: '1px solid #bbf7d0',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Share2 size={15} /> Copy Shareable Link
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRecentlyCreatedProduct(null);
                    setProductSuccessMsg(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginLeft: 'auto',
                  }}
                >
                  <PlusCircle size={15} /> + Add Another
                </button>
              </div>
            </div>
          )}

          {productSuccessMsg && !recentlyCreatedProduct && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                fontWeight: 700,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle size={16} /> {productSuccessMsg}
            </div>
          )}

          <form onSubmit={handleAddProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* 3 Photos Upload / URL Management */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                📸 Product Photos (Upload up to 3 photos):
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '8px' }}>
                {[0, 1, 2].map((idx) => {
                  const photoUrl = photos[idx];
                  const isUploading = uploadingPhotoIndex === idx;

                  return (
                    <div
                      key={idx}
                      style={{
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px',
                        textAlign: 'center',
                        backgroundColor: '#f8fafc',
                        position: 'relative',
                        minHeight: '120px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {photoUrl ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img
                            src={photoUrl}
                            alt={`Photo ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '80px',
                              objectFit: 'contain',
                              borderRadius: '4px',
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-4px',
                              backgroundColor: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: '4px' }}>
                            {idx === 0 ? '★ Primary Photo' : `Photo ${idx + 1}`}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <ImageIcon size={24} color="var(--text-muted)" style={{ margin: '0 auto 4px' }} />
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                            {idx === 0 ? 'Primary Photo' : `Photo ${idx + 1} (Opt)`}
                          </div>

                          <label
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              backgroundColor: 'var(--primary-subtle)',
                              color: 'var(--primary)',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              borderRadius: '4px',
                              cursor: isUploading ? 'wait' : 'pointer',
                            }}
                          >
                            <Upload size={12} style={{ display: 'inline', marginRight: '3px' }} />
                            {isUploading ? 'Uploading...' : 'Upload'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handlePhotoFileChange(idx, e)}
                              disabled={isUploading}
                              style={{ display: 'none' }}
                            />
                          </label>
                        </div>
                      )}

                      {/* Direct URL input fallback */}
                      <input
                        type="url"
                        placeholder="Or Image URL"
                        value={photoUrl.startsWith('data:') ? '' : photoUrl}
                        onChange={(e) => handlePhotoUrlChange(idx, e.target.value)}
                        style={{
                          width: '100%',
                          marginTop: '6px',
                          fontSize: '0.65rem',
                          padding: '3px 4px',
                          borderRadius: '3px',
                          border: '1px solid var(--border)',
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Product Name */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Product Name *
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => {
                  const newName = e.target.value;
                  setProductName(newName);
                  if (!sku || sku.startsWith('KGS-')) {
                    setSku(generateSkuNumber(categoryName, newName));
                  }
                }}
                placeholder="e.g. Aashirvaad Shudh Chakki Atta 10kg"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            {/* SKU (Stock Keeping Unit - Auto-Generated) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>
                  SKU Number (Stock Keeping Unit) *
                </label>
                <button
                  type="button"
                  onClick={() => setSku(generateSkuNumber(categoryName, productName))}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary)',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Generate new unique SKU"
                >
                  <RefreshCw size={12} /> Auto-Generate New SKU
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  placeholder="e.g. KGS-ATT-AAS-4892"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                  }}
                >
                  AUTO-GENERATED
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                Unique inventory SKU automatically generated for barcodes, stock tracking & invoices.
              </div>
            </div>

            {/* Category & Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={categoryName}
                  onChange={(e) => {
                    const newCat = e.target.value;
                    setCategoryName(newCat);
                    setSku(generateSkuNumber(newCat, productName));
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--surface)',
                  }}
                >
                  <option value="Atta & Flours">Atta & Flours</option>
                  <option value="Rice & Grains">Rice & Grains</option>
                  <option value="Edible Oils & Ghee">Edible Oils & Ghee</option>
                  <option value="Pulses & Dal">Pulses & Dal</option>
                  <option value="Spices & Masala">Spices & Masala</option>
                  <option value="Dairy & Bakery">Dairy & Bakery</option>
                  <option value="Snacks & Beverages">Snacks & Beverages</option>
                  <option value="Personal Care">Personal Care</option>
                  <option value="Household Cleaners">Household Cleaners</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Brand (Optional)
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Aashirvaad, Fortune"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* Unit & Pack Size */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--surface)',
                  }}
                >
                  <option value="kg">kg (Kilogram)</option>
                  <option value="g">g (Gram)</option>
                  <option value="litre">litre (Litre)</option>
                  <option value="ml">ml (Millilitre)</option>
                  <option value="piece">piece (Piece)</option>
                  <option value="pack">pack (Pack)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Pack Size Display
                </label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  placeholder="e.g. 10 kg, 1 Litre"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* MRP, Selling Price, Stock */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  MRP (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  placeholder="e.g. 420"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.5"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  placeholder="e.g. 395"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Stock Qty
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="e.g. 20"
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                Description (Optional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description, ingredients, benefits..."
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingProduct}
              style={{
                backgroundColor: 'var(--primary)',
                color: '#fff',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.9rem',
                cursor: submittingProduct ? 'not-allowed' : 'pointer',
                opacity: submittingProduct ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '6px',
              }}
            >
              <PlusCircle size={18} />
              {submittingProduct ? 'Saving to Database...' : 'Save & Publish Product to Store'}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STORE OVERVIEW & SETTINGS                         */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>TOTAL ORDERS</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)', marginTop: '4px' }}>
                {orders.length}
              </div>
            </div>

            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>STORE STATUS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#16a34a', marginTop: '6px' }}>
                🟢 Open & Online
              </div>
            </div>
          </div>

          {/* Official Store Branding Card */}
          <div
            style={{
              padding: '16px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: '12px' }}>
              🏪 Official Store Information
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Store size={18} color="var(--primary)" />
                <div>
                  <strong>Store Name:</strong> Kanhaiya General Store
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={18} color="var(--primary)" />
                <div>
                  <strong>Store Location:</strong> Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Phone size={18} color="var(--primary)" />
                <div>
                  <strong>Helpline / WhatsApp:</strong> +91 9936269347
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Mail size={18} color="var(--primary)" />
                <div>
                  <strong>Support Email:</strong> kanhaiyaastore@gmail.com
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Health */}
          <div
            style={{
              padding: '14px',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.78rem'
            }}
          >
            <h4 style={{ fontWeight: 800, marginBottom: '8px' }}>⚡ System Infrastructure</h4>
            <div style={{ color: 'var(--text-muted)' }}>
              • Backend API: <strong style={{ color: '#16a34a' }}>https://kanhaiya-store-backend.onrender.com</strong><br />
              • Database: <strong style={{ color: '#16a34a' }}>MongoDB Atlas (Connected)</strong><br />
              • Web Deployment: <strong style={{ color: '#16a34a' }}>Vercel Edge Network</strong>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MONGODB USER MANAGEMENT                           */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <AdminUsersManagement
          onToast={(type, text) => setActionMsg({ type, text })}
        />
      )}

      {/* ======================================================== */}
      {/* CREATE ORDER MODAL                                       */}
      {/* ======================================================== */}
      {showCreateOrderModal && (
        <AdminCreateOrderModal
          onClose={() => setShowCreateOrderModal(false)}
          onOrderCreated={() => fetchOrders()}
          onToast={(type, text) => setActionMsg({ type, text })}
        />
      )}

      {/* ======================================================== */}
      {/* DELETE ORDER CONFIRMATION MODAL                          */}
      {/* ======================================================== */}
      {deletingOrderId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1200,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              color: '#0f172a',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '420px',
              padding: '20px',
              textAlign: 'center',
            }}
          >
            <AlertCircle size={40} color="#dc2626" style={{ margin: '0 auto 10px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '6px' }}>Permanently Delete Order?</h3>
            <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
              Order #{deletingOrderId} will be permanently removed from MongoDB. If unfulfilled, all item stock quantities will automatically be returned to store inventory.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setDeletingOrderId(null)}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '4px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f1f5f9',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteOrder(deletingOrderId)}
                disabled={isDeletingOrder}
                style={{
                  flex: 1,
                  padding: '9px',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#fff',
                  fontWeight: 800,
                  cursor: isDeletingOrder ? 'wait' : 'pointer',
                }}
              >
                {isDeletingOrder ? 'Deleting...' : 'Yes, Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RETAIL INVOICE MODAL (COMPLETE & PRINT-READY)            */}
      {/* ======================================================== */}
      {selectedOrderForInvoice && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              color: '#0f172a',
              borderRadius: 'var(--radius-md)',
              width: '100%',
              maxWidth: '640px',
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              position: 'relative',
              border: '1px solid #cbd5e1',
            }}
          >
            {/* Modal Controls Bar (hidden during print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 18px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                position: 'sticky',
                top: 0,
                zIndex: 20,
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: '0.92rem', color: '#0f172a' }}>
                  Retail Invoice Preview
                </div>
                <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                  #{selectedOrderForInvoice.orderNumber} • ₹{selectedOrderForInvoice.grandTotal ?? selectedOrderForInvoice.totalAmount ?? 0}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const downloadUrl = `https://kanhaiya-store-backend.onrender.com/api/v1/orders/${selectedOrderForInvoice._id}/invoice`;
                    window.open(downloadUrl, '_blank');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 11px',
                    backgroundColor: '#0284c7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Download PDF"
                >
                  <Download size={14} /> PDF
                </button>
                <button
                  onClick={() => {
                    const shareText = `🧾 KANHAIYA GENERAL STORE - RETAIL INVOICE #${selectedOrderForInvoice.orderNumber}\nCustomer: ${selectedOrderForInvoice.customerName || 'Customer'}\nTotal: ₹${selectedOrderForInvoice.grandTotal ?? selectedOrderForInvoice.totalAmount ?? 0}\nStatus: ${selectedOrderForInvoice.orderStatus}\nPickup: Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, UP\nPhone: +91 9936269347`;
                    const invoiceUrl = `https://kanhaiya-store-backend.onrender.com/api/v1/orders/${selectedOrderForInvoice._id}/invoice`;
                    if (navigator.share) {
                      navigator.share({
                        title: `Invoice #${selectedOrderForInvoice.orderNumber}`,
                        text: shareText,
                        url: invoiceUrl,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(`${shareText}\n\nDownload Invoice: ${invoiceUrl}`);
                      alert('📋 Invoice details and PDF download link copied to clipboard! You can paste and share via any app.');
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 11px',
                    backgroundColor: '#4f46e5',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Share Invoice link & details"
                >
                  <Share2 size={14} /> Share
                </button>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 11px',
                    backgroundColor: '#166534',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                  title="Print Invoice"
                >
                  <Printer size={14} /> Print
                </button>
                <a
                  href={`https://wa.me/91${selectedOrderForInvoice.customerPhone || '9936269347'}?text=${encodeURIComponent(
                    `Hello ${selectedOrderForInvoice.customerName || 'Customer'}! Here is your retail invoice for Order #${selectedOrderForInvoice.orderNumber} (₹${selectedOrderForInvoice.grandTotal ?? selectedOrderForInvoice.totalAmount}) from Kanhaiya General Store: https://kanhaiya-store-backend.onrender.com/api/v1/orders/${selectedOrderForInvoice._id}/invoice`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '7px 11px',
                    backgroundColor: '#25D366',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '6px',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                  }}
                  title="Send via WhatsApp"
                >
                  <Share2 size={14} /> WhatsApp
                </a>
                <button
                  onClick={() => setSelectedOrderForInvoice(null)}
                  style={{
                    backgroundColor: '#e2e8f0',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '7px 10px',
                    cursor: 'pointer',
                    color: '#334155',
                  }}
                  title="Close Invoice"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Printable Invoice Container */}
            <div id="retail-invoice" style={{ padding: '24px', fontSize: '0.85rem' }}>
              {/* Store Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#166534', margin: '0 0 2px' }}>
                  KANHAIYA GENERAL STORE
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  Fresh Essentials & Daily Groceries
                </div>
                <div style={{ fontSize: '0.75rem', color: '#334155', marginTop: '4px' }}>
                  📍 Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat, Uttar Pradesh
                </div>
                <div style={{ fontSize: '0.72rem', color: '#174D3A', fontWeight: 600 }}>
                  FSSAI No. 12722046000057 • GSTIN: 09ANBPL4077E1Z1 • PAN: ANBPL4077E (Code: 09)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#334155' }}>
                  📞 Helpline: +91 9936269347 | ✉️ Support: kanhaiyaastore@gmail.com
                </div>
              </div>

              {/* Invoice Meta */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px', fontSize: '0.8rem' }}>
                <div>
                  <div><strong>Invoice #:</strong> {selectedOrderForInvoice.orderNumber || selectedOrderForInvoice._id}</div>
                  <div><strong>Date:</strong> {new Date(selectedOrderForInvoice.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div><strong>Status:</strong> {selectedOrderForInvoice.orderStatus}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div><strong>Billed To:</strong> {selectedOrderForInvoice.customerName || 'Customer'}</div>
                  <div><strong>Phone:</strong> +91 {selectedOrderForInvoice.customerPhone || 'N/A'}</div>
                  <div><strong>Payment:</strong> {selectedOrderForInvoice.paymentStatus === 'PAID' ? 'PAID' : 'PENDING'} ({selectedOrderForInvoice.paymentMethod})</div>
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left' }}>Item</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrderForInvoice.items?.map((item: any, idx: number) => {
                    const price = item.price ?? item.unitPrice ?? 0;
                    const qty = item.quantity || 1;
                    const sub = item.totalPrice ?? price * qty;
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px' }}>
                          <div style={{ fontWeight: 600 }}>{item.productName || item.name}</div>
                          {item.packSize && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.packSize}</div>}
                        </td>
                        <td style={{ padding: '6px 8px', textAlign: 'center' }}>{qty}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>₹{price}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>₹{sub}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Calculation */}
              <div style={{ marginLeft: 'auto', width: '220px', fontSize: '0.82rem', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>Subtotal:</span>
                  <span>₹{selectedOrderForInvoice.subtotal ?? selectedOrderForInvoice.totalAmount ?? 0}</span>
                </div>
                {selectedOrderForInvoice.discountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#16a34a' }}>
                    <span>Savings / Discount:</span>
                    <span>-₹{selectedOrderForInvoice.discountAmount}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                  <span>Pickup Handling:</span>
                  <span>₹0 (FREE)</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderTop: '2px solid #0f172a',
                    fontWeight: 900,
                    fontSize: '0.95rem'
                  }}
                >
                  <span>Grand Total:</span>
                  <span>₹{selectedOrderForInvoice.grandTotal ?? selectedOrderForInvoice.totalAmount ?? 0}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div style={{ textAlign: 'center', borderTop: '1px dashed #cbd5e1', paddingTop: '12px', fontSize: '0.72rem', color: '#64748b' }}>
                Thank you for shopping with Kanhaiya General Store!<br />
                For order support or queries, contact +91 9936269347.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Customer Order Alerts Modal */}
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        isAdmin={true}
        onUnreadCountChange={(c) => setUnreadAlertsCount(c)}
        onViewOrders={() => {
          setActiveTab('orders');
          fetchOrders();
        }}
      />
    </div>
  );
};
