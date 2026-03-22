'use client';

import { useEffect, useState } from 'react';

/**
 * AppLoadingScreen — full-screen loading state shown during auth hydration.
 *
 * Renders immediately on mount with CSS-only animations so users always see
 * something even before React hydration completes. No JS animation libraries.
 * 
 * Marks slow states after 15 seconds without forcing a page reload.
 */
export function AppLoadingScreen() {
  const [isHung, setIsHung] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      console.warn('[AppLoadingScreen] Auth check taking too long.');
      setIsHung(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, []);
  return (
    <>
      {/* Inline styles ensure this renders and animates even before global CSS loads */}
      <style>{`
        @keyframes ht-bar-slide {
          0%   { transform: translateX(-100%); }
          60%  { transform: translateX(0%); }
          100% { transform: translateX(100%); }
        }
        @keyframes ht-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ht-loading-bar {
          animation: ht-bar-slide 1.6s ease-in-out infinite;
        }
        .ht-loading-content {
          animation: ht-fade-in 0.35s ease-out forwards;
        }
      `}</style>

      {/* Loading bar — fixed at very top of screen */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: 'linear-gradient(90deg, #1e3a5f 0%, #0f172a 100%)',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        <div
          className="ht-loading-bar"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, #3b82f6 40%, #60a5fa 60%, transparent 100%)',
          }}
        />
      </div>

      {/* Full-screen backdrop */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #020617 0%, #0f172a 60%, #0b3b8c 100%)',
        }}
      >
        <div className="ht-loading-content" style={{ textAlign: 'center' }}>
          {/* Logo mark */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              marginBottom: '20px',
            }}
          >
            <span style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.5px' }}>
              HT
            </span>
          </div>

          {/* App name */}
          <p
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#f1f5f9',
              marginBottom: '4px',
              letterSpacing: '-0.01em',
            }}
          >
            Hi Tech Software
          </p>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '12px',
              color: isHung ? '#ef4444' : '#64748b',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {isHung ? 'Still loading. Please check your connection.' : 'Loading'}
          </p>
        </div>
      </div>
    </>
  );
}
