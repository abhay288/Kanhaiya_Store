import React, { useState, useEffect } from 'react';
import { X, Share, Play } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kanhaiya.store.customer';

export const InstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('kgs_install_banner_dismissed') === 'true';
  });

  useEffect(() => {
    // Check if running on iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as unknown as { standalone: boolean }).standalone;

    if (isIosDevice && !isInStandaloneMode) {
      setIsIOS(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('kgs_install_banner_dismissed', 'true');
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div
      style={{
        margin: '8px 16px',
        padding: '10px 14px',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #86efac',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        boxShadow: '0 2px 6px rgba(22, 101, 52, 0.08)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#15803d',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
          }}
        >
          {isIOS ? <Share size={18} /> : <Play size={18} fill="#ffffff" />}
        </div>
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#14532d', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Kanhaiya General Store App</span>
            <span style={{ fontSize: '0.65rem', background: '#22c55e', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              Official
            </span>
          </div>
          <div style={{ fontSize: '0.72rem', color: '#166534', marginTop: '2px' }}>
            {isIOS ? 'Tap Share and select "Add to Home Screen"' : 'Download on Google Play for instant counter pickup'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {!isIOS ? (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '6px 12px',
              backgroundColor: '#166534',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            <span>Google Play</span>
          </a>
        ) : (
          deferredPrompt && (
            <button
              onClick={handleInstallClick}
              style={{
                padding: '6px 12px',
                backgroundColor: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Install
            </button>
          )
        )}
        <button
          onClick={handleDismiss}
          aria-label="Close Banner"
          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
