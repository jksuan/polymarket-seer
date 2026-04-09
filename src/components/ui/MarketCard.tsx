'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Users } from 'lucide-react';
import { SportMarket } from '@/types/sports';
import { TeamBadge } from './TeamBadge';
import { formatVolume, formatSupporters } from '@/lib/utils';
import { ConfirmModal } from './ConfirmModal';

interface MarketCardProps {
  market: SportMarket;
  index?: number;
  onPlaceBet?: (amount: string, tokenId: string) => Promise<void>;
}

export function MarketCard({ market, index = 0, onPlaceBet }: MarketCardProps) {
  const [confirmSide, setConfirmSide] = useState<'home' | 'away' | 'draw' | null>(null);
  const is3Way = !!(market.drawTeam && market.drawOdds !== undefined);

  const GLOW_COLORS: Record<string, string> = {
    nba: 'rgba(253,185,39,0.12)',
    ucl: 'rgba(0,240,255,0.10)',
    'premier-league': 'rgba(173,255,47,0.10)',
    'serie-a': 'rgba(0,122,255,0.10)',
    'la-liga': 'rgba(254,190,16,0.10)',
    bundesliga: 'rgba(253,225,0,0.10)',
    tennis: 'rgba(173,255,47,0.10)',
  };

  const glowBg = GLOW_COLORS[market.sport] ?? 'rgba(0,240,255,0.08)';

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.07, duration: 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden mx-4 mb-4"
        style={{
          borderRadius: '28px',
          background: 'linear-gradient(145deg, rgba(35,20,60,0.92), rgba(20,12,38,0.92))',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 12px 32px rgba(0,0,0,0.65)',
        }}
      >
        {/* Ambient glow blob */}
        <div
          className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: glowBg, filter: 'blur(40px)' }}
        />

        <div className="relative z-10 p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {market.status === 'live' && (
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                  style={{
                    display: 'inline-block',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#00FF88',
                    boxShadow: '0 0 8px #00FF88',
                  }}
                />
              )}
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: market.status === 'live' ? '#00FF88' : 'rgba(255,255,255,0.7)',
                  letterSpacing: '0.03em',
                  textTransform: 'uppercase',
                }}
              >
                {market.leagueName}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {market.isHot && (
                <span
                  className="flex items-center gap-1 px-2 py-0.5 rounded-md"
                  style={{
                    background: 'rgba(255,107,0,0.2)',
                    border: '1px solid rgba(255,107,0,0.4)',
                    fontSize: '9px',
                    fontFamily: 'Inter',
                    fontWeight: 700,
                    color: '#FF6B00',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <Flame size={10} fill="#FF6B00" color="#FF6B00" />
                  HOT
                </span>
              )}
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  color: market.status === 'live' ? '#00F0FF' : 'rgba(255,255,255,0.4)',
                }}
              >
                {market.matchTime}
              </span>
            </div>
          </div>

          {/* Team VS Row */}
          <div className="flex items-center justify-between py-2">
            {/* Home team */}
            <div className="flex flex-col items-center gap-2 w-5/12">
              <TeamBadge team={market.homeTeam} size="md" isLive={market.status === 'live'} />
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff',
                  textAlign: 'center',
                }}
              >
                {market.homeTeam.displayName}
              </span>
            </div>

            {/* Center */}
            <div className="flex flex-col items-center gap-1">
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 900,
                  fontSize: '22px',
                  fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.12)',
                }}
              >
                VS
              </span>
              {/* Probability bar */}
              <div
                className="flex overflow-hidden"
                style={{ width: '48px', height: '4px', borderRadius: '2px' }}
              >
                <div style={{ width: `${market.homeProbability}%`, background: market.homeTeam.accentColor, height: '100%' }} />
                {is3Way && market.drawTeam && (
                  <div style={{ width: `${market.drawProbability || 0}%`, background: market.drawTeam.accentColor, height: '100%' }} />
                )}
                <div style={{ width: `${market.awayProbability}%`, background: market.awayTeam.accentColor, height: '100%' }} />
              </div>
            </div>

            {/* Away team */}
            <div className="flex flex-col items-center gap-2 w-5/12">
              <TeamBadge team={market.awayTeam} size="md" isLive={market.status === 'live'} />
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#fff',
                  textAlign: 'center',
                }}
              >
                {market.awayTeam.displayName}
              </span>
            </div>
          </div>

          {/* Bet Buttons */}
          <div className={`grid gap-3 mt-4 ${is3Way ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button
              onClick={() => setConfirmSide('home')}
              className="py-3 rounded-2xl active:scale-95 transition-transform text-center flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(255,107,0,0.85) 0%, rgba(255,46,0,0.85) 100%)',
                boxShadow: '0 4px 14px rgba(255,80,0,0.25)',
              }}
            >
              <div style={{ fontFamily: 'Inter', fontSize: is3Way ? '8px' : '9px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
                {is3Way ? '主胜' : '支持'} {market.homeTeam.displayName}
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: is3Way ? '19px' : '23px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '2px' }}>
                {market.homeOdds.toFixed(2)}x
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                {market.homeProbability}%
              </div>
            </button>

            {is3Way && market.drawTeam && market.drawOdds !== undefined && (
              <button
                onClick={() => setConfirmSide('draw')}
                className="py-3 rounded-2xl active:scale-95 transition-transform text-center flex flex-col items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(160,174,192,0.85) 0%, rgba(113,128,150,0.85) 100%)',
                  boxShadow: '0 4px 14px rgba(160,174,192,0.2)',
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
                  平局 DRAW
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '19px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '2px' }}>
                  {market.drawOdds.toFixed(2)}x
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                  {market.drawProbability || 0}%
                </div>
              </button>
            )}

            <button
              onClick={() => setConfirmSide('away')}
              className="py-3 rounded-2xl active:scale-95 transition-transform text-center flex flex-col items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(0,122,255,0.85) 0%, rgba(0,240,255,0.85) 100%)',
                boxShadow: '0 4px 14px rgba(0,180,255,0.25)',
              }}
            >
              <div style={{ fontFamily: 'Inter', fontSize: is3Way ? '8px' : '9px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase' }}>
                {is3Way ? '客胜' : '支持'} {market.awayTeam.displayName}
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: is3Way ? '19px' : '23px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '2px' }}>
                {market.awayOdds.toFixed(2)}x
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: '8px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                {market.awayProbability}%
              </div>
            </button>
          </div>

          {/* Stats row */}
          <div
            className="flex items-center justify-between mt-4 pt-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-1">
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#00FF00',
                  boxShadow: '0 0 6px #00FF00',
                }}
              />
              <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: '#00FF00' }}>
                {formatVolume(market.volume)}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter' }}>
                交易量
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={11} color="rgba(255,255,255,0.4)" />
              <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
                {formatSupporters(market.supporters)}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter' }}>
                参与
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmSide !== null}
        market={market}
        side={confirmSide ?? 'home'}
        onConfirm={async (amount) => {
           setConfirmSide(null);
           if (onPlaceBet) {
               // We need a real condition logic mapping to tokens.
               // Currently we pass the polymarketConditionId as a placeholder.
               await onPlaceBet(amount.toString(), market.polymarketConditionId || "");
           }
        }}
        onCancel={() => setConfirmSide(null)}
      />
    </>
  );
}
