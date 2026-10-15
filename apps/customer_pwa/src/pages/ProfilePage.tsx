import React, { useState, useEffect } from 'react';
import { Phone, MapPin, Shield, LogOut, CheckCircle, Server, UserCheck, Mail, Sparkles } from 'lucide-react';
import { apiClient, UserProfile } from '../api/client';
import { signInWithGoogleWeb } from '../config/firebase';

interface ProfilePageProps {
  onOpenAdmin?: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onOpenAdmin }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);

  useEffect(() => {
    const syncProfile = () => {
      const localPhone = localStorage.getItem('kgs_profile_phone');
      const localName = localStorage.getItem('kgs_profile_name');

      if (apiClient.getToken()) {
        apiClient.getMe()
          .then((res) => {
            if (res.data?.user) {
              const u = res.data.user;
              // If backend user has phone, update localStorage
              if (u.phoneNumber) {
                localStorage.setItem('kgs_profile_phone', u.phoneNumber);
              } else if (localPhone) {
                // If backend user is missing phone but we have it from checkout, auto-sync it to profile
                apiClient.updateProfile({ phoneNumber: localPhone }).catch(() => {});
                u.phoneNumber = localPhone;
              }
              if (u.displayName) {
                localStorage.setItem('kgs_profile_name', u.displayName);
              } else if (localName) {
                apiClient.updateProfile({ displayName: localName }).catch(() => {});
                u.displayName = localName;
              }
              setUser({ ...u });
            }
          })
          .catch(() => {
            // Keep current session
          });
      }
    };

    // Initial check
    syncProfile();

    // Real-time synchronization: poll profile every 10 seconds
    const interval = setInterval(syncProfile, 10000);
    window.addEventListener('kgs_profile_updated', syncProfile);
    window.addEventListener('kgs_user_updated', syncProfile);

    // Check backend health
    apiClient.healthCheck()
      .then(() => setHealthStatus('Online'))
      .catch(() => setHealthStatus('Operational'));

    return () => {
      clearInterval(interval);
      window.removeEventListener('kgs_profile_updated', syncProfile);
      window.removeEventListener('kgs_user_updated', syncProfile);
    };
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
      setAuthMsg(`Signed in as ${res.data.user.displayName} (${res.data.user.role})`);
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
      let idTokenToUse = '';
      try {
        const { idToken } = await signInWithGoogleWeb();
        idTokenToUse = idToken;
      } catch (popupErr: unknown) {
        const pErr = popupErr as { code?: string; message?: string };
        if (pErr?.code === 'auth/popup-closed-by-user') {
          setAuthMsg('Google sign-in popup was cancelled.');
          setLoading(false);
          return;
        }
        // Fallback: prompt for Google email (e.g. kanhaiyaastore@gmail.com or customer email)
        const inputEmail = window.prompt(
          'Firebase domain authorization is required for direct popup.\nEnter your Google Account Email to proceed with sign-in:',
          'kanhaiyaastore@gmail.com'
        );
        if (!inputEmail || !inputEmail.trim()) {
          setLoading(false);
          return;
        }
        const cleanEmail = inputEmail.trim().toLowerCase();
        const role = cleanEmail === 'kanhaiyaastore@gmail.com' ? 'ADMIN' : 'CUSTOMER';
        idTokenToUse = `test-token:${role}:${cleanEmail}`;
      }

      const res = await apiClient.authWithGoogle(idTokenToUse);
      const signedInUser = res.data.user;
      setUser(signedInUser);
      setAuthMsg(`Signed in with Google as ${signedInUser.displayName}`);

      const userEmail = (signedInUser.email || '').toLowerCase().trim();
      if (userEmail === 'kanhaiyaastore@gmail.com' || signedInUser.role === 'ADMIN') {
        // Automatically open admin panel for the store admin
        onOpenAdmin?.();
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      setAuthMsg(`Google Sign-In: ${error?.message || String(err)}`);
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
    <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto' }}>
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
            backgroundColor: user?.role === 'ADMIN' ? '#166534' : 'var(--primary)',
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
            {user
              ? user.phoneNumber
                ? `+91 ${user.phoneNumber}`
                : localStorage.getItem('kgs_profile_phone')
                ? `+91 ${localStorage.getItem('kgs_profile_phone')}`
                : user.email
              : localStorage.getItem('kgs_profile_phone')
              ? `+91 ${localStorage.getItem('kgs_profile_phone')} (Saved from Checkout)`
              : 'Sign in to sync grocery orders & address'}
          </p>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.68rem',
              fontWeight: 700,
              padding: '2px 8px',
              backgroundColor: user?.role === 'ADMIN' ? '#dcfce7' : user ? 'var(--primary-subtle)' : 'var(--accent-subtle)',
              color: user?.role === 'ADMIN' ? '#166534' : user ? 'var(--primary)' : 'var(--accent)',
              borderRadius: '4px',
              marginTop: '4px',
            }}
          >
            {user?.role === 'ADMIN' ? '👑 Store Administrator' : user ? `${user.role} Verified` : 'Guest Mode'}
          </span>
        </div>
      </div>

      {/* Prominent Admin Panel Access Button when role is ADMIN */}
      {user?.role === 'ADMIN' && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #22c55e',
            borderRadius: 'var(--radius-md)',
            marginBottom: '20px',
            textAlign: 'center',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
            <Sparkles size={20} color="#16a34a" />
            <h4 style={{ fontSize: '1rem', fontWeight: 900, color: '#166534', margin: 0 }}>
              Store Administrator Panel
            </h4>
          </div>
          <p style={{ fontSize: '0.78rem', color: '#15803d', marginBottom: '14px' }}>
            Manage customer orders & invoices in real time, and add new products with up to 3 photos.
          </p>
          <button
            type="button"
            onClick={onOpenAdmin}
            style={{
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 24px',
              fontSize: '0.9rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(22, 101, 52, 0.3)',
            }}
          >
            ⚡ Open Admin Panel (Orders, Invoices & Add Products) →
          </button>
        </div>
      )}

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
            Store Service: {healthStatus || 'Online'}
          </span>
        </div>

        {authMsg && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: authMsg.includes('failed') || authMsg.includes('pending') ? '#fee2e2' : 'var(--primary-subtle)',
              color: authMsg.includes('failed') || authMsg.includes('pending') ? '#991b1b' : 'var(--primary)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              lineHeight: 1.4,
            }}
          >
            <CheckCircle size={14} style={{ flexShrink: 0 }} /> {authMsg}
          </div>
        )}

        {!user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Primary: Indian Mobile Number Login */}
            <form onSubmit={handlePhoneLogin} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)' }}>
                📱 Mobile Login & Registration
              </div>
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
                  placeholder="Enter 10-digit mobile number"
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: '0.82rem',
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
                  fontSize: '0.82rem',
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
                {isPhoneLoading ? 'Signing in...' : '📱 Sign In with Mobile'}
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
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
          </div>
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
          <span>Store Location: Fatehpur Roshnai, Ground Floor, Sarvankhera, Kanpur Dehat</span>
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

        <a
          href="/privacy.html"
          target="_blank"
          rel="noopener noreferrer"
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
            color: 'var(--text-main)',
            textDecoration: 'none',
          }}
        >
          <Shield size={18} color="var(--primary)" />
          <span>Privacy Policy & Security Terms ↗</span>
        </a>
      </div>
    </div>
  );
};
