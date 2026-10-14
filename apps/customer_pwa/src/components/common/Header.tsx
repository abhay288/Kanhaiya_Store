import React, { useState, useEffect } from 'react';
import { Phone, Bell } from 'lucide-react';
import { apiClient } from '../../api/client';
import { NotificationsModal } from './NotificationsModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onViewOrders?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'Kanhaiya General Store', 
  subtitle = 'Fresh Essentials & Daily Groceries • Fatehpur Roshnai, Kanpur Dehat',
  onViewOrders,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(1);

  useEffect(() => {
    // Check initial unread count
    apiClient.getNotifications().then(res => {
      if (res.data) {
        const unread = res.data.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    }).catch(() => {});
  }, []);

  return (
    <>
      <header className="store-header">
        <div className="header-brand">
          <img
            src="/logo.png"
            alt="Kanhaiya General Store Logo"
            style={{
              width: '46px',
              height: '46px',
              objectFit: 'contain',
              borderRadius: '8px',
              backgroundColor: '#ffffff',
              padding: '2px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
              flexShrink: 0,
            }}
          />
          <div className="brand-text">
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Notification Bell with Live Unread Badge */}
          <button
            onClick={() => setShowNotifications(true)}
            aria-label="Notifications"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              position: 'relative',
              padding: 0,
            }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Call Store Button */}
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
        </div>
      </header>

      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onViewOrders={onViewOrders}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
};
