'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { SportMarket } from '@/types/sports';
import { formatVolume } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';

interface BinaryOutrightCardProps {
  market: SportMarket;
  index?: number;
  onPlaceBet?: (amount: string, tokenId: string) => Promise<void>;
}

export function BinaryOutrightCard({ market, index = 0, onPlaceBet }: BinaryOutrightCardProps) {
  const [confirmState, setConfirmState] = useState<{
    optionName: string;
    side: 'home' | 'away';
  } | null>(null);

  // market.rawPrices: array of [homePrice, awayPrice]. Assuming home is YES.
  const yesProb = market.homeProbability;
  const noProb = market.awayProbability;

  const handleBet = (optionName: string, side: 'home' | 'away') => {
    setConfirmState({ optionName, side });
  };

  // Arc math
  const r = 20;
  const circ = 2 * Math.PI * r;
  const halfCirc = circ * 0.5;
  const dashOffset = halfCirc - (yesProb / 100) * halfCirc;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
        className="mx-4 mb-3 rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, rgba(30,18,55,0.97) 0%, rgba(18,10,35,0.97) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div className="flex items-start gap-3 px-4 pt-4 pb-2">
          {/* Thumbnail */}
          <div
            className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden flex flex-col items-center justify-center mt-1"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            {market.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={market.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <svg viewBox="0 0 36 36" width="28" height="28" fill="none">
                <circle cx="18" cy="18" r="16" fill="#1a1a2e" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                <path d="M18 6 C12 6 7 11 7 18 C7 25 12 30 18 30 C24 30 29 25 29 18 C29 11 24 6 18 6 Z" fill="rgba(255,215,0,0.12)" />
              </svg>
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0 pr-2">
            <h3
              className="text-white font-bold leading-tight"
              style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 800, marginTop: '2px' }}
            >
              {market.question}
            </h3>
          </div>

          {/* Probability Arc */}
          {(() => {
            const arcR = 28;
            const arcCirc = 2 * Math.PI * arcR;
            const arcHalf = arcCirc * 0.5;
            // yes arc covers yesProb% of the half-circle
            const yesDash  = (yesProb / 100) * arcHalf;
            const noDash   = arcHalf - yesDash;
            // No arc offset: starts right after yes arc
            const noOffset = -(yesDash);
            return (
              <div className="flex-shrink-0 relative w-16 h-16 flex flex-col items-center justify-center mt-1">
                <svg width="68" height="68" viewBox="0 0 68 68" className="-rotate-180 absolute inset-0">
                  {/* Track */}
                  <circle
                    cx="34" cy="34" r={arcR}
                    stroke="rgba(255,255,255,0.08)" strokeWidth="5" fill="none"
                    strokeDasharray={`${arcHalf} ${arcCirc}`}
                    strokeLinecap="butt"
                  />
                  {/* Green YES arc */}
                  <circle
                    cx="34" cy="34" r={arcR}
                    stroke="#00C85A" strokeWidth="5" fill="none"
                    strokeDasharray={`${yesDash} ${arcCirc}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                  />
                  {/* Red NO arc */}
                  <circle
                    cx="34" cy="34" r={arcR}
                    stroke="#E05050" strokeWidth="5" fill="none"
                    strokeDasharray={`${noDash} ${arcCirc}`}
                    strokeDashoffset={noOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.5s ease-out' }}
                  />
                </svg>
                <div className="flex flex-col items-center justify-center z-10">
                  <span style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '13px', color: '#fff' }}>
                    {yesProb}%
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '-2px' }}>是</span>
                </div>
              </div>
            );
          })()}
        </div>

        {/* ─── Yes/No Buttons ─── */}
        <div className="px-4 py-2 flex items-center justify-between gap-3">
          <button
            onClick={() => handleBet('Yes', 'home')}
            className="flex-1 rounded-xl flex items-center justify-center py-2.5 active:scale-95 transition-transform"
            style={{
              background: 'rgba(0,180,80,0.18)',
              border: '1px solid rgba(0,200,90,0.3)',
            }}
          >
            <span style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 800, color: '#00C85A' }}>是</span>
          </button>
          
          <button
            onClick={() => handleBet('No', 'away')}
            className="flex-1 rounded-xl flex items-center justify-center py-2.5 active:scale-95 transition-transform"
            style={{
              background: 'rgba(220,40,40,0.18)',
              border: '1px solid rgba(220,60,60,0.3)',
            }}
          >
            <span style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 800, color: '#E05050' }}>否</span>
          </button>
        </div>

        {/* ─── Footer: Volume ─── */}
        <div
          className="flex items-center px-4 py-3 mt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span style={{ fontSize: '12px', fontFamily: 'Inter', fontWeight: 700, color: '#00C85A' }}>
            {formatVolume(market.volume)}
          </span>
          <span style={{ fontSize: '12px', fontFamily: 'Inter', color: 'rgba(255,255,255,0.4)', marginLeft: '4px' }}>
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
              shortName: confirmState.side === 'home' ? 'YES' : 'NO',
              fullName: confirmState.side === 'home' ? 'Yes' : 'No',
              displayName: confirmState.side === 'home' ? '是' : '否',
              primaryColor: confirmState.side === 'home' ? '#00C85A' : '#E05050',
              accentColor: confirmState.side === 'home' ? '#00A040' : '#C03030',
              glowColor: confirmState.side === 'home' ? 'rgba(0,200,90,0.4)' : 'rgba(220,40,40,0.4)',
            },
            homeProbability: confirmState.side === 'home' ? yesProb : noProb,
            homeOdds: confirmState.side === 'home' ? market.homeOdds : market.awayOdds,
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
