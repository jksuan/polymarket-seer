'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Users, Trophy, ChevronDown } from 'lucide-react';
import { SportMarket } from '@/types/sports';
import { formatVolume, formatSupporters } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';

interface OutrightCardProps {
  market: SportMarket;
  index?: number;
  onPlaceBet?: (amount: string, tokenId: string) => Promise<void>;
}

export function OutrightCard({ market, index = 0, onPlaceBet }: OutrightCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{ name: string; odds: number; prob: number } | null>(null);

  // Parse raw outcomes into sorted list
  const options = (market.rawOutcomes || []).map((name, i) => {
    const rawP = market.rawPrices?.[i] || 0.001;
    return {
      name,
      prob: Math.round(rawP * 100),
      odds: 1 / (rawP || 0.01),
    };
  }).sort((a, b) => b.prob - a.prob);

  const visibleOptions = expanded ? options : options.slice(0, 3);
  const hiddenCount = options.length > 3 ? options.length - 3 : 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden mx-4 mb-4 p-5"
        style={{
          borderRadius: '28px',
          background: 'linear-gradient(145deg, rgba(40,25,70,0.95), rgba(22,14,42,0.95))',
          border: '1px solid rgba(255,215,0,0.12)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
        }}
      >
        {/* Gold glow */}
        <div
          className="absolute -top-10 -right-10 w-36 h-36 rounded-full pointer-events-none"
          style={{ background: 'rgba(255,215,0,0.06)', filter: 'blur(50px)' }}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={15} color="#FFD700" />
              <span style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: '#FFD700', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                趣味投注
              </span>
            </div>
            {market.isHot && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(255,107,0,0.2)', border: '1px solid rgba(255,107,0,0.4)', fontSize: '9px', fontFamily: 'Inter', fontWeight: 700, color: '#FF6B00', textTransform: 'uppercase' }}
              >
                <Flame size={10} fill="#FF6B00" color="#FF6B00" /> HOT
              </span>
            )}
          </div>

          {/* Question */}
          <h3 style={{ fontFamily: 'Inter', fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '14px', lineHeight: 1.4 }}>
            {market.question}
          </h3>

          {/* Options List */}
          <div className="flex flex-col gap-1.5">
            {visibleOptions.map((opt, i) => {
              const isTop = i === 0;
              return (
                <button
                  key={opt.name}
                  onClick={() => setSelectedOption(opt)}
                  className="flex items-center justify-between p-3 rounded-2xl active:scale-[0.98] transition-transform text-left"
                  style={{
                    background: isTop ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)',
                    border: isTop ? '1px solid rgba(255,215,0,0.22)' : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '12px', color: isTop ? '#FFD700' : 'rgba(255,255,255,0.25)', width: '22px' }}>
                      #{i + 1}
                    </span>
                    <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                      {opt.name}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span style={{ fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '15px', color: isTop ? '#FFD700' : '#00F0FF' }}>
                      {opt.odds.toFixed(2)}x
                    </span>
                    <span style={{ fontFamily: 'Inter', fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                      {opt.prob}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Expand / Collapse */}
          {hiddenCount > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full mt-2 py-2 rounded-xl text-center active:scale-95 transition-transform flex items-center justify-center gap-1"
              style={{
                background: 'rgba(255,255,255,0.03)',
                fontFamily: 'Inter',
                fontSize: '11px',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {expanded ? '收起' : `查看全部 ${options.length} 个选项`}
              <ChevronDown size={13} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-1">
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00FF00', boxShadow: '0 0 6px #00FF00' }} />
              <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: '#00FF00' }}>
                {formatVolume(market.volume)}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter' }}>交易量</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={11} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {formatSupporters(market.supporters)}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirm Modal — inject selected option as home team override */}
      {selectedOption && (
        <ConfirmModal
          isOpen={true}
          market={{
            ...market,
            homeTeam: {
              shortName: selectedOption.name.slice(0, 3).toUpperCase(),
              fullName: selectedOption.name,
              displayName: selectedOption.name,
              primaryColor: '#FFD700',
              accentColor: '#FFB800',
              glowColor: 'rgba(255,215,0,0.5)',
            },
            homeOdds: selectedOption.odds,
            homeProbability: selectedOption.prob,
          }}
          side="home"
          onConfirm={async (amount) => {
            setSelectedOption(null);
            if (onPlaceBet) {
              await onPlaceBet(amount.toString(), market.polymarketConditionId || '');
            }
          }}
          onCancel={() => setSelectedOption(null)}
        />
      )}
    </>
  );
}
