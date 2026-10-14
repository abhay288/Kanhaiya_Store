import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCheck, Package } from 'lucide-react';
import { apiClient } from '../../api/client';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewOrders?: () => void;
  onUnreadCountChange?: (count: number) => void;
  isAdmin?: boolean;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onViewOrders,
  onUnreadCountChange,
  isAdmin = false,
}) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'orders'>('all');

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.getNotifications(undefined, isAdmin);
      if (res.data) {
        setNotifications(res.data);
        const unread = res.data.filter((n: any) => !n.isRead).length;
        onUnreadCountChange?.(unread);
      }
    } catch {
      // Fallback notices
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications(prev => {
        const next = prev.map(n => n._id === id || n.id === id ? { ...n, isRead: true } : n);
        const unread = next.filter(n => !n.isRead).length;
        onUnreadCountChange?.(unread);
        return next;
      });
    } catch {
      // ignore
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications(prev => {
        const next = prev.map(n => ({ ...n, isRead: true }));
        onUnreadCountChange?.(0);
        return next;
      });
    } catch {
      // ignore
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const filtered = notifications.filter(n => {
    if (activeFilter === 'unread') return !n.isRead;
    if (activeFilter === 'orders') return n.orderNumber || n.orderId || n.type?.startsWith('ORDER_');
    return true;
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#fafafa',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-subtle)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                Notifications
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {unreadCount > 0 ? `${unreadCount} unread updates` : 'All caught up'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                <CheckCheck size={14} /> Read All
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '10px 20px',
            borderBottom: '1px solid var(--border)',
            backgroundColor: '#ffffff',
          }}
        >
          {(['all', 'unread', 'orders'] as const).map(tab => {
            const count =
              tab === 'all'
                ? notifications.length
                : tab === 'unread'
                ? unreadCount
                : notifications.filter(n => n.orderNumber || n.orderId).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: activeFilter === tab ? 700 : 500,
                  backgroundColor: activeFilter === tab ? 'var(--primary)' : 'var(--surface)',
                  color: activeFilter === tab ? '#ffffff' : 'var(--text-main)',
                  border: `1px solid ${activeFilter === tab ? 'var(--primary)' : 'var(--border)'}`,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {tab} ({count})
              </button>
            );
          })}
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Loading updates...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <Bell size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                No notifications here
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                You are all caught up with your orders and store alerts.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map(item => {
                const isAdminAlert = item.type === 'ADMIN_ALERT' || item.isAdmin === true;
                const isUnread = !item.isRead;
                const isOrder = Boolean(item.orderNumber || item.orderId || item.type?.startsWith('ORDER_') || isAdminAlert);

                return (
                  <div
                    key={item._id || item.id}
                    onClick={() => {
                      if (isUnread) handleMarkAsRead(item._id || item.id);
                      if (isOrder && onViewOrders) {
                        onClose();
                        onViewOrders();
                      }
                    }}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: `1px solid ${
                        isAdminAlert && isUnread
                          ? '#f87171'
                          : isUnread
                          ? 'var(--primary)'
                          : 'var(--border)'
                      }`,
                      backgroundColor:
                        isAdminAlert && isUnread
                          ? '#fff1f2'
                          : isUnread
                          ? '#f0fdf4'
                          : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          backgroundColor: isAdminAlert ? '#fee2e2' : isOrder ? '#fef3c7' : 'var(--primary-subtle)',
                          color: isAdminAlert ? '#991b1b' : isOrder ? '#92400e' : 'var(--primary)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {isAdminAlert
                          ? `🚨 Admin Alert ${item.orderNumber ? `#${item.orderNumber}` : ''}`
                          : isOrder
                          ? (item.orderNumber || 'Order Alert')
                          : (item.appName || 'Kanhaiya General Store')}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isUnread && (
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--primary)',
                            }}
                          />
                        )}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontWeight: isUnread ? 800 : 600, fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '3px' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {item.message}
                    </div>

                    {isOrder && (
                      <div style={{ marginTop: '6px', fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Package size={12} /> View order details →
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
