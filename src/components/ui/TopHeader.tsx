'use client';

import { useState, useCallback } from 'react';
import { resolveOverlayOpen } from '@/auth/sessionOverlays';
import { useCloseOnSessionEpoch } from '@/auth/useSessionOverlays';
import { Zap, Wallet, Globe, ChevronDown, Loader2, AlertTriangle } from 'lucide-react';
import { usePolymarketAuth } from '@/contexts/PolymarketAuthContext';
import { SettingsDrawer } from '@/components/ui/SettingsDrawer';
import { DepositDrawer } from '@/components/ui/DepositDrawer';
import { WithdrawDrawer } from '@/components/ui/WithdrawDrawer';
import { FundsActionSheet } from '@/components/ui/FundsActionSheet';
import { LanguageDrawer } from '@/components/ui/LanguageDrawer';
import { useTranslation } from '@/i18n';

interface TopHeaderProps {
  isSticky?: boolean;
}

interface LangToggleProps {
  locale: string;
  onOpen: () => void;
}

function LangToggle({ locale, onOpen }: LangToggleProps) {
  return (
    <button
      onClick={onOpen}
      title={locale === 'zh' ? 'Switch Language' : '切换语言'}
      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all shrink-0"
    >
      <Globe size={14} className="text-[#00F0FF]" />
    </button>
  );
}

export function TopHeader({ isSticky = false }: TopHeaderProps = {}) {
  const {
    login,
    authenticated,
    handleLogout,
    proxyAddress,
    displayIdentifier,
    usdcBalance,
    fetchBalance,
    isInitialBalanceLoading,
    isEvmSignerReady,
    sessionEpoch,
  } = usePolymarketAuth();
  const { t, locale } = useTranslation();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [fundsSheetOpen, setFundsSheetOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const closeHeaderOverlays = useCallback(() => {
    setDepositOpen(false);
    setWithdrawOpen(false);
    setFundsSheetOpen(false);
    setSettingsOpen(false);
    setLangOpen(false);
  }, []);

  useCloseOnSessionEpoch(sessionEpoch, closeHeaderOverlays);

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
            <LangToggle locale={locale} onOpen={() => setLangOpen(true)} />
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
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!isEvmSignerReady}
                aria-disabled={!isEvmSignerReady}
                aria-haspopup="menu"
                aria-expanded={fundsSheetOpen}
                aria-label={t.header.fundsAriaLabel}
                onClick={() => {
                  if (!isEvmSignerReady) return;
                  setFundsSheetOpen(true);
                }}
                aria-busy={isInitialBalanceLoading}
                className={`flex h-8 items-center gap-1.5 rounded-full border border-[#ADFF2F]/30 bg-[#ADFF2F]/10 px-2 shadow-[0_0_12px_rgba(173,255,47,0.1)] transition-all ${
                  isEvmSignerReady ? "hover:bg-[#ADFF2F]/20 active:scale-95" : "opacity-45 cursor-not-allowed"
                }`}
              >
                {isInitialBalanceLoading ? (
                  <Loader2 className="h-[15px] w-[15px] animate-spin text-[#ADFF2F]" aria-hidden />
                ) : (
                  <span
                    className="min-w-[4.25rem] text-center text-[13px] font-black tracking-wide text-[#ADFF2F]"
                    style={{ textShadow: "0 0 10px rgba(173,255,47,0.4)" }}
                  >
                    ${Number(usdcBalance || 0).toFixed(2)}
                  </span>
                )}
                {!isInitialBalanceLoading ? (
                  <ChevronDown size={14} className="-ml-1 shrink-0 text-[#ADFF2F]/70" aria-hidden />
                ) : null}
              </button>
              
              <LangToggle locale={locale} onOpen={() => setLangOpen(true)} />
            </div>

            <button 
              onClick={() => setSettingsOpen(true)}
              className="flex items-center justify-center pl-2 pr-1 border-l border-white/10 active:scale-95 transition-all outline-none"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#007AFF] flex items-center justify-center text-white font-black text-[14px] shadow-[0_0_12px_rgba(0,240,255,0.4)] shrink-0">
                {displayIdentifier[0] === '@' ? displayIdentifier[1]?.toUpperCase() || 'S' : displayIdentifier[0]?.toUpperCase() || 'S'}
              </div>
            </button>
          </div>
        )}
      </div>

      {authenticated && !isEvmSignerReady ? (
        <div
          role="status"
          className="mx-4 mb-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-50"
        >
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs font-bold leading-snug">{t.header.evmSignerUnavailableTitle}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-white/70">
                {t.header.evmSignerUnavailableHint}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <SettingsDrawer 
        isOpen={resolveOverlayOpen(settingsOpen, authenticated)} 
        onClose={() => setSettingsOpen(false)} 
        authenticated={authenticated}
        onLogout={handleLogout}
      />
      <FundsActionSheet
        isOpen={resolveOverlayOpen(fundsSheetOpen, authenticated)}
        onClose={() => setFundsSheetOpen(false)}
        balanceUsd={usdcBalance}
        onDeposit={() => setDepositOpen(true)}
        onWithdraw={() => setWithdrawOpen(true)}
      />
      <DepositDrawer
        isOpen={resolveOverlayOpen(depositOpen, authenticated)}
        onClose={() => setDepositOpen(false)}
        proxyAddress={proxyAddress || ""}
        balanceUsd={usdcBalance}
        onBalanceRefresh={() => fetchBalance(true)}
      />
      <WithdrawDrawer
        isOpen={resolveOverlayOpen(withdrawOpen, authenticated)}
        onClose={() => setWithdrawOpen(false)}
        proxyAddress={proxyAddress || ""}
        balanceUsd={usdcBalance}
        onBalanceRefresh={() => fetchBalance(true)}
      />
      <LanguageDrawer
        isOpen={langOpen}
        onClose={() => setLangOpen(false)}
      />
    </>
  );
}
