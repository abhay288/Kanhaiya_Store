import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Package, PlusCircle, FileText, CheckCircle, 
  AlertCircle, Printer, Share2, Upload, Trash2, Image as ImageIcon, 
  Phone, Mail, MapPin, RefreshCw, X, Store
} from 'lucide-react';
import { apiClient } from '../api/client';

interface AdminDashboardPageProps {
  onBack: () => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'addProduct' | 'settings'>('orders');
  
  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add Product State
  const [productName, setProductName] = useState('');
  const [categoryName, setCategoryName] = useState('Atta & Flours');
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

  // Load orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    setActionMsg(null);
    try {
      const res = await apiClient.getAdminOrders({ limit: 50 });
      if (res.data?.items) {
        setOrders(res.data.items);
      } else {
        setOrders([]);
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      setActionMsg({ 
        type: 'error', 
        text: `Failed to load orders: ${e?.message || 'Check connection'}` 
      });
    } finally {
      setLoadingOrders(false);
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

      await apiClient.createProduct(payload);
      setProductSuccessMsg(`✅ Product "${productName}" added successfully to store catalog!`);
      // Reset form
      setProductName('');
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

  return (
    <div style={{ padding: '16px', maxWidth: '800px', margin: '0 auto', color: 'var(--text-main)' }}>
      {/* Admin Top Navigation & Header */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--primary)',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
        >
          <ArrowLeft size={18} /> Exit Admin
        </button>

        <div style={{ textAlign: 'right' }}>
          <span 
            style={{ 
              fontSize: '0.72rem', 
              fontWeight: 800, 
              backgroundColor: '#dcfce7', 
              color: '#166534', 
              padding: '3px 8px', 
              borderRadius: '6px' 
            }}
          >
            👑 Store Manager Console
          </span>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Fatehpur Roshnai, Kanpur D. UP
          </div>
        </div>
      </div>

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

      {/* Admin Tab Switcher */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr 1fr', 
          gap: '8px', 
          marginBottom: '20px' 
        }}
      >
        <button
          onClick={() => setActiveTab('orders')}
          style={{
            padding: '10px 8px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'orders' ? '2px solid var(--primary)' : '1px solid var(--border)',
            backgroundColor: activeTab === 'orders' ? 'var(--primary-subtle)' : 'var(--surface)',
            color: activeTab === 'orders' ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <FileText size={18} />
          <span>Orders & Invoices ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('addProduct')}
          style={{
            padding: '10px 8px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'addProduct' ? '2px solid var(--primary)' : '1px solid var(--border)',
            backgroundColor: activeTab === 'addProduct' ? 'var(--primary-subtle)' : 'var(--surface)',
            color: activeTab === 'addProduct' ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <PlusCircle size={18} />
          <span>+ Add Product (3 Photos)</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          style={{
            padding: '10px 8px',
            borderRadius: 'var(--radius-md)',
            border: activeTab === 'settings' ? '2px solid var(--primary)' : '1px solid var(--border)',
            backgroundColor: activeTab === 'settings' ? 'var(--primary-subtle)' : 'var(--surface)',
            color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-main)',
            fontWeight: 700,
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <Store size={18} />
          <span>Store & Stats</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: ORDERS & INVOICES                                 */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div>
          {/* Filter and Refresh Bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input
              type="text"
              placeholder="Search by order #, phone, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                fontSize: '0.82rem',
              }}
            />
            <button
              onClick={fetchOrders}
              disabled={loadingOrders}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--surface)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.8rem',
              }}
            >
              <RefreshCw size={14} className={loadingOrders ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Status Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '16px' }}>
            {['ALL', 'PENDING', 'CONFIRMED', 'PACKING', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELLED'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  border: statusFilter === st ? '1px solid var(--primary)' : '1px solid var(--border)',
                  backgroundColor: statusFilter === st ? 'var(--primary)' : 'var(--surface)',
                  color: statusFilter === st ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredOrders.map((order) => {
                const isPaid = order.paymentStatus === 'PAID';
                const isCod = order.paymentMethod === 'COD' || order.paymentMethod === 'CASH_ON_PICKUP';
                const isWhatsapp = order.paymentMethod === 'WHATSAPP_UPI';

                return (
                  <div
                    key={order._id || order.orderNumber}
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>
                            #{order.orderNumber || order._id?.slice(-6)}
                          </span>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
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
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(order.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main)' }}>
                          ₹{order.grandTotal ?? order.totalAmount ?? 0}
                        </div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: isPaid ? '#dcfce7' : '#fee2e2',
                            color: isPaid ? '#166534' : '#991b1b',
                          }}
                        >
                          {isPaid ? 'PAID' : 'PAYMENT PENDING'}
                        </span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div 
                      style={{ 
                        padding: '8px 10px', 
                        backgroundColor: '#f8fafc', 
                        borderRadius: '6px', 
                        fontSize: '0.78rem', 
                        marginBottom: '10px' 
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                        👤 {order.customerName || 'Customer'} • 📞 +91 {order.customerPhone || 'N/A'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '2px' }}>
                        Payment: {isWhatsapp ? '📲 WhatsApp UPI' : isCod ? '💵 Cash on Pickup' : order.paymentMethod}
                        {order.pickupSlot && ` • Slot: ${order.pickupSlot}`}
                      </div>
                    </div>

                    {/* Items Summary */}
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', marginBottom: '10px' }}>
                      <strong>Items ({order.items?.length || 0}):</strong>{' '}
                      {order.items?.map((it: any) => `${it.productName || it.name} (${it.quantity || 1})`).join(', ')}
                    </div>

                    {/* Action Bar */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '6px', 
                        paddingTop: '8px', 
                        borderTop: '1px solid var(--border)',
                        alignItems: 'center'
                      }}
                    >
                      <button
                        onClick={() => setSelectedOrderForInvoice(order)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '6px 10px',
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
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--surface)',
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
                          Verify WhatsApp UPI
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
                          Collect Cash (₹{order.grandTotal ?? order.totalAmount ?? 0})
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: ADD PRODUCT (WITH UP TO 3 PHOTOS)                 */}
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

          {productSuccessMsg && (
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
                onChange={(e) => setProductName(e.target.value)}
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

            {/* Category & Brand */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '4px' }}>
                  Category
                </label>
                <select
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
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
                  <strong>Store Location:</strong> Fatehpur Roshnai, Kanpur D. UP
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
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              position: 'relative',
            }}
          >
            {/* Modal Controls Bar (hidden during print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
              }}
            >
              <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#1e293b' }}>
                Invoice Preview — #{selectedOrderForInvoice.orderNumber}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    backgroundColor: '#166534',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={14} /> Print / PDF
                </button>
                <a
                  href={`https://wa.me/91${selectedOrderForInvoice.customerPhone || '9936269347'}?text=${encodeURIComponent(
                    `Hello ${selectedOrderForInvoice.customerName || 'Customer'}! Here is your retail invoice for Order #${selectedOrderForInvoice.orderNumber} (₹${selectedOrderForInvoice.grandTotal ?? selectedOrderForInvoice.totalAmount}) from Kanhaiya General Store.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    backgroundColor: '#25D366',
                    color: '#fff',
                    textDecoration: 'none',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <Share2 size={14} /> WhatsApp
                </a>
                <button
                  onClick={() => setSelectedOrderForInvoice(null)}
                  style={{
                    backgroundColor: '#e2e8f0',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
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
                  📍 Fatehpur Roshnai, Kanpur D. UP
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
    </div>
  );
};
