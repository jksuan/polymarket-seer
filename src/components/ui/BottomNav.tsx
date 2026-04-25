'use client';

import { Home, Search, Compass, User } from 'lucide-react';
import { useTranslation } from '@/i18n';
import Lottie from 'lottie-react';
import footballData from '@/assets/lottie/football.json';

interface BottomNavProps {
  activeTab: string;
  onChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onChange }: BottomNavProps) {
  const { t } = useTranslation();
  const isActive = (p: string) => activeTab === p;

  const navItems = [
    { path: 'home', icon: Home, label: t.nav.home },
    { path: 'discover', icon: Compass, label: t.nav.discover },
  ];
  const rightItems = [
    { path: 'search', icon: Search, label: t.nav.search },
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
              color: isActive(p) ? '#00F0FF' : '#888',
              textShadow: isActive(p) ? '0 0 8px #00F0FF' : 'none',
            }}
          >
            <Icon size={22} strokeWidth={isActive(p) ? 2.5 : 2} />
            <span
              className="mt-1 tracking-wide"
              style={{ fontSize: '13px', fontFamily: 'Inter', fontWeight: 700 }}
            >
              {label}
            </span>
          </button>
        ))}

        <div className="flex flex-col items-center flex-1 py-2 relative">
          <button
            onClick={() => onChange('challenge')}
            className="absolute flex items-center justify-center transition-all active:scale-90"
            style={{
              top: '8px',
              width: '30px',
              height: '30px',
              background: 'transparent',
              outline: 'none'
            }}
          >
            <div className={`
              w-full h-full flex items-center justify-center transition-transform duration-300
              ${isActive('challenge') ? 'scale-110' : 'scale-100'}
            `}>
              <Lottie 
                animationData={footballData} 
                loop={true}
                style={{ 
                  width: '100%', 
                  height: '100%',
                  filter: 'brightness(1.05) saturate(1.1) drop-shadow(0 4px 6px rgba(0,0,0,0.5))'
                }}
              />
            </div>
          </button>
          {/* Spacer to push text down to align with other icons */}
          <div style={{ width: 22, height: 29 }} />
          <span
            className="mt-1 tracking-wide"
            style={{
              fontSize: '13px',
              fontFamily: 'Inter',
              fontWeight: 800,
              color: isActive('challenge') ? '#FFFFFF' : '#888',
              textShadow: isActive('challenge') ? '0 0 8px rgba(255,255,255,0.3)' : 'none',
              letterSpacing: '0.05em'
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
              color: isActive(p) ? '#00F0FF' : '#888',
              textShadow: isActive(p) ? '0 0 8px #00F0FF' : 'none',
            }}
          >
            <Icon size={22} strokeWidth={isActive(p) ? 2.5 : 2} />
            <span
              className="mt-1 tracking-wide"
              style={{ fontSize: '13px', fontFamily: 'Inter', fontWeight: 700 }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
