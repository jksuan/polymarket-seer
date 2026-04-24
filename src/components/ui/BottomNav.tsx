'use client';

import { Home, Search, Compass, User } from 'lucide-react';
import { useTranslation } from '@/i18n';

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const { t } = useTranslation();
  const isActive = (p: string) => activeTab === p;

  const navItems = [
    { path: 'home', icon: Home, label: t.nav.home },
    { path: 'search', icon: Search, label: t.nav.search },
  ];
  const rightItems = [
    { path: 'discover', icon: Compass, label: t.nav.discover },
    { path: 'profile', icon: User, label: t.nav.profile },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50"
      style={{
        background: 'rgba(13,5,24,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -8px 30px rgba(0,0,0,0.6)',
      }}
    >
      <div className="flex items-center justify-between px-2 pb-safe" style={{ height: '68px' }}>
        {/* Left items */}
        {navItems.map(({ path: p, icon: Icon, label }) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="flex flex-col items-center flex-1 py-2 transition-all active:scale-95"
            style={{
              color: isActive(p) ? '#00F0FF' : '#555',
              textShadow: isActive(p) ? '0 0 8px #00F0FF' : 'none',
            }}
          >
            <Icon size={22} strokeWidth={isActive(p) ? 2.5 : 2} />
            <span
              className="mt-1 tracking-wide"
              style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 700 }}
            >
              {label}
            </span>
          </button>
        ))}

        {/* Center Challenge Button */}
        <div className="flex flex-col items-center flex-1 relative" style={{ marginTop: '-36px' }}>
          <button
            onClick={() => onChange('challenge')}
            className="flex items-center justify-center rounded-full transition-all active:scale-90 animate-pulse"
            style={{
              width: '60px',
              height: '60px',
              background: isActive('challenge')
                ? 'linear-gradient(135deg, #00FF88 0%, #00CC66 100%)'
                : 'linear-gradient(135deg, #ADFF2F 0%, #00CC44 100%)',
              boxShadow: '0 8px 24px rgba(0,255,80,0.45), 0 0 0 4px rgba(13,5,24,1)',
              border: '3px solid rgba(13,5,24,0.8)',
            }}
          >
            {/* Trophy / Lightning icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0D0518"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
              <path d="M4 22h16" />
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
            </svg>
          </button>
          <span
            className="absolute -bottom-5"
            style={{
              fontSize: '10px',
              fontFamily: 'Inter',
              fontWeight: 900,
              color: '#ADFF2F',
              textShadow: '0 0 6px rgba(173,255,47,0.7)',
            }}
          >
            {t.nav.challenge}
          </span>
        </div>

        {/* Right items */}
        {rightItems.map(({ path: p, icon: Icon, label }) => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="flex flex-col items-center flex-1 py-2 transition-all active:scale-95"
            style={{
              color: isActive(p) ? '#00F0FF' : '#555',
              textShadow: isActive(p) ? '0 0 8px #00F0FF' : 'none',
            }}
          >
            <Icon size={22} strokeWidth={isActive(p) ? 2.5 : 2} />
            <span
              className="mt-1 tracking-wide"
              style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 700 }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
