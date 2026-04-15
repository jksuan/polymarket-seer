'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { SportMarket } from '@/types/sports';
import { ConfirmModal } from './ConfirmModal';
import { getCountryFlagUrl, getCountryShortCode } from '@/lib/countryFlags';
import { formatVolume } from '@/lib/utils';

/**
 * Parsed match data — derived from the raw SportMarket structure
 * where each match event contains 3 sub-markets (homeWin, awayWin, draw)
 */
export interface ParsedMatch {
  id: string;
  /** Event-level title, e.g. "Mexico vs. South Africa" */
  title: string;
  /** Match date string, e.g. "Thu, June 11" */
  dateLabel: string;
  /** Match time string, e.g. "上午 3:00" */
  timeLabel: string;
  /** ISO date for grouping */
  dateISO: string;
  /** Match status */
  status: 'upcoming' | 'live' | 'ended';
  /** Total event volume in USD */
  volume: number;
  /** Home team info */
  home: {
    name: string;
    shortCode: string;
    flagUrl: string;
    probability: number;   // 0-100
    /** The YES token ID for the "Home Win" sub-market */
    tokenId: string;
    /** Condition ID for the sub-market */
    conditionId: string;
  };
  /** Away team info */
  away: {
    name: string;
    shortCode: string;
    flagUrl: string;
    probability: number;
    tokenId: string;
    conditionId: string;
  };
  /** Draw info */
  draw: {
    probability: number;
    tokenId: string;
    conditionId: string;
  };
  /** Original market data for ConfirmModal */
  rawMarket: SportMarket;
}

interface MatchCardProps {
  match: ParsedMatch;
  index?: number;
  onPlaceBet?: (amount: string, tokenId: string, executionPrice?: number) => Promise<void>;
  positions?: any[];
}

export function MatchCard({ match, index = 0, onPlaceBet, positions }: MatchCardProps) {
  const [confirmSide, setConfirmSide] = useState<'home' | 'away' | 'draw' | null>(null);

  // Determine which token ID is selected
  const getSelectedTokenId = () => {
    if (confirmSide === 'home') return match.home.tokenId;
    if (confirmSide === 'away') return match.away.tokenId;
    if (confirmSide === 'draw') return match.draw.tokenId;
    return '';
  };

  // Button color scheme
  const homeColor = '#1a73e8';    // Blue
  const drawColor = '#374151';     // Gray
  const awayColor = '#dc2626';     // Red

  return (
    <>
      <motion.div
        initial={index >= 0 ? { opacity: 0, y: 16 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={index >= 0 ? { delay: index * 0.05, duration: 0.3, ease: 'easeOut' } : { duration: 0 }}
        className="relative mx-4 mb-3"
        style={{
          borderRadius: '16px',
          background: 'linear-gradient(145deg, rgba(30,20,50,0.95), rgba(18,10,32,0.95))',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div className="relative z-10 px-4 py-3">
          {/* Header row: time + volume + status */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#00F0FF',
                  letterSpacing: '0.01em',
                }}
              >
                {match.timeLabel}
              </span>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.35)',
                }}
              >
                {formatVolume(match.volume)} 交易量
              </span>
            </div>

            {/* Status Badge in Top Right */}
            <div className="flex items-center">
              {match.status === 'live' ? (
                <div 
                  className="flex items-center gap-1 px-2.5 py-[2px] rounded-full text-[11px] font-bold"
                  style={{ 
                    fontFamily: 'Inter',
                    color: '#FF2A55',
                    background: 'rgba(255, 42, 85, 0.15)',
                    border: '1px solid rgba(255, 42, 85, 0.3)',
                    boxShadow: '0 0 10px rgba(255, 42, 85, 0.25)'
                  }}
                >
                  <span className="text-[12px] animate-pulse">◉</span>
                  <span>实时</span>
                </div>
              ) : match.status === 'ended' ? (
                <div 
                  className="px-2.5 py-[2px] rounded-full text-[11px] font-bold"
                  style={{ 
                    fontFamily: 'Inter',
                    color: 'rgba(255, 255, 255, 0.5)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  已结束
                </div>
              ) : (
                <div 
                  className="px-2.5 py-[2px] rounded-full text-[11px] font-bold tracking-wide"
                  style={{ 
                    fontFamily: 'Inter',
                    color: '#00F0FF',
                    background: 'rgba(0, 240, 255, 0.1)',
                    border: '1px solid rgba(0, 240, 255, 0.25)',
                    boxShadow: '0 0 8px rgba(0, 240, 255, 0.15)'
                  }}
                >
                  未开赛
                </div>
              )}
            </div>
          </div>

          {/* Team rows */}
          <div className="flex flex-col gap-2 mb-3">
            {/* Home team row */}
            <div className="flex items-center gap-2.5">
              <img
                src={match.home.flagUrl}
                alt={match.home.name}
                width={24}
                height={18}
                style={{
                  width: '24px',
                  height: '18px',
                  objectFit: 'cover',
                  borderRadius: '2px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  flexShrink: 0,
                }}
                loading="lazy"
              />
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  flex: 1,
                }}
              >
                {match.home.name}
              </span>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                0-0
              </span>
            </div>

            {/* Away team row */}
            <div className="flex items-center gap-2.5">
              <img
                src={match.away.flagUrl}
                alt={match.away.name}
                width={24}
                height={18}
                style={{
                  width: '24px',
                  height: '18px',
                  objectFit: 'cover',
                  borderRadius: '2px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  flexShrink: 0,
                }}
                loading="lazy"
              />
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: '#fff',
                  flex: 1,
                }}
              >
                {match.away.name}
              </span>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                0-0
              </span>
            </div>
          </div>

          {/* Bet buttons: Home / Draw / Away */}
          <div className="grid grid-cols-3 gap-2">
            {/* Home Win button */}
            <button
              onClick={() => setConfirmSide('home')}
              className="py-2.5 rounded-xl active:scale-95 transition-transform text-center relative"
              style={{
                background: homeColor,
                boxShadow: `0 2px 8px ${homeColor}40`,
              }}
            >
              <div className="flex items-center justify-center gap-1">
                <span style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                  {match.home.shortCode}
                </span>
                <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 900, color: '#fff' }}>
                  {match.home.probability}%
                </span>
              </div>
              {/* Position indicator */}
              {(() => {
                const pos = positions?.find((p: any) => p.asset === match.home.tokenId && Number(p.size) > 0.0001);
                if (!pos) return null;
                return (
                  <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#ADFF2F] border border-[#0D0518]"
                    style={{ boxShadow: '0 0 4px #ADFF2F' }}
                  />
                );
              })()}
            </button>

            {/* Draw button */}
            <button
              onClick={() => setConfirmSide('draw')}
              className="py-2.5 rounded-xl active:scale-95 transition-transform text-center"
              style={{
                background: drawColor,
                boxShadow: `0 2px 8px ${drawColor}40`,
              }}
            >
              <div className="flex items-center justify-center gap-1">
                <span style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.02em' }}>
                  DRAW
                </span>
                <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 900, color: '#fff' }}>
                  {match.draw.probability}%
                </span>
              </div>
            </button>

            {/* Away Win button */}
            <button
              onClick={() => setConfirmSide('away')}
              className="py-2.5 rounded-xl active:scale-95 transition-transform text-center relative"
              style={{
                background: awayColor,
                boxShadow: `0 2px 8px ${awayColor}40`,
              }}
            >
              <div className="flex items-center justify-center gap-1">
                <span style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>
                  {match.away.shortCode}
                </span>
                <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 900, color: '#fff' }}>
                  {match.away.probability}%
                </span>
              </div>
              {/* Position indicator */}
              {(() => {
                const pos = positions?.find((p: any) => p.asset === match.away.tokenId && Number(p.size) > 0.0001);
                if (!pos) return null;
                return (
                  <div className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#ADFF2F] border border-[#0D0518]"
                    style={{ boxShadow: '0 0 4px #ADFF2F' }}
                  />
                );
              })()}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmSide !== null}
        market={match.rawMarket}
        side={confirmSide ?? 'home'}
        tokenId={getSelectedTokenId()}
        outrightInfo={{
          title: confirmSide === 'draw'
            ? `${match.home.name} vs ${match.away.name} — 平局`
            : confirmSide === 'home'
              ? `${match.home.name} 胜`
              : `${match.away.name} 胜`,
          directionLabel: confirmSide === 'draw' ? '买入平局' : confirmSide === 'home' ? `买入 ${match.home.name} 胜` : `买入 ${match.away.name} 胜`,
          probability: confirmSide === 'draw'
            ? match.draw.probability
            : confirmSide === 'home'
              ? match.home.probability
              : match.away.probability,
          odds: confirmSide === 'draw'
            ? 100 / match.draw.probability
            : confirmSide === 'home'
              ? 100 / match.home.probability
              : 100 / match.away.probability,
          primaryColor: confirmSide === 'home' ? homeColor : confirmSide === 'draw' ? '#6B7280' : awayColor,
          accentColor: confirmSide === 'home' ? '#3B82F6' : confirmSide === 'draw' ? '#9CA3AF' : '#EF4444',
          glowColor: confirmSide === 'home' ? 'rgba(26,115,232,0.4)' : confirmSide === 'draw' ? 'rgba(107,114,128,0.4)' : 'rgba(220,38,38,0.4)',
          badgeText: confirmSide === 'draw'
            ? 'DRAW'
            : confirmSide === 'home'
              ? match.home.shortCode
              : match.away.shortCode,
        }}
        onConfirm={async (amount, executionPrice) => {
          setConfirmSide(null);
          if (onPlaceBet) {
            const tokenId = getSelectedTokenId();
            await onPlaceBet(amount.toString(), tokenId, executionPrice);
          }
        }}
        onCancel={() => setConfirmSide(null)}
      />
    </>
  );
}

// ─── Helper: Parse raw API events into ParsedMatch objects ───

export function parseMatchEvents(events: any[]): ParsedMatch[] {
  const matches: ParsedMatch[] = [];

  for (const evt of events) {
    if (!evt.markets || evt.markets.length !== 3) continue;
    // Must be moneyline type
    if (!evt.markets.some((m: any) => m.sportsMarketType === 'moneyline')) continue;

    const markets = evt.markets;
    
    // Identify draw vs team markets by groupItemTitle pattern
    const drawMarket = markets.find((m: any) => 
      (m.groupItemTitle || '').toLowerCase().includes('draw')
    );
    const teamMarkets = markets.filter((m: any) => 
      !(m.groupItemTitle || '').toLowerCase().includes('draw')
    );

    if (!drawMarket || teamMarkets.length !== 2) continue;

    // Parse title to determine home vs away order
    // Title format: "Mexico vs. South Africa" or "Mexico vs South Africa"
    const titleParts = (evt.title || '').split(/\s+vs\.?\s+/i);
    const homeName = titleParts[0]?.trim() || teamMarkets[0].groupItemTitle;
    const awayName = titleParts[1]?.trim() || teamMarkets[1].groupItemTitle;

    // Match team markets to home/away based on title order
    let homeMarket = teamMarkets.find((m: any) => m.groupItemTitle === homeName);
    let awayMarket = teamMarkets.find((m: any) => m.groupItemTitle === awayName);
    
    // Fallback if names don't match exactly
    if (!homeMarket || !awayMarket) {
      homeMarket = teamMarkets[0];
      awayMarket = teamMarkets[1];
    }

    // Parse prices and token IDs
    const parsePrice = (m: any): number => {
      try {
        const prices = JSON.parse(m.outcomePrices || '[]');
        return parseFloat(prices[0]) || 0;
      } catch { return 0; }
    };

    const parseTokenId = (m: any): string => {
      try {
        const ids = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
        return Array.isArray(ids) ? ids[0] : '';
      } catch { return ''; }
    };

    // Parse match time
    const startTime = evt.startTime || homeMarket.gameStartTime || evt.eventDate;
    const matchDate = new Date(startTime);
    
    // Format date label: "Thu, June 11"
    const dateLabel = matchDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });

    // Format time label in local timezone: "上午 3:00"
    const timeLabel = matchDate.toLocaleTimeString('zh-CN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    // Date ISO for grouping — use LOCAL date (not UTC) to ensure correct grouping
    const dateISO = `${matchDate.getFullYear()}-${String(matchDate.getMonth() + 1).padStart(2, '0')}-${String(matchDate.getDate()).padStart(2, '0')}`;

    const homeProb = Number((parsePrice(homeMarket) * 100).toFixed(0));
    const awayProb = Number((parsePrice(awayMarket) * 100).toFixed(0));
    const drawProb = Number((parsePrice(drawMarket) * 100).toFixed(0));

    // Determine status
    const now = new Date().getTime();
    const matchTimeMs = matchDate.getTime();
    let matchStatus: 'upcoming' | 'live' | 'ended' = 'upcoming';
    
    if (homeMarket.closed || awayMarket.closed) {
      matchStatus = 'ended';
    } else if (now >= matchTimeMs && now < matchTimeMs + 120 * 60 * 1000) {
      // Live if current time is within 120 minutes of start time
      matchStatus = 'live';
    } else if (now >= matchTimeMs + 120 * 60 * 1000) {
      matchStatus = 'ended';
    }

    // Build a SportMarket-compatible object for ConfirmModal
    const rawMarket: SportMarket = {
      id: evt.id || `match-${Date.now()}-${Math.random()}`,
      question: evt.title,
      sport: 'matches',
      leagueCode: 'WC',
      leagueName: '世界杯 2026',
      leagueNameEn: 'FIFA World Cup',
      status: 'live',
      matchTime: timeLabel,
      matchTimeISO: startTime,
      homeTeam: {
        shortName: getCountryShortCode(homeName),
        fullName: homeName,
        displayName: homeName,
        primaryColor: '#1a73e8',
        accentColor: '#3B82F6',
        glowColor: 'rgba(26,115,232,0.4)',
      },
      awayTeam: {
        shortName: getCountryShortCode(awayName),
        fullName: awayName,
        displayName: awayName,
        primaryColor: '#dc2626',
        accentColor: '#EF4444',
        glowColor: 'rgba(220,38,38,0.4)',
      },
      drawTeam: {
        shortName: 'DRW',
        fullName: 'Draw',
        displayName: 'Draw',
        primaryColor: '#6B7280',
        accentColor: '#9CA3AF',
        glowColor: 'rgba(107,114,128,0.4)',
      },
      homeProbability: homeProb,
      awayProbability: awayProb,
      drawProbability: drawProb,
      homeOdds: homeProb > 0 ? 100 / homeProb : 99,
      awayOdds: awayProb > 0 ? 100 / awayProb : 99,
      drawOdds: drawProb > 0 ? 100 / drawProb : 99,
      volume: parseFloat(evt.volume || '0'),
      liquidity: 0,
      supporters: 0,
      isHot: parseFloat(evt.volume || '0') > 500,
      isFeatured: false,
    };

    matches.push({
      id: evt.id || rawMarket.id,
      title: evt.title,
      dateLabel,
      timeLabel,
      dateISO,
      status: matchStatus,
      volume: parseFloat(evt.volume || '0'),
      home: {
        name: homeName,
        shortCode: getCountryShortCode(homeName),
        flagUrl: getCountryFlagUrl(homeName, 40),
        probability: homeProb,
        tokenId: parseTokenId(homeMarket),
        conditionId: homeMarket.conditionId || '',
      },
      away: {
        name: awayName,
        shortCode: getCountryShortCode(awayName),
        flagUrl: getCountryFlagUrl(awayName, 40),
        probability: awayProb,
        tokenId: parseTokenId(awayMarket),
        conditionId: awayMarket.conditionId || '',
      },
      draw: {
        probability: drawProb,
        tokenId: parseTokenId(drawMarket),
        conditionId: drawMarket.conditionId || '',
      },
      rawMarket,
    });
  }

  // Sort by match date (using timestamp for correct ordering)
  matches.sort((a, b) => {
    if (a.dateISO !== b.dateISO) return a.dateISO.localeCompare(b.dateISO);
    // Sort by time using raw market matchTimeISO
    const tA = new Date(a.rawMarket.matchTimeISO || 0).getTime();
    const tB = new Date(b.rawMarket.matchTimeISO || 0).getTime();
    return tA - tB;
  });

  return matches;
}

// ─── Helper: Group matches by date ───

export interface MatchGroup {
  dateLabel: string;
  dateISO: string;
  matches: ParsedMatch[];
}

export function groupMatchesByDate(matches: ParsedMatch[]): MatchGroup[] {
  const groups: Record<string, MatchGroup> = {};
  
  for (const m of matches) {
    if (!groups[m.dateISO]) {
      groups[m.dateISO] = {
        dateLabel: m.dateLabel,
        dateISO: m.dateISO,
        matches: [],
      };
    }
    groups[m.dateISO].matches.push(m);
  }

  return Object.values(groups).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
}
