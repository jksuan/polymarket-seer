'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SportMarket } from '@/types/sports';
import { usePrivy } from '@privy-io/react-auth';
import { usePolymarketAuth } from '@/contexts/PolymarketAuthContext';
import useSWR from 'swr';
import { useTranslation, translateCountryName } from '@/i18n';

// ──────────────────────────────────────────────
// OutrightInfo: data block for the "outright" / Yes-No panel
// Passed in when clicking YES/NO on OutrightCard or BinaryOutrightCard
// ──────────────────────────────────────────────
export interface OutrightInfo {
  /** Full label shown as the main title, e.g. "2026 FIFA World Cup Winner - Spain" */
  title: string;
  /** Sub-label below title, e.g. "买入是" or "买入否" */
  directionLabel: string;
  /** Probability shown as %, e.g. 15.3 */
  probability: number;
  /** Decimal odds, e.g. 6.51 */
  odds: number;
  /** Icon color for the badge (green for YES, red for NO) */
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  /** Short badge text shown inside the circle, e.g. "是" or "否" */
  badgeText: string;
}

interface ConfirmModalProps {
  isOpen: boolean;
  market: SportMarket;
  side: 'home' | 'away' | 'draw';
  onConfirm: (amount: number, executionPrice?: number) => void;
  onCancel: () => void;
  amount?: number;
  /** When provided, renders the outright variant of the panel */
  outrightInfo?: OutrightInfo;
  /** The specific token ID being traded, needed for real-time orderbook fetching */
  tokenId?: string;
}

// ── SWR fetcher for the local /api/book proxy ──
const bookFetcher = async (url: string) => {
  const fetchUrl = url + `&_t=${Date.now()}`;
  const res = await fetch(fetchUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch orderbook');
  return res.json();
};

const PRESET_AMOUNTS = [10, 20, 50, 100, 200, 'MAX'];
export function ConfirmModal({
  isOpen,
  market,
  side,
  onConfirm,
  onCancel,
  amount: defaultAmount = 10,
  outrightInfo,
  tokenId,
}: ConfirmModalProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [inputValue, setInputValue] = useState(defaultAmount.toString());
  const [showError, setShowError] = useState(false);
  const [mounted, setMounted] = useState(false);

  const { t, locale } = useTranslation();
  const { authenticated, login } = usePrivy();
  const { usdcBalance, isRefreshingBalance } = usePolymarketAuth();

  // ── Ensure tokenId is a primitive string ──
  const actualTokenId = Array.isArray(tokenId) ? tokenId[0] : tokenId;

  // ── SWR: poll orderbook every 3s via server-side proxy (avoids GFW block) ──
  const swrKey = isOpen && actualTokenId ? `/api/book?token_id=${actualTokenId}` : null;
  const { data: bookData, isLoading: isFetchingBook } = useSWR(swrKey, bookFetcher, {
    refreshInterval: 3000,        // 3-second polling for near-real-time pricing
    revalidateOnFocus: true,
    revalidateOnMount: true,       // always fetch fresh data when panel opens
    dedupingInterval: 1000,        // allow more frequent dedup window
  });

  // ── Derive execution price (Best Ask) from orderbook data ──
  const executionPrice = (() => {
    if (!bookData || !bookData.asks || bookData.asks.length === 0) return null;
    return Math.min(...bookData.asks.map((a: any) => parseFloat(a.price)));
  })();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!market) return null;

  // ── Derive display values from either outright mode or classic match mode ──
  const isOutright = !!outrightInfo;

  const displayTitle      = isOutright ? outrightInfo!.title       : `${(side === 'home' ? market.homeTeam : side === 'draw' && market.drawTeam ? market.drawTeam : market.awayTeam).displayName}`;
  const displaySubLabel   = isOutright ? outrightInfo!.directionLabel : (side === 'home' ? '主队' : side === 'draw' ? '平局' : '客队');
  const baseOdds          = isOutright ? outrightInfo!.odds        : (side === 'home' ? market.homeOdds : side === 'draw' && market.drawOdds !== undefined ? market.drawOdds : market.awayOdds);
  const displayProbability = isOutright ? outrightInfo!.probability : (side === 'home' ? market.homeProbability : market.awayProbability);
  const primaryColor      = isOutright ? outrightInfo!.primaryColor : (side === 'home' ? market.homeTeam.primaryColor : market.awayTeam.primaryColor);
  const accentColor       = isOutright ? outrightInfo!.accentColor  : (side === 'home' ? market.homeTeam.accentColor  : market.awayTeam.accentColor);
  const glowColor         = isOutright ? outrightInfo!.glowColor    : (side === 'home' ? market.homeTeam.glowColor    : market.awayTeam.glowColor);
  const badgeText         = isOutright ? outrightInfo!.badgeText    : (side === 'home' ? market.homeTeam.shortName    : market.awayTeam.shortName);

  // Overwrite odds / profit calculations if we successfully fetched the real CLOB execution price
  const activePrice = executionPrice !== null ? executionPrice : (1 / baseOdds);
  const displayOdds = 1 / activePrice;

  const expectedReturn = (amount * displayOdds).toFixed(2);
  const profit         = ((amount * displayOdds) - amount).toFixed(2);

  const handleConfirm = () => {
    onConfirm(amount, activePrice);
  };

  const handleCancel = () => {
    onCancel();
  };

  const formatWithCommas = (val: string | number) => {
    if (val === undefined || val === null || val === '') return '';
    const parts = String(val).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end items-center">
          {/* Backdrop */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={handleCancel}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md rounded-t-[32px] p-6 pb-10 overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #120A20, #08040C)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Ambient Background Glow matching the chosen option */}
            <div 
              className="absolute -top-32 -left-32 w-64 h-64 rounded-full blur-[90px] opacity-15 pointer-events-none"
              style={{ background: primaryColor }} 
            />
            <div 
              className="absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-[90px] opacity-10 pointer-events-none"
              style={{ background: accentColor }} 
            />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-6 h-6 rounded-lg flex items-center justify-center shadow-lg"
                      style={{ background: 'rgba(173,255,47,0.15)', border: '1px solid rgba(173,255,47,0.3)' }}
                    >
                      <Zap size={14} color="#ADFF2F" fill="#ADFF2F" />
                    </div>
                    <span style={{ fontFamily: 'Outfit, Inter', fontWeight: 900, fontSize: '17px', color: '#fff', letterSpacing: '0.02em' }}>
                      {t.trade.terminal}
                    </span>
                  </div>
                  <button
                    onClick={handleCancel}
                    className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <X size={15} color="rgba(255,255,255,0.6)" />
                  </button>
                </div>

                {/* Cyberpunk Market info card */}
                <div
                  className="relative p-5 rounded-[20px] mb-5 overflow-hidden"
                  style={{
                    background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid rgba(255,255,255,0.06)`,
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02), 0 8px 32px rgba(0,0,0,0.4)'
                  }}
                >
                  {/* Glowing top line indicating team color */}
                  <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)` }} />

                  {/* Top row: badge + title + odds */}
                  <div className="flex items-start gap-3.5 mb-5 mt-1">
                    {/* Futuristic Badge */}
                    <div className="relative">
                      <div className="absolute -inset-1 rounded-full opacity-20 blur-sm" style={{ background: primaryColor }} />
                      <div
                        className={`relative flex items-center justify-center flex-shrink-0 rounded-full ${badgeText === 'DRW' ? 'w-12 h-12' : 'w-11 h-11'}`}
                        style={{
                          background: badgeText === 'DRW' ? 'rgba(100, 116, 139, 0.15)' : `${primaryColor}22`,
                          border: badgeText === 'DRW' ? '1px solid rgba(100, 116, 139, 0.3)' : `1px solid ${primaryColor}55`,
                          boxShadow: badgeText === 'DRW' ? 'inset 0 0 8px rgba(100, 116, 139, 0.2)' : `inset 0 0 10px ${primaryColor}33`,
                          fontFamily: 'Inter',
                          fontWeight: 900,
                          fontSize: '15px',
                          color: badgeText === 'DRW' ? '#64748B' : primaryColor,
                          textShadow: badgeText === 'DRW' ? 'none' : `0 0 6px ${primaryColor}88`
                        }}
                      >
                        {badgeText}
                      </div>
                    </div>

                    {/* Title + sub-label */}
                    <div className="flex-1 min-w-0 pt-0.5 flex flex-col justify-center min-h-[44px]">
                      <div
                        style={{
                          fontFamily: 'Inter',
                          fontWeight: 800,
                          fontSize: '15px',
                          color: '#ffffff',
                          lineHeight: 1.3,
                          wordBreak: 'break-word',
                          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}
                      >
                        {displayTitle}
                      </div>
                      {!isOutright && (
                        <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md self-start" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.03)' }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: primaryColor }} />
                          <span style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                            {displaySubLabel}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Division line */}
                  <div className="relative h-px w-full my-3" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />

                  {/* Unified Stats Row */}
                  <div className="flex items-center justify-between p-1">
                    <div className="flex flex-col items-center min-w-[60px]">
                      <div style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>{t.trade.bestBuyProb}</div>
                      <div className={`transition-opacity duration-300 ${isFetchingBook ? 'animate-pulse opacity-70' : 'opacity-100'}`} style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                        {(activePrice * 100).toFixed(1)}<span className="text-[11px] text-white/70 ml-[1px]">%</span>
                      </div>
                    </div>
                    
                    <div className="w-[1px] h-6 bg-white/10" />

                    <div className="flex flex-col items-center min-w-[60px]">
                      <div style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px' }}>{t.trade.odds}</div>
                      <div className={`transition-opacity duration-300 ${isFetchingBook ? 'animate-pulse opacity-70' : 'opacity-100'}`} style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                        {displayOdds.toFixed(2)}x
                      </div>
                    </div>
                    
                    <div className="w-[1px] h-6 bg-white/10" />

                    <div className="flex flex-col items-end min-w-[70px]">
                      <div style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: 'rgba(173,255,47,0.8)', textTransform: 'uppercase', marginBottom: '4px' }}>{t.trade.expectedReturn}</div>
                      <div className={`flex items-baseline gap-[1px] transition-opacity duration-300 ${isFetchingBook ? 'animate-pulse opacity-70' : 'opacity-100'}`} style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '19px', color: '#ADFF2F', textShadow: '0 0 12px rgba(173,255,47,0.3)', letterSpacing: '-0.02em' }}>
                        <span>${formatWithCommas(expectedReturn)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amount selector */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-4 px-5">
                    <div className="flex flex-col gap-1.5">
                      <span style={{ fontSize: '13px', fontFamily: 'Inter', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {t.trade.betAmount}
                      </span>
                      {authenticated && (
                        <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>
                          {isRefreshingBalance ? t.trade.walletBalance : `${t.trade.availableBalance}: $${usdcBalance}`}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-baseline justify-end gap-0.5">
                        <span style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'Inter', color: inputValue ? '#fff' : 'rgba(255,255,255,0.2)' }}>$</span>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="1"
                          value={formatWithCommas(inputValue)}
                          onChange={(e) => {
                            setShowError(false);
                            let val = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
                            if (val === '0') val = ''; // 阻止仅输入 0
                            if (val.startsWith('0') && val.length > 1 && !val.startsWith('0.')) {
                              val = val.replace(/^0+/, '');
                            }
                            const parts = val.split('.');
                            if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
                            if (parts.length === 2 && parts[1].length > 2) val = parts[0] + '.' + parts[1].slice(0, 2);
                            setInputValue(val);
                            setAmount(val ? parseFloat(val) : 0);
                          }}
                          className="bg-transparent outline-none font-black transition-colors"
                          style={{
                            width: `${Math.min(Math.max((formatWithCommas(inputValue) || '1').length, 1), 12)}ch`,
                            fontSize: '24px',
                            lineHeight: '1',
                            fontFamily: 'Inter',
                            color: inputValue ? '#fff' : 'rgba(255,255,255,0.2)',
                          }}
                        />
                      </div>
                      {(() => {
                        const maxAllowed = parseFloat(usdcBalance || '0');
                        const isBelowMin = amount < 1;
                        const isExceedingBalance = authenticated ? amount > maxAllowed : false;
                        const hasError = (inputValue !== '' && (isBelowMin || isExceedingBalance)) || showError;
                        
                        if (!hasError) return null;

                        let errorMessage = '';
                        if (authenticated && (maxAllowed < 1 || isExceedingBalance)) {
                          errorMessage = `${t.trade.insufficientBalance} $${usdcBalance || '0'}`;
                        } else if (isBelowMin) {
                          errorMessage = t.trade.minBetError;
                        }
                        
                        return (
                          <div className="flex items-center gap-1 mt-1 text-[#ff4d4f] opacity-90 animate-in fade-in slide-in-from-top-1 whitespace-nowrap">
                            <AlertTriangle size={12} strokeWidth={2.5} className="flex-shrink-0" />
                            <span style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 600 }}>
                              {errorMessage}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className={authenticated ? "grid grid-cols-6 gap-1.5" : "grid grid-cols-5 gap-1.5"}>
                    {PRESET_AMOUNTS.filter(item => authenticated || item !== 'MAX').map((item) => {
                      const isMax = item === 'MAX';
                      const numVal = isMax ? parseFloat(usdcBalance || '0') : (item as number);
                      const isActive = amount === numVal && (!isMax || numVal > 0);
                      
                      return (
                        <button
                          key={item}
                          onClick={() => {
                            setShowError(false);
                            setAmount(numVal);
                            const valStr = isMax ? (usdcBalance || '0') : numVal.toString();
                            setInputValue(valStr);
                          }}
                          className="relative py-2 rounded-lg active:scale-95 transition-all overflow-hidden"
                          style={{
                            fontFamily: 'Inter',
                            fontWeight: 800,
                            fontSize: '13px',
                            background: isActive
                              ? `linear-gradient(135deg, ${primaryColor}22, ${accentColor}11)`
                              : 'rgba(255,255,255,0.03)',
                            border: isActive ? `1.5px solid ${primaryColor}` : '1.5px solid rgba(255,255,255,0.06)',
                            color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
                            boxShadow: isActive ? `0 0 16px ${glowColor}, inset 0 0 8px ${glowColor}` : 'none',
                          }}
                        >
                          {isMax ? 'MAX' : `$${item}`}
                          {isActive && (
                            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Confirm / Login button */}
                <button
                  onClick={authenticated ? () => {
                    const maxAllowed = parseFloat(usdcBalance || '0');
                    if (amount < 1 || amount > maxAllowed) {
                      setShowError(true);
                    } else {
                      handleConfirm();
                    }
                  } : login}
                  className="relative w-full py-4 rounded-[16px] active:scale-[0.98] transition-all overflow-hidden group"
                  style={
                    authenticated 
                      ? {
                          background: 'linear-gradient(90deg, #ADFF2F 0%, #00F0FF 100%)',
                          boxShadow: '0 8px 30px rgba(173,255,47,0.3)',
                        }
                      : {
                          background: '#2469F6', // Standard Web3 connect blue
                          boxShadow: '0 4px 12px rgba(36, 105, 246, 0.3)',
                        }
                  }
                >
                  <div className={`absolute inset-0 bg-black/10 group-active:bg-black/20 transition-colors ${!authenticated && 'hidden'}`} />
                  {/* Glossy overlay only for authenticated state */}
                  {authenticated && (
                    <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/20 rounded-t-[16px] pointer-events-none" />
                  )}
                  
                  <div className="relative flex items-center justify-center gap-2">
                    <span 
                      style={{ 
                        fontFamily: 'Outfit, Inter', 
                        fontWeight: 900, 
                        fontSize: '16px', 
                        color: authenticated ? '#0D0518' : '#ffffff', 
                        letterSpacing: authenticated ? '0.03em' : '0.01em',
                        textTransform: authenticated ? 'uppercase' : 'none'
                      }}
                    >
                      {authenticated ? `${t.trade.buy} ${badgeText} $${formatWithCommas(amount)}` : 'Login'}
                    </span>
                  </div>
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-4 opacity-50">
                  <ShieldCheck size={12} fill="currentColor" color="#0D0518" className="text-white/80" />
                  <p style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 500, color: '#ffffff', letterSpacing: '0.02em' }}>
                    {t.trade.securedBy}
                  </p>
                </div>
              </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
