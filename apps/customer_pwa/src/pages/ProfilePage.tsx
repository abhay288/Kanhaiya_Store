import React from 'react';
import { Phone, MapPin, Shield } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  return (
    <div style={{ padding: '16px' }}>
      {/* Profile Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.2rem',
          }}
        >
          A
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Abhay Kushwaha</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>+91 98765 43210</p>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 6px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: '4px',
              marginTop: '4px',
            }}
          >
            Verified Customer
          </span>
        </div>
      </div>

      {/* Menu Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            backgroundColor: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <MapPin size={18} color="var(--primary)" />
          <span>Saved Delivery Addresses (1)</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            backgroundColor: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <Phone size={18} color="var(--primary)" />
          <span>Store Helpline: +91 9876543210</span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            backgroundColor: '#fff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <Shield size={18} color="var(--primary)" />
          <span>Privacy & Store Terms</span>
        </div>
      </div>

      {/* Store Information Note */}
      <div
        style={{
          padding: '14px',
          backgroundColor: '#f1f5f9',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          lineHeight: 1.5,
        }}
      >
        <strong>Kanhaiya General Store</strong>
        <p>Serving our neighborhood with fresh grains, pulses, dairy & packaged groceries since 2012.</p>
        <p style={{ marginTop: '6px' }}>Store Admin Workspace is securely managed within the store operator application.</p>
      </div>
    </div>
  );
};
