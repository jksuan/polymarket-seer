'use client';

import { useState } from 'react';
import { Zap, Wallet, ArrowDownToLine, Globe, Plus } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { usePolymarketAuth } from '@/contexts/PolymarketAuthContext';
import { SettingsDrawer } from '@/components/ui/SettingsDrawer';
import { DepositDrawer } from '@/components/ui/DepositDrawer';
import { LanguageDrawer } from '@/components/ui/LanguageDrawer';
import { useTranslation } from '@/i18n';
import type { Locale } from '@/i18n';

interface TopHeaderProps {
  isSticky?: boolean;
}

export function TopHeader({ isSticky = false }: TopHeaderProps = {}) {
  const { login, authenticated, logout } = usePrivy();
  const { proxyAddress, displayIdentifier, usdcBalance } = usePolymarketAuth();
  const { t, locale } = useTranslation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const LangToggle = () => (
    <button
      onClick={() => setLangOpen(true)}
      title={locale === 'zh' ? 'Switch Language' : '切换语言'}
      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all shrink-0"
    >
      <Globe size={14} className="text-[#00F0FF]" />
    </button>
  );

  return (
    <>
      <div 
        className={`flex items-center justify-between px-4 pt-4 ${
          isSticky ? "pb-3 sticky top-0 z-40" : "mb-4"
        }`}
        style={isSticky ? {
          background: "rgba(13,5,24,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)"
        } : {}}
      >
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-full flex items-center justify-center p-0.5 shadow-[0_0_10px_rgba(173,255,47,0.4)]" style={{ background: 'linear-gradient(135deg,#ADFF2F,#00F0FF)' }}>
            <div className="w-full h-full bg-[#0D0518] rounded-full flex items-center justify-center">
              <Zap size={12} fill="#ADFF2F" color="#ADFF2F" />
            </div>
          </div>
          <span style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'Inter', color: '#fff', letterSpacing: '-0.5px' }}>
            SEER<span style={{ color: '#ADFF2F' }}>.</span>SPORTS
          </span>
        </div>

        {!authenticated ? (
          // 未登录状态
          <div className="flex items-center gap-2">
            <LangToggle />
            <button
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 rounded-full active:scale-95 transition-all shadow-[0_0_12px_rgba(173,255,47,0.15)] bg-[#ADFF2F]/10 border border-[#ADFF2F]/50 text-[#ADFF2F] font-bold text-[12px]"
            >
              <Wallet size={14} />
              {t.common.login}
            </button>
          </div>
        ) : (
          // 已登录状态
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-1">
              <button
                onClick={() => setDepositOpen(true)}
                className="flex items-center h-8 bg-[#ADFF2F]/10 hover:bg-[#ADFF2F]/20 border border-[#ADFF2F]/30 rounded-full transition-all active:scale-95 overflow-hidden shadow-[0_0_12px_rgba(173,255,47,0.1)]"
              >
                <div className="px-3 flex items-center justify-center h-full">
                  <span className="text-[13px] font-black text-[#ADFF2F] tracking-wide" style={{ textShadow: "0 0 10px rgba(173,255,47,0.4)" }}>
                    ${Number(usdcBalance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="w-8 h-8 bg-[#ADFF2F] flex items-center justify-center text-[#0D0518] shrink-0 shadow-[-2px_0_8px_rgba(173,255,47,0.2)]">
                  <Plus size={15} strokeWidth={3} />
                </div>
              </button>
              
              <LangToggle />
            </div>

            <button 
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center pl-3 pr-1 border-l border-white/10 active:scale-95 transition-all outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#007AFF] flex items-center justify-center text-white font-black text-[14px] shadow-[0_0_12px_rgba(0,240,255,0.4)] shrink-0">
                {displayIdentifier[0] === '@' ? displayIdentifier[1]?.toUpperCase() || 'S' : displayIdentifier[0]?.toUpperCase() || 'S'}
              </div>
            </button>
          </div>
        )}
      </div>

      <SettingsDrawer 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        authenticated={authenticated}
        onLogout={logout}
      />
      <DepositDrawer
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        proxyAddress={proxyAddress || ""}
      />
      <LanguageDrawer
        isOpen={langOpen}
        onClose={() => setLangOpen(false)}
      />
    </>
  );
}
