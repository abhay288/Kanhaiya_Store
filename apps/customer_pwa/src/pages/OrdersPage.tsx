import React, { useEffect, useState } from 'react';
import {
  Clock,
  Package,
  FileText,
  Store,
  X,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  UserCheck,
  AlertCircle,
} from 'lucide-react';
import { repository } from '../api/productRepository';
import { apiClient } from '../api/client';
import { LoadingState } from '../components/common/FeedbackStates';

interface OrderTimelineEvent {
  status: string;
  title: string;
  timestamp: string;
  notes?: string;
}

interface OrderDetail {
  id?: string;
  _id?: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfillmentMethod: string;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  items: Array<{
    name: string;
    unit: string;
    packSize?: string;
    sellingPrice?: number;
    price?: number;
    quantity: number;
    lineSubtotal?: number;
  }>;
  deliveryAddress?: {
    houseNumber: string;
    street: string;
    city: string;
    pincode: string;
  };
  pickupDetails?: {
    storeName: string;
    storeAddress: string;
    pickupInstructions: string;
  };
  timeline?: OrderTimelineEvent[];
  createdAt?: string;
  date?: string;
}

interface OrdersPageProps {
  onBrowseStore?: () => void;
  onSignIn?: () => void;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({ onBrowseStore, onSignIn }) => {
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [trackingData, setTrackingData] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const fetchOrders = async () => {
    const token = apiClient.getToken();
    if (!token) {
      setIsGuest(true);
      setOrders([]);
      setLoading(false);
      return;
    }

    setIsGuest(false);
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await repository.getOrders(token);
      setOrders(data as any);
    } catch {
      setErrorMessage('Unable to load orders. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const openTracking = async (order: OrderDetail) => {
    setSelectedOrder(order);
    setTrackingLoading(true);
    try {
      const token = apiClient.getToken() || undefined;
      const data = await repository.getOrderTracking(order.orderNumber, token);
      setTrackingData(data);
    } catch {
      // fallback to order data
      setTrackingData(null);
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderNumber: string) => {
    setDownloadingInvoice(true);
    try {
      const token = apiClient.getToken() || undefined;
      const blob = await repository.downloadInvoice(orderNumber, token);
      const isHtml = blob.type.includes('html');
      const url = window.URL.createObjectURL(blob);

      if (isHtml) {
        // Open printable invoice view directly so it is never blank
        const printWindow = window.open(url, '_blank');
        if (!printWindow) {
          const a = document.createElement('a');
          a.href = url;
          a.download = `Invoice-${orderNumber}.html`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice-${orderNumber}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch {
      alert('Unable to generate invoice at this time. Please contact store support at 9936269347.');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    switch (s) {
      case 'COMPLETED':
      case 'PICKED_UP':
      case 'DELIVERED':
        return { bg: '#dcfce7', text: '#166534', label: 'Delivered / Collected' };
      case 'OUT_FOR_DELIVERY':
        return { bg: '#e0e7ff', text: '#3730a3', label: 'Out for Delivery' };
      case 'READY_FOR_PICKUP':
        return { bg: '#dbeafe', text: '#1d4ed8', label: 'Ready for Pickup' };
      case 'PREPARING':
      case 'PACKED':
        return { bg: '#fef3c7', text: '#92400e', label: 'Preparing Order' };
      case 'CONFIRMED':
        return { bg: '#f0fdf4', text: '#15803d', label: 'Confirmed' };
      case 'CANCELLED':
        return { bg: '#fee2e2', text: '#b91c1c', label: 'Cancelled' };
      default:
        return { bg: '#f1f5f9', text: '#475569', label: 'Order Placed' };
    }
  };

  const getPaymentBadge = (paymentStatus: string, method: string) => {
    const p = (paymentStatus || '').toUpperCase();
    if (p === 'PAID') {
      return { bg: '#dcfce7', text: '#166534', label: `Paid (${method || 'Cash'})` };
    }
    return { bg: '#fef3c7', text: '#92400e', label: `Payment Pending (${method || 'COD'})` };
  };

  if (loading) return <LoadingState message="Loading your orders & tracking status..." />;

  return (
    <div style={{ padding: '16px', maxWidth: '640px', margin: '0 auto', paddingBottom: '90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#174D3A' }}>
          My Orders & Tracking
        </h1>
        <button
          onClick={fetchOrders}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#174D3A',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '16px' }}>
        Track real-time fulfillment status and download PDF invoices
      </p>

      {isGuest ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <UserCheck size={48} color="#166534" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#174D3A', marginBottom: '6px' }}>
            Sign In to View Orders
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
            Please sign in to see your in-store pickup orders and download invoices.
          </p>
          <button
            onClick={onSignIn}
            style={{
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 22px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        </div>
      ) : errorMessage ? (
        <div
          style={{
            textAlign: 'center',
            padding: '36px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <AlertCircle size={40} color="#dc2626" style={{ marginBottom: '10px' }} />
          <p style={{ fontSize: '0.85rem', color: '#991b1b', marginBottom: '14px' }}>
            {errorMessage}
          </p>
          <button
            onClick={fetchOrders}
            style={{
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 18px',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid var(--border)',
          }}
        >
          <Package size={48} color="#94a3b8" style={{ marginBottom: '12px' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#174D3A', marginBottom: '6px' }}>
            No orders yet
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '18px' }}>
            Your in-store pickup orders will appear here.
          </p>
          <button
            onClick={onBrowseStore}
            style={{
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 22px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Browse Store
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {orders.map((order) => {
            const statusBadge = getStatusBadge(order.orderStatus);
            const payBadge = getPaymentBadge(order.paymentStatus, order.paymentMethod);
            const orderDate = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : order.date || 'Recent';

            return (
              <div
                key={order.orderNumber}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#174D3A' }}>
                      {order.orderNumber}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Clock size={12} /> {orderDate} • {order.fulfillmentMethod === 'DELIVERY' ? 'Local Delivery' : 'Store Pickup'}
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      backgroundColor: statusBadge.bg,
                      color: statusBadge.text,
                    }}
                  >
                    {statusBadge.label}
                  </span>
                </div>

                {/* Items preview */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginBottom: '10px' }}>
                  {order.items.slice(0, 3).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                      <span>
                        {item.quantity}x {item.name} {item.packSize ? `(${item.packSize})` : ''}
                      </span>
                      <span style={{ fontWeight: 600 }}>₹{item.lineSubtotal ?? (item.price ?? 0) * item.quantity}</span>
                    </div>
                  ))}
                  {order.items.length > 3 && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                      + {order.items.length - 3} more items
                    </div>
                  )}
                </div>

                {/* Footer Info & Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px dashed var(--border)',
                    paddingTop: '10px',
                  }}
                >
                  <div>
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        backgroundColor: payBadge.bg,
                        color: payBadge.text,
                        display: 'inline-block',
                        marginBottom: '4px',
                      }}
                    >
                      {payBadge.label}
                    </span>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#174D3A' }}>
                      ₹{order.totalAmount}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => openTracking(order)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#DCE7DE',
                        color: '#174D3A',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      Track Order
                    </button>

                    <button
                      onClick={() => handleDownloadInvoice(order.orderNumber)}
                      disabled={downloadingInvoice}
                      style={{
                        padding: '8px 10px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #174D3A',
                        color: '#174D3A',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FileText size={14} /> PDF
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TRACKING TIMELINE MODAL */}
      {selectedOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '20px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#174D3A', margin: 0 }}>
                  Order #{selectedOrder.orderNumber}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Tracking & Fulfillment Status
                </span>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {trackingLoading ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>Loading status history...</div>
            ) : (
              <div>
                {/* Status Timeline */}
                <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#174D3A', marginBottom: '10px' }}>
                    Fulfillment Timeline
                  </div>
                  {trackingData?.timeline && trackingData.timeline.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {trackingData.timeline.map((ev: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <CheckCircle size={16} color="#16a34a" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <div style={{ fontSize: '0.78rem' }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{ev.title}</div>
                            {ev.notes && <div style={{ color: '#475569' }}>{ev.notes}</div>}
                            <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                              {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                              {new Date(ev.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Current Status: <strong>{selectedOrder.orderStatus}</strong>
                    </div>
                  )}
                </div>

                {/* Store Pickup Location Card */}
                <div style={{ fontSize: '0.8rem', padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '16px' }}>
                  <div style={{ fontWeight: 700, color: '#174D3A', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Store size={16} /> Store Pickup Location
                  </div>
                  <div>
                    <strong>Kanhaiya General Store</strong> • Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat
                    <div style={{ color: '#174D3A', marginTop: '2px', fontSize: '0.75rem' }}>
                      Collect order at store counter using order #{selectedOrder.orderNumber}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleDownloadInvoice(selectedOrder.orderNumber)}
                    disabled={downloadingInvoice}
                    style={{
                      flex: 1,
                      padding: '10px',
                      backgroundColor: '#174D3A',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <FileText size={16} />
                    {downloadingInvoice ? 'Generating PDF...' : 'Download Invoice'}
                  </button>

                  <a
                    href="https://wa.me/919936269347"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px 14px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      textDecoration: 'none',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>Store WhatsApp</span>
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
