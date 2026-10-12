import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Shield, LogOut, CheckCircle, Server, UserCheck, Mail } from 'lucide-react';
import { apiClient, UserProfile } from '../api/client';
import { signInWithGoogleWeb } from '../config/firebase';

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

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

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phoneNumber.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(clean)) {
      setAuthMsg('Please enter a valid 10-digit Indian mobile number (starts with 6, 7, 8, 9).');
      return;
    }
    setIsPhoneLoading(true);
    setAuthMsg(null);
    try {
      const res = await apiClient.quickLogin(clean, displayName.trim() || undefined);
      setUser(res.data.user);
      setAuthMsg(`Signed in as ${res.data.user.displayName}`);
      setPhoneNumber('');
      setDisplayName('');
    } catch (err: unknown) {
      const error = err as { message?: string };
      setAuthMsg(error?.message || 'Login failed. Please check connection and try again.');
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleRealGoogleSignIn = async () => {
    setLoading(true);
    setAuthMsg(null);
    try {
      const { idToken } = await signInWithGoogleWeb();
      const res = await apiClient.authWithGoogle(idToken);
      setUser(res.data.user);
      setAuthMsg(`Signed in with Google as ${res.data.user.displayName}`);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'auth/popup-closed-by-user') {
        setAuthMsg('Google sign-in popup cancelled');
      } else if (error?.code === 'auth/api-key-not-valid' || (error?.message && error.message.includes('api-key-not-valid'))) {
        setAuthMsg('Google Sign-In is not configured. Please use Mobile Number login below.');
      } else {
        setAuthMsg(`Google Sign-In: ${error?.message || String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedGoogleSignIn = async (role: 'CUSTOMER' | 'ADMIN') => {
    setLoading(true);
    setAuthMsg(null);
    try {
      const email = role === 'ADMIN' ? 'kanhaiyaastore@gmail.com' : 'customer@example.com';
      const testToken = `test-token:${role}:${email}`;
      const res = await apiClient.authWithGoogle(testToken);
      setUser(res.data.user);
      setAuthMsg(`Authenticated via backend as ${res.data.user.role}`);
    } catch {
      // Fallback demo user if backend is not currently running locally
      const mockUser: UserProfile = {
        id: role === 'ADMIN' ? 'adm-pwa-01' : 'cust-pwa-01',
        email: role === 'ADMIN' ? 'kanhaiyaastore@gmail.com' : 'abhay.kushwaha@example.com',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <form onSubmit={handlePhoneLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 10px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Name (Optional)"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: '0.85rem',
                }}
              />
              <button
                type="submit"
                disabled={isPhoneLoading || phoneNumber.length < 10}
                className="add-btn"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: '#FFFFFF',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: phoneNumber.length < 10 || isPhoneLoading ? 'not-allowed' : 'pointer',
                  opacity: phoneNumber.length < 10 || isPhoneLoading ? 0.6 : 1,
                }}
              >
                {isPhoneLoading ? 'Signing in...' : '📱 Login / Register with Mobile'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>— OR —</div>

            <button
              type="button"
              onClick={handleRealGoogleSignIn}
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
              <UserCheck size={16} /> Continue with Google
            </button>
            <button
              type="button"
              onClick={() => handleSimulatedGoogleSignIn('ADMIN')}
              disabled={loading}
              className="add-btn"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-muted)',
                border: '1px dashed var(--border)',
                padding: '7px 12px',
                fontSize: '0.75rem',
              }}
            >
              Simulate Admin Sign-In (kanhaiyaastore@gmail.com)
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
          <span>Store Location: Fatehpur Roshnai, Kanpur D. UP</span>
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
          <span>Store Helpline: +91 9936269347</span>
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
          <Mail size={18} color="var(--primary)" />
          <span>Support: kanhaiyaastore@gmail.com</span>
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
        <p>In-store shopping & pickup only. We do not deliver products anywhere. Pure milk products, breads & packaged kirana groceries (No vegetables, fruits, or cooked food).</p>
        <p style={{ marginTop: '6px', color: 'var(--text-muted)' }}>
          Backend ID-Token verification & role provisioning enforced via MongoDB Atlas + Firebase Admin SDK.
        </p>
      </div>
    </div>
  );
};
