'use client';

import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { SportMarket } from '@/types/sports';
import { formatVolume } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';

interface OutrightCardProps {
  market: SportMarket;
  index?: number;
  onPlaceBet?: (amount: string, tokenId: string) => Promise<void>;
}

/* ── Reusable row for a single outcome ── */
function OutcomeRow({ opt, i, onBet }: {
  opt: { name: string; prob: number; price: number; icon: string };
  i: number;
  onBet: (name: string, idx: number, side: 'home' | 'away') => void;
}) {
  const yesCents = Math.round(opt.price * 100);
  const noCents  = Math.round((1 - opt.price) * 100);

  return (
    <div
      className="flex items-center py-2"
      style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
    >
      <div className="flex flex-1 items-center gap-2.5 min-w-0 pr-2">
        {opt.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={opt.icon} alt="" className="w-7 h-7 rounded-md object-cover flex-shrink-0" />
        )}
        <span
          className="truncate"
          style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}
        >
          {opt.name}
        </span>
      </div>
      <span
        className="mr-3 w-10 text-right"
        style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}
      >
        {opt.prob}%
      </span>
      <button
        onClick={() => onBet(opt.name, i, 'home')}
        className="flex flex-col items-center justify-center rounded-lg mr-1.5 active:scale-95 transition-transform"
        style={{ width: '48px', height: '36px', background: 'rgba(0,180,80,0.18)', border: '1px solid rgba(0,200,90,0.35)' }}
      >
        <span style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: '#00C85A' }}>是</span>
        <span style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 600, color: 'rgba(0,200,90,0.8)' }}>{yesCents}%</span>
      </button>
      <button
        onClick={() => onBet(opt.name, i, 'away')}
        className="flex flex-col items-center justify-center rounded-lg active:scale-95 transition-transform"
        style={{ width: '48px', height: '36px', background: 'rgba(220,40,40,0.18)', border: '1px solid rgba(220,60,60,0.35)' }}
      >
        <span style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: '#E05050' }}>否</span>
        <span style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 600, color: 'rgba(220,60,60,0.8)' }}>{noCents}%</span>
      </button>
    </div>
  );
}
const BATCH_SIZE = 10;

export function OutrightCard({ market, index = 0, onPlaceBet }: OutrightCardProps) {
  const [confirmState, setConfirmState] = useState<{
    optionName: string;
    optionIndex: number;
    side: 'home' | 'away';
  } | null>(null);
  const [visibleCount, setVisibleCount] = useState(2);
  const cardRef = useRef<HTMLDivElement>(null);

  // Build sorted option list from rawOutcomes / rawPrices
  const options = (market.rawOutcomes || [])
    .map((name, i) => {
      const price = market.rawPrices?.[i] ?? 0.001;
      const icon = market.rawIcons?.[i] ?? '';
      return { name, prob: Math.round(price * 100), price, icon };
    })
    // Filter out Polymarket placeholder teams (e.g. "Team AG") and catch-all "Other"
    .filter(opt => !/^Team\s+[A-Z]{1,3}$/i.test(opt.name) && opt.name !== 'Other')
    .sort((a, b) => b.prob - a.prob);

  const hasMore = options.length > 2;
  const isExpanded = visibleCount > 2;
  const shownOptions = options.slice(0, visibleCount);
  const remaining = options.length - visibleCount;

  const handleShowMore = () => {
    setVisibleCount(prev => Math.min(prev + BATCH_SIZE, options.length));
  };

  const handleCollapse = () => {
    setVisibleCount(2);
    // Smooth scroll card header back into view
    requestAnimationFrame(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  };

  const handleBet = (optionName: string, optionIndex: number, side: 'home' | 'away') => {
    setConfirmState({ optionName, optionIndex, side });
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={index >= 0 ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={index >= 0 ? { delay: index * 0.06, duration: 0.3, ease: 'easeOut' } : { duration: 0 }}
        className="mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(30,18,55,0.97) 0%, rgba(18,10,35,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        {/* ─── Header: event image + title ─── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3">
          {/* Thumbnail */}
          <div
            className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {market.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={market.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              /* FIFA-style fallback icon */
              <svg viewBox="0 0 36 36" width="28" height="28" fill="none">
                <circle cx="18" cy="18" r="16" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5"/>
                <path d="M18 6 C12 6 7 11 7 18 C7 25 12 30 18 30 C24 30 29 25 29 18 C29 11 24 6 18 6 Z" fill="rgba(255,215,0,0.12)"/>
                <polygon points="18,9 20.2,15.4 27,15.4 21.4,19.4 23.6,25.8 18,21.8 12.4,25.8 14.6,19.4 9,15.4 15.8,15.4" fill="rgba(255,215,0,0.7)"/>
              </svg>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3
              className="text-white font-bold leading-tight line-clamp-2"
              style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 800 }}
            >
              {market.question}
            </h3>
          </div>
        </div>

        {/* ─── Outcome Rows ─── */}
        <div className="px-4">
          {/* Progressively revealed rows */}
          {shownOptions.map((opt, i) => (
            <OutcomeRow key={`${opt.name}-${i}`} opt={opt} i={i} onBet={handleBet} />
          ))}

          {/* Toggle buttons */}
          {hasMore && (
            <div className="flex items-center justify-center gap-3 py-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              {/* Show More button — visible when there are still hidden items */}
              {remaining > 0 && (
                <button
                  onClick={handleShowMore}
                  className="flex items-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <span style={{
                    fontFamily: 'Inter', fontSize: '12px', fontWeight: 700,
                    color: 'rgba(255,215,0,0.85)',
                  }}>
                    展开更多 ({remaining})
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,215,0,0.85)' }}>▼</span>
                </button>
              )}

              {/* Collapse button — visible when expanded beyond default 2 */}
              {isExpanded && (
                <button
                  onClick={handleCollapse}
                  className="flex items-center gap-1.5 active:scale-[0.98] transition-transform"
                >
                  <span style={{
                    fontFamily: 'Inter', fontSize: '12px', fontWeight: 700,
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                    收起
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)' }}>▲</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── Footer: volume ─── */}
        <div
          className="flex items-center px-4 py-2.5 mt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: '#00C85A' }}>
            {formatVolume(market.volume)}
          </span>
          <span style={{ fontSize: '11px', fontFamily: 'Inter', color: 'rgba(255,255,255,0.35)', marginLeft: '4px' }}>
            交易量
          </span>
        </div>
      </motion.div>

      {/* ─── Confirm Modal ─── */}
      {confirmState && (
        <ConfirmModal
          isOpen={true}
          market={{
            ...market,
            homeTeam: {
              shortName: confirmState.optionName.slice(0, 3).toUpperCase(),
              fullName: confirmState.optionName,
              displayName: confirmState.optionName,
              primaryColor: confirmState.side === 'home' ? '#00C85A' : '#E05050',
              accentColor: confirmState.side === 'home' ? '#00A040' : '#C03030',
              glowColor: confirmState.side === 'home' ? 'rgba(0,200,90,0.4)' : 'rgba(220,40,40,0.4)',
            },
            homeProbability: options[confirmState.optionIndex]?.prob ?? 0,
            homeOdds: 1 / (options[confirmState.optionIndex]?.price || 0.01),
          }}
          side={confirmState.side}
          onConfirm={async (amount) => {
            setConfirmState(null);
            if (onPlaceBet) await onPlaceBet(amount.toString(), market.polymarketConditionId || '');
          }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
