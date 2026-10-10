import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Order } from '../types';
import { repository } from '../api/productRepository';
import { LoadingState } from '../components/common/FeedbackStates';

export const OrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repository.getOrders().then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState message="Loading your grocery orders..." />;

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'delivered':
        return { bg: '#dcfce7', text: '#166534', label: 'Delivered' };
      case 'out_for_delivery':
        return { bg: '#dbeafe', text: '#1d4ed8', label: 'Out for Delivery' };
      default:
        return { bg: '#fef3c7', text: '#b45309', label: 'In Progress' };
    }
  };

  return (
    <div style={{ padding: '16px' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '6px' }}>
        My Orders
      </h2>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        Track deliveries and view previous store purchases
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {orders.map((order) => {
          const badge = getStatusColor(order.status);
          return (
            <div
              key={order.id}
              style={{
                padding: '14px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{order.orderNumber}</span>
                <span
                  style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    backgroundColor: badge.bg,
                    color: badge.text,
                  }}
                >
                  {badge.label}
                </span>
              </div>

              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
                <Clock size={13} /> {order.date}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginBottom: '8px' }}>
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                    <span>
                      {item.quantity}x {item.name} ({item.unit})
                    </span>
                    <span style={{ fontWeight: 600 }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '8px',
                  borderTop: '1px dashed var(--border)',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Paid via: <strong>{order.paymentMethod}</strong>
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                  ₹{order.totalAmount}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
