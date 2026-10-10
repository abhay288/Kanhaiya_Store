import React from 'react';

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading fresh essentials...' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '12px' }}>
    <div style={{
      width: '36px',
      height: '36px',
      border: '3px solid #e2e8f0',
      borderTopColor: 'var(--primary)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite'
    }} />
    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{message}</p>
    <style>{`
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ title, description, actionText, onAction }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center' }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛍️</div>
    <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>{title}</h3>
    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '280px', marginBottom: '16px' }}>{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        style={{
          padding: '8px 18px',
          backgroundColor: 'var(--primary)',
          color: '#ffffff',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 700,
          fontSize: '0.85rem',
          cursor: 'pointer'
        }}
      >
        {actionText}
      </button>
    )}
  </div>
);

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = 'Something went wrong while loading store data.', onRetry }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
    <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
    <p style={{ fontSize: '0.9rem', color: '#b91c1c', marginBottom: '12px' }}>{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        style={{
          padding: '6px 14px',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fca5a5',
          borderRadius: 'var(--radius-sm)',
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: 'pointer'
        }}
      >
        Try Again
      </button>
    )}
  </div>
);
