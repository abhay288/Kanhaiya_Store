import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Shield, LogOut, CheckCircle, Server, UserCheck } from 'lucide-react';
import { apiClient, UserProfile } from '../api/client';

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  useEffect(() => {
    // Check if active session exists
    if (apiClient.getToken()) {
      apiClient.getMe()
        .then((res) => {
          if (res.data?.user) {
            setUser(res.data.user);
          }
        })
        .catch(() => {
          // Token expired or invalid
          apiClient.setToken(null);
        });
    }

    // Check backend health
    apiClient.healthCheck()
      .then((res) => setHealthStatus(`Online (${res.data.database})`))
      .catch(() => setHealthStatus('Offline / Dev Mode'));
  }, []);

  const handleSimulatedGoogleSignIn = async (role: 'CUSTOMER' | 'ADMIN') => {
    setLoading(true);
    setAuthMsg(null);
    try {
      const email = role === 'ADMIN' ? 'admin@kanhaiyastore.com' : 'customer@example.com';
      const testToken = `test-token:${role}:${email}`;
      const res = await apiClient.authWithGoogle(testToken);
      setUser(res.data.user);
      setAuthMsg(`Authenticated via backend as ${res.data.user.role}`);
    } catch {
      // Fallback demo user if backend is not currently running locally
      const mockUser: UserProfile = {
        id: role === 'ADMIN' ? 'adm-pwa-01' : 'cust-pwa-01',
        email: role === 'ADMIN' ? 'admin@kanhaiyastore.com' : 'abhay.kushwaha@example.com',
        displayName: role === 'ADMIN' ? 'Store Manager' : 'Abhay Kushwaha',
        role,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      setUser(mockUser);
      setAuthMsg(`Signed in in Offline Demo Mode (${role})`);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await apiClient.logout();
    setUser(null);
    setAuthMsg('Logged out successfully');
  };

  return (
    <div style={{ padding: '16px' }}>
      {/* Profile Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
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
          {user ? user.displayName.charAt(0).toUpperCase() : 'G'}
        </div>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            {user ? user.displayName : 'Guest Customer'}
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {user ? user.email : 'Sign in to sync grocery orders & address'}
          </p>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              backgroundColor: user ? 'var(--primary-subtle)' : 'var(--accent-subtle)',
              color: user ? 'var(--primary)' : 'var(--accent)',
              borderRadius: '4px',
              marginTop: '4px',
            }}
          >
            {user ? `${user.role} Verified` : 'Guest Mode'}
          </span>
        </div>
      </div>

      {/* Backend & Auth Integration Controls */}
      <div
        style={{
          padding: '14px',
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Server size={16} color="var(--primary)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
            Backend API: {healthStatus || 'Checking...'}
          </span>
        </div>

        {authMsg && (
          <div
            style={{
              padding: '8px 10px',
              backgroundColor: 'var(--primary-subtle)',
              color: 'var(--primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircle size={14} /> {authMsg}
          </div>
        )}

        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleSimulatedGoogleSignIn('CUSTOMER')}
              disabled={loading}
              className="add-btn"
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                padding: '9px 14px',
                fontSize: '0.82rem',
              }}
            >
              <UserCheck size={16} /> Continue with Google (Customer)
            </button>
            <button
              onClick={() => handleSimulatedGoogleSignIn('ADMIN')}
              disabled={loading}
              className="add-btn"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                padding: '9px 14px',
                fontSize: '0.82rem',
              }}
            >
              Test Admin Role Authentication
            </button>
          </div>
        ) : (
          <button
            onClick={handleSignOut}
            className="add-btn"
            style={{
              backgroundColor: 'var(--error-subtle)',
              color: 'var(--error)',
              border: '1px solid #fecaca',
              padding: '8px 12px',
              fontSize: '0.8rem',
            }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        )}
      </div>

      {/* Menu Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '14px',
            backgroundColor: 'var(--surface)',
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
            backgroundColor: 'var(--surface)',
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
            backgroundColor: 'var(--surface)',
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
          backgroundColor: 'var(--primary-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.75rem',
          color: 'var(--text-main)',
          lineHeight: 1.5,
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <img src="/logo.png" alt="KGS Logo" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
          <strong>Kanhaiya General Store</strong>
        </div>
        <p>Serving our neighborhood with fresh grains, pulses, dairy & packaged groceries since 2012.</p>
        <p style={{ marginTop: '6px', color: 'var(--text-muted)' }}>
          Backend ID-Token verification & role provisioning enforced via MongoDB Atlas + Firebase Admin SDK.
        </p>
      </div>
    </div>
  );
};
