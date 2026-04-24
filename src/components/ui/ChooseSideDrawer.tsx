'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { ParsedMatch } from '@/components/ui/MatchCard';
import { useTranslation, translateCountryName } from '@/i18n';
import { getCountryFlagUrl } from '@/lib/countryFlags';

interface ChooseSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  match: ParsedMatch | null;
  onSelectSide: (side: 'home' | 'draw' | 'away') => void;
}

function DrawerContent({ isOpen, onClose, match, onSelectSide }: ChooseSideDrawerProps) {
  const { t, locale } = useTranslation();
  const cn = (name: string) => translateCountryName(name, locale);

  if (!match) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#000000] backdrop-blur-md pointer-events-auto"
            style={{ opacity: 0.85 }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[448px] mx-auto bg-[#0D0518] rounded-t-[32px] p-6 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-safe pointer-events-auto"
            style={{ maxHeight: '85vh', overflowY: 'auto' }}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 
                  className="uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px]"
                  style={{ fontFamily: 'Outfit, Inter', fontWeight: 900, fontSize: '17px', color: '#fff', letterSpacing: '0.02em' }}
                >
                  {t.trade.chooseSide}
                </h2>
                <p className="text-[#6bff8f] text-[10px] uppercase font-bold tracking-widest mt-1">
                  {match.home && match.away ? `${cn(match.home.name)} VS ${cn(match.away.name)}` : match.title}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 active:scale-90 transition-transform"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-3 mb-4">
              {/* Home */}
              <button
                onClick={() => onSelectSide('home')}
                className="flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-all bg-gradient-to-r"
                style={{
                  backgroundImage: `linear-gradient(to right, ${match.home.style.primary}15, transparent)`,
                  border: `1px solid ${match.home.style.primary}40`,
                }}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={getCountryFlagUrl(match.home.name, 'svg')}
                    alt=""
                    className="w-[42px] h-[32px] rounded-[6px] border border-white/20 object-cover"
                  />
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-white font-bold text-lg leading-none">
                      {cn(match.home.name)} {t.discover.win}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-black text-2xl tracking-tighter">
                    {match.home.probability}%
                  </div>
                  <div
                    className="text-[12px] font-mono tracking-wider"
                    style={{ color: match.home.style.primary }}
                  >
                    {(100 / Math.max(match.home.probability, 1)).toFixed(2)}x
                  </div>
                </div>
              </button>

              {/* Draw */}
              {match.draw.probability > 0 && (
                <button
                  onClick={() => onSelectSide('draw')}
                  className="flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-all"
                  style={{
                    backgroundColor: `rgba(255,255,255,0.03)`,
                    border: `1px solid rgba(255,255,255,0.1)`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-[42px] h-[32px] rounded-[6px] bg-white/10 flex items-center justify-center text-white/60 text-xs font-black">
                      VS
                    </div>
                    <span className="text-white/80 font-bold text-lg leading-none">
                      {t.discover.drawLabel}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-black text-2xl tracking-tighter">
                      {match.draw.probability}%
                    </div>
                    <div className="text-[12px] font-mono tracking-wider text-white/50">
                      {(100 / Math.max(match.draw.probability, 1)).toFixed(2)}x
                    </div>
                  </div>
                </button>
              )}

              {/* Away */}
              <button
                onClick={() => onSelectSide('away')}
                className="flex items-center justify-between p-4 rounded-2xl active:scale-[0.98] transition-all bg-gradient-to-l"
                style={{
                  backgroundImage: `linear-gradient(to left, ${match.away.style.primary}15, transparent)`,
                  border: `1px solid ${match.away.style.primary}40`,
                }}
              >
                <div className="flex items-center gap-4">
                  <img
                    src={getCountryFlagUrl(match.away.name, 'svg')}
                    alt=""
                    className="w-[42px] h-[32px] rounded-[6px] border border-white/20 object-cover"
                  />
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="text-white font-bold text-lg leading-none">
                      {cn(match.away.name)} {t.discover.win}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-black text-2xl tracking-tighter">
                    {match.away.probability}%
                  </div>
                  <div
                    className="text-[12px] font-mono tracking-wider"
                    style={{ color: match.away.style.primary }}
                  >
                    {(100 / Math.max(match.away.probability, 1)).toFixed(2)}x
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ChooseSideDrawer(props: ChooseSideDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return createPortal(<DrawerContent {...props} />, document.body);
}
