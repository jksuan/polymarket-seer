'use client';

import { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Zap, Wallet } from 'lucide-react';
import { MOCK_MARKETS } from '@/lib/mockMarkets';
import { SportMarket } from '@/types/sports';
import { TeamBadge } from '@/components/ui/TeamBadge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatVolume, formatSupporters } from '@/lib/utils';

import { usePrivy } from '@privy-io/react-auth';
import { usePolymarketAuth } from '@/contexts/PolymarketAuthContext';
import { shortenAddress } from '@/lib/utils';
import { TopHeader } from '@/components/ui/TopHeader';

// We use mock markets to ensure there's always something to swipe for challenges 
const SWIPE_MARKETS = MOCK_MARKETS.slice(0, 8);

const swipeVariants = {
  enter: (dir: number) => ({
    scale: 0.85,
    opacity: 0,
    x: dir > 0 ? -400 : 400,
  }),
  center: {
    scale: 1,
    opacity: 1,
    x: 0,
  },
  exit: (dir: number) => ({
    scale: 0.85,
    opacity: 0,
    x: dir > 0 ? 400 : -400,
  }),
};

function SwipeableCard({
  market,
  onSwipeLeft,
  onSwipeRight,
  isTop,
  stackOffset,
}: {
  market: SportMarket;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  stackOffset: number;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-18, 18]);
  const homeOpacity = useTransform(x, [0, 100], [0, 1]);
  const awayOpacity = useTransform(x, [-100, 0], [1, 0]);
  const cardOpacity = useTransform(x, [-300, 0, 300], [0.6, 1, 0.6]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 40) {
      onSwipeRight();
    } else if (info.offset.x < -40) {
      onSwipeLeft();
    }
  };

  if (!isTop) {
    return (
      <div
        className="absolute inset-0 w-full pointer-events-none"
        style={{
          borderRadius: '36px',
          background: 'linear-gradient(160deg, rgba(35,18,65,0.9), rgba(18,9,36,0.9))',
          border: '1.5px solid rgba(255,255,255,0.06)',
          transform: `scale(${0.92 - stackOffset * 0.06}) translateY(${20 + stackOffset * 18}px)`,
          opacity: 0.4 - stackOffset * 0.15,
          zIndex: -1 - stackOffset,
        }}
      />
    );
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.85}
      onDragEnd={handleDragEnd}
      style={{
        x,
        rotate,
        opacity: cardOpacity,
        position: 'absolute',
        inset: 0,
        width: '100%',
        borderRadius: '36px',
        background: 'linear-gradient(160deg, rgba(40,20,70,0.97), rgba(20,10,40,0.97))',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,240,255,0.08)',
        cursor: 'grab',
        touchAction: 'none',
        overflow: 'hidden',
        zIndex: 10,
      }}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* Swipe direction overlays */}
      <motion.div
        style={{ opacity: homeOpacity }}
        className="absolute inset-0 rounded-[36px] pointer-events-none z-20 flex items-center justify-start pl-8"
      >
        <div style={{ background: 'rgba(255,107,0,0.35)', borderRadius: '36px', position: 'absolute', inset: 0 }} />
        <div style={{ background: 'linear-gradient(135deg, #FF6B00, #FF2E00)', borderRadius: '16px', padding: '8px 16px', zIndex: 1, position: 'relative' }}>
          <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '18px', color: '#fff' }}>下一场 ⏭️</span>
        </div>
      </motion.div>

      <motion.div
        style={{ opacity: awayOpacity }}
        className="absolute inset-0 rounded-[36px] pointer-events-none z-20 flex items-center justify-end pr-8"
      >
        <div style={{ background: 'rgba(0,122,255,0.35)', borderRadius: '36px', position: 'absolute', inset: 0 }} />
        <div style={{ background: 'linear-gradient(135deg, #007AFF, #00F0FF)', borderRadius: '16px', padding: '8px 16px', zIndex: 1, position: 'relative' }}>
          <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '18px', color: '#fff' }}>上一场 ⏮️</span>
        </div>
      </motion.div>

      {/* Glow blobs */}
      <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: market.homeTeam.glowColor, filter: 'blur(70px)', opacity: 0.4, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: market.awayTeam.glowColor, filter: 'blur(70px)', opacity: 0.4, pointerEvents: 'none' }} />

      {/* Card content */}
      <div className="relative z-10 flex flex-col items-center h-full p-5 pb-6" style={{ gap: '12px' }}>
        {/* Status & league */}
        <div className="flex flex-col items-center gap-2 mt-2">
          {market.status === 'live' && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ background: 'linear-gradient(135deg, #FF2E00, #FF6B00)', borderRadius: '8px', padding: '3px 12px', fontFamily: 'Inter', fontWeight: 900, fontSize: '10px', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', boxShadow: '0 0 12px rgba(255,80,0,0.5)' }}
            >
              🔴 LIVE NOW
            </motion.div>
          )}
          {market.status === 'upcoming' && (
            <div style={{ background: 'rgba(173,255,47,0.15)', border: '1px solid rgba(173,255,47,0.4)', borderRadius: '8px', padding: '3px 12px', fontFamily: 'Inter', fontWeight: 900, fontSize: '10px', color: '#ADFF2F', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {market.matchTime}
            </div>
          )}
          <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {market.leagueNameEn}
          </div>
        </div>

        {/* Teams VS */}
        <div className="w-full flex justify-between items-center" style={{ padding: '0 8px', flex: 1 }}>
          <div className="flex flex-col items-center gap-3 w-[42%]">
            <TeamBadge team={market.homeTeam} size="xl" isLive={market.status === 'live'} />
            <div className="text-center">
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>{market.homeTeam.displayName}</div>
              <div style={{ fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '26px', color: market.homeTeam.accentColor, textShadow: `0 0 16px ${market.homeTeam.glowColor}`, lineHeight: 1 }}>{market.homeOdds.toFixed(2)}x</div>
              <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{market.homeProbability}% 胜率</div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <Zap size={28} color="#ADFF2F" fill="#ADFF2F" style={{ filter: 'drop-shadow(0 0 8px #ADFF2F)' }} />
            <span style={{ fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.15)', marginTop: '4px' }}>VS</span>
          </div>

          <div className="flex flex-col items-center gap-3 w-[42%]">
            <TeamBadge team={market.awayTeam} size="xl" isLive={market.status === 'live'} />
            <div className="text-center">
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>{market.awayTeam.displayName}</div>
              <div style={{ fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '26px', color: market.awayTeam.accentColor, textShadow: `0 0 16px ${market.awayTeam.glowColor}`, lineHeight: 1 }}>{market.awayOdds.toFixed(2)}x</div>
              <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{market.awayProbability}% 胜率</div>
            </div>
          </div>
        </div>

        {/* Pool info */}
        <div className="w-full flex justify-between items-center p-4 rounded-2xl" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <div style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>流动池</div>
            <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '20px', color: '#00FF00', textShadow: '0 0 8px rgba(0,255,0,0.4)' }}>{formatVolume(market.volume)}</div>
          </div>
          <div className="text-right">
            <div style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>参与人数</div>
            <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '20px', color: '#fff' }}>{formatSupporters(market.supporters)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function ChallengePage() {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [confirmSide, setConfirmSide] = useState<'home' | 'away' | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [completedCount, setCompletedCount] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentIndex = ((page % SWIPE_MARKETS.length) + SWIPE_MARKETS.length) % SWIPE_MARKETS.length;
  const market = SWIPE_MARKETS[currentIndex];

  const goNext = () => {
    setDirection(1);
    setPage((p) => p + 1);
  };

  const goPrev = () => {
    setDirection(-1);
    setPage((p) => p - 1);
  };

  const handleConfirmSuccess = (amount: number) => {
    setBetAmount(amount);
    setConfirmSide(null);
    setCompletedCount((c) => c + 1);
    goNext();
  };

  const handleConfirmCancel = () => {
    setConfirmSide(null);
  };

  return (
    <div
      className="fixed inset-0 w-full max-w-[480px] mx-auto pb-[90px] flex flex-col overflow-hidden z-0"
      style={{ background: '#0D0518', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Global Header Injection */}
      <div className="z-30 relative">
        <TopHeader />
      </div>

      {/* Progress bar */}
      <div className="flex gap-1.5 px-4 pb-4 z-20">
        {SWIPE_MARKETS.map((_, i) => {
          const current = currentIndex;
          return (
            <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: '4px', background: 'rgba(255,255,255,0.15)' }}>
              {i < current && <div style={{ width: '100%', height: '100%', background: '#00F0FF', boxShadow: '0 0 6px #00F0FF' }} />}
              {i === current && (
                <motion.div
                  key={`prog-${page}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 8, ease: 'linear' }}
                  style={{ height: '100%', background: '#00F0FF', boxShadow: '0 0 6px #00F0FF' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Card area */}
      <main className="flex-1 flex flex-col px-4 relative" style={{ minHeight: 0 }}>
        <div className="relative flex-1" ref={cardRef}>
          {[1, 2].map((offset) => (
             market ? (
               <SwipeableCard
                 key={`stack-${offset}`}
                 market={SWIPE_MARKETS[(currentIndex + offset) % SWIPE_MARKETS.length]}
                 onSwipeLeft={() => {}}
                 onSwipeRight={() => {}}
                 isTop={false}
                 stackOffset={offset - 1}
               />
             ) : null
          ))}

          <AnimatePresence custom={direction}>
            {market && (
              <motion.div
                key={page}
                custom={direction}
                variants={swipeVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', damping: 26, stiffness: 280 }}
                className="absolute inset-0"
              >
                <SwipeableCard
                  market={market}
                  onSwipeLeft={goPrev}
                  onSwipeRight={goNext}
                  isTop={true}
                  stackOffset={0}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hint */}
        <div className="flex items-center justify-center gap-4 py-3 z-20">
          <div className="flex items-center gap-1.5">
            <div style={{ width: '24px', height: '2px', background: 'linear-gradient(to left, #FF6B00, transparent)', borderRadius: '1px' }} />
            <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>左划上一场</span>
          </div>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.4)' }}>右划下一场</span>
            <div style={{ width: '24px', height: '2px', background: 'linear-gradient(to right, #007AFF, transparent)', borderRadius: '1px' }} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-between items-center gap-3 pb-2 z-20">
          <button onClick={goPrev} className="flex items-center justify-center rounded-full active:scale-90 transition-transform flex-shrink-0" style={{ width: '56px', height: '56px', background: 'rgba(42,32,59,0.9)', border: '2px solid rgba(255,255,255,0.12)' }}>
            <ChevronLeft size={26} color="rgba(255,255,255,0.6)" />
          </button>

          <button onClick={() => setConfirmSide('home')} className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform text-center" style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #FF2E00 100%)', boxShadow: '0 8px 24px rgba(255,80,0,0.4)' }}>
            <div style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>支持 {market?.homeTeam.displayName}</div>
            <div style={{ fontFamily: 'Inter', fontSize: '24px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '2px' }}>{market?.homeOdds.toFixed(2)}x</div>
          </button>

          <button onClick={() => setConfirmSide('away')} className="flex-1 py-4 rounded-2xl active:scale-95 transition-transform text-center" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #00F0FF 100%)', boxShadow: '0 8px 24px rgba(0,180,255,0.4)' }}>
            <div style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>支持 {market?.awayTeam.displayName}</div>
            <div style={{ fontFamily: 'Inter', fontSize: '24px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '2px' }}>{market?.awayOdds.toFixed(2)}x</div>
          </button>

          <button onClick={goNext} className="flex items-center justify-center rounded-full active:scale-90 transition-transform flex-shrink-0" style={{ width: '56px', height: '56px', background: 'rgba(42,32,59,0.9)', border: '2px solid rgba(255,255,255,0.12)' }}>
            <ChevronRight size={26} color="rgba(255,255,255,0.6)" />
          </button>
        </div>
      </main>

      {/* Confirm Modal - always mounted for smooth exit animation */}
      {market && (
          <ConfirmModal
            isOpen={confirmSide !== null}
            market={market}
            side={confirmSide ?? 'home'}
            amount={betAmount}
            onConfirm={handleConfirmSuccess}
            onCancel={handleConfirmCancel}
          />
      )}
    </div>
  );
}
