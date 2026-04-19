'use client';

import { useState, useCallback } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Zap, Loader2, Share2, Activity } from 'lucide-react';
import { useMatchData } from '@/hooks/useMatchData';
import { ParsedMatch } from '@/components/ui/MatchCard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { TopHeader } from '@/components/ui/TopHeader';
import { formatVolume } from '@/lib/utils';

// ═══════════════════════════════════════════════════
// 类型 & 常量
// ═══════════════════════════════════════════════════

interface ChallengePageProps {
  onPlaceBet?: (amount: string, tokenId: string, executionPrice?: number) => Promise<void>;
  positions?: any[];
}

const DRAW_COLOR = '#334155';

// ═══════════════════════════════════════════════════
// FlagBadge — 大圆圈 + 国旗 + 旋转虚线外环
// ═══════════════════════════════════════════════════

function FlagBadge({
  flagUrl,
  teamName,
  primaryColor,
  accentColor,
  glowColor,
  isLive,
}: {
  flagUrl: string;
  teamName: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  isLive: boolean;
}) {
  const outerSize = 120;
  const innerSize = 88;

  return (
    <div className="relative flex items-center justify-center" style={{ width: outerSize, height: outerSize }}>
      {/* 外层辉光 */}
      <div
        className="absolute inset-0"
        style={{ borderRadius: '50%', boxShadow: `0 0 28px ${glowColor}` }}
      />

      {/* 旋转虚线边框 — 仅 Live 比赛显示 */}
      {isLive && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{
            borderRadius: '50%',
            border: `2.5px dashed ${accentColor}`,
            opacity: 0.6,
          }}
        />
      )}

      {/* 非 Live 比赛的静态实线边框 */}
      {!isLive && (
        <div
          className="absolute inset-0"
          style={{
            borderRadius: '50%',
            border: `2.5px solid ${accentColor}55`,
          }}
        />
      )}

      {/* 内圈 — 国旗 */}
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${primaryColor}99`,
          boxShadow: `inset 0 2px 8px rgba(0,0,0,0.5), 0 4px 16px ${glowColor}`,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <img
          src={flagUrl}
          alt={teamName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SwipeableCard — 可滑动挑战卡片
// ═══════════════════════════════════════════════════

function SwipeableCard({
  match,
  onSwipeLeft,
  onSwipeRight,
  isTop,
  stackOffset,
}: {
  match: ParsedMatch;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isTop: boolean;
  stackOffset: number;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-18, 18]);
  const nextOpacity = useTransform(x, [0, 100], [0, 1]);
  const prevOpacity = useTransform(x, [-100, 0], [1, 0]);
  const cardOpacity = useTransform(x, [-300, 0, 300], [0.6, 1, 0.6]);

  const handleDragEnd = (_: unknown, info: { offset: { x: number } }) => {
    if (info.offset.x > 40) onSwipeRight();
    else if (info.offset.x < -40) onSwipeLeft();
  };

  const isLive = match.status === 'live';

  // ── 非顶层卡片：堆叠幽灵 ──
  if (!isTop) {
    return (
      <div
        className="absolute inset-0 w-full pointer-events-none"
        style={{
          borderRadius: '36px',
          background: 'linear-gradient(160deg, rgba(15,25,50,0.9), rgba(8,14,30,0.9))',
          border: '1.5px solid rgba(255,255,255,0.06)',
          transform: `scale(${0.92 - stackOffset * 0.06}) translateY(${20 + stackOffset * 18}px)`,
          opacity: 0.4 - stackOffset * 0.15,
          zIndex: -1 - stackOffset,
        }}
      />
    );
  }

  // ── 顶层可拖拽卡片 ──
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
        background: 'linear-gradient(160deg, rgba(15,25,50,0.97), rgba(8,14,30,0.97))',
        border: '2px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,240,255,0.06)',
        cursor: 'grab',
        touchAction: 'none',
        overflow: 'hidden',
        zIndex: 10,
      }}
      whileTap={{ cursor: 'grabbing' }}
    >
      {/* ── 滑动方向提示 — 右划（下一场）── */}
      <motion.div
        style={{ opacity: nextOpacity }}
        className="absolute inset-0 rounded-[36px] pointer-events-none z-20 flex items-center justify-start pl-8"
      >
        <div style={{ background: 'rgba(0,240,255,0.2)', borderRadius: '36px', position: 'absolute', inset: 0 }} />
        <div style={{ background: 'linear-gradient(135deg, #00F0FF, #007AFF)', borderRadius: '16px', padding: '8px 16px', zIndex: 1, position: 'relative' }}>
          <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '18px', color: '#fff' }}>下一场 →</span>
        </div>
      </motion.div>

      {/* ── 滑动方向提示 — 左划（上一场）── */}
      <motion.div
        style={{ opacity: prevOpacity }}
        className="absolute inset-0 rounded-[36px] pointer-events-none z-20 flex items-center justify-end pr-8"
      >
        <div style={{ background: 'rgba(255,59,48,0.2)', borderRadius: '36px', position: 'absolute', inset: 0 }} />
        <div style={{ background: 'linear-gradient(135deg, #FF3B30, #FF6B00)', borderRadius: '16px', padding: '8px 16px', zIndex: 1, position: 'relative' }}>
          <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '18px', color: '#fff' }}>← 上一场</span>
        </div>
      </motion.div>

      {/* ── 动态背景辉光 ── */}
      <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: match.home.style.glow, filter: 'blur(70px)', opacity: 0.35, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: match.away.style.glow, filter: 'blur(70px)', opacity: 0.35, pointerEvents: 'none' }} />

      {/* ── 卡片正文 ── */}
      <div className="relative z-10 flex flex-col items-center h-full p-5 pb-4" style={{ gap: '10px' }}>

        {/* 1. 顶部状态 */}
        <div className="flex flex-col items-center gap-2 mt-1">
          {isLive && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                background: 'linear-gradient(135deg, #FF2E00, #FF6B00)',
                borderRadius: '8px',
                padding: '3px 12px',
                fontFamily: 'Inter',
                fontWeight: 900,
                fontSize: '10px',
                color: '#fff',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                boxShadow: '0 0 12px rgba(255,80,0,0.5)',
              }}
            >
              🔴 LIVE NOW
            </motion.div>
          )}
          {match.status === 'upcoming' && (
            <div style={{
              background: 'rgba(173,255,47,0.15)',
              border: '1px solid rgba(173,255,47,0.4)',
              borderRadius: '8px',
              padding: '3px 12px',
              fontFamily: 'Inter',
              fontWeight: 900,
              fontSize: '10px',
              color: '#ADFF2F',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              开赛 {match.timeLabel}  ·  {match.dateLabel}
            </div>
          )}
        </div>

        {/* 2. 赛事名称 + 分组 */}
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            FIFA World Cup 2026
          </span>
          <div
            className="px-1.5 py-[1px] rounded-[4px] text-[10px] font-black"
            style={{
              background: match.isGroupStage ? 'rgba(255,215,0,0.15)' : 'rgba(173,255,47,0.15)',
              color: match.isGroupStage ? '#FFD700' : '#ADFF2F',
              border: match.isGroupStage ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(173,255,47,0.3)',
            }}
          >
            {match.isGroupStage ? `${match.group}组` : '淘汰赛'}
          </div>
        </div>

        {/* 3. 大圆圈对阵区 */}
        <div className="w-full flex justify-between items-center" style={{ padding: '0 4px', flex: 1, minHeight: 0 }}>
          {/* 主队圆圈 */}
          <div className="flex flex-col items-center gap-2 w-[40%]">
            <FlagBadge
              flagUrl={match.home.flagUrl}
              teamName={match.home.name}
              primaryColor={match.home.style.primary}
              accentColor={match.home.style.accent}
              glowColor={match.home.style.glow}
              isLive={isLive}
            />
            {/* 4. 球队名称 */}
            <div className="text-center">
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>
                {match.home.name}
              </div>
              {/* 5. 赔率 */}
              <div style={{
                fontFamily: 'Inter',
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: '26px',
                color: match.home.style.accent,
                textShadow: `0 0 16px ${match.home.style.glow}`,
                lineHeight: 1,
              }}>
                {(100 / match.home.probability).toFixed(2)}x
              </div>
              {/* 6. 胜率 */}
              <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {match.home.probability}% 胜率
              </div>
            </div>
          </div>

          {/* VS 闪电中央 */}
          <div className="flex flex-col items-center justify-center">
            <Zap size={28} color="#ADFF2F" fill="#ADFF2F" style={{ filter: 'drop-shadow(0 0 8px #ADFF2F)' }} />
            <span style={{ fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.15)', marginTop: '4px' }}>VS</span>
            {/* 平局胶囊 */}
            <div
              className="mt-3 px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>平局</div>
              <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 900, fontStyle: 'italic', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1, marginTop: '1px' }}>
                {(100 / match.draw.probability).toFixed(2)}x
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: '9px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: '1px' }}>
                {match.draw.probability}%
              </div>
            </div>
          </div>

          {/* 客队圆圈 */}
          <div className="flex flex-col items-center gap-2 w-[40%]">
            <FlagBadge
              flagUrl={match.away.flagUrl}
              teamName={match.away.name}
              primaryColor={match.away.style.primary}
              accentColor={match.away.style.accent}
              glowColor={match.away.style.glow}
              isLive={isLive}
            />
            <div className="text-center">
              <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>
                {match.away.name}
              </div>
              <div style={{
                fontFamily: 'Inter',
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: '26px',
                color: match.away.style.accent,
                textShadow: `0 0 16px ${match.away.style.glow}`,
                lineHeight: 1,
              }}>
                {(100 / match.away.probability).toFixed(2)}x
              </div>
              <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {match.away.probability}% 胜率
              </div>
            </div>
          </div>
        </div>

        {/* 7. 底部精调毛玻璃信息栏 */}
        <div 
          className="w-full flex justify-between items-center px-5 py-3.5 rounded-[20px]"
          style={{ 
            background: 'rgba(255,255,255,0.03)', 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            borderBottom: '1px solid rgba(0,0,0,0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}
        >
          {/* 交易热度 */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,255,0,0.1)', boxShadow: 'inset 0 0 8px rgba(0,255,0,0.2)' }}>
              <Activity size={16} color="#00FF00" />
            </div>
            <div>
              <div style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                市场交易池
              </div>
              <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '16px', color: '#fff', marginTop: '1px' }}>
                {formatVolume(match.volume)}
              </div>
            </div>
          </div>

          {/* 操作组 */}
          <div className="flex items-center gap-2">
            <button 
              className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform" 
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.05)' }}
              onClick={() => {
                // TODO: 分享功能 — 阶段 2
              }}
            >
              <Share2 size={16} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════
// 主页面组件
// ═══════════════════════════════════════════════════

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

export function ChallengePage({ onPlaceBet, positions }: ChallengePageProps) {
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [confirmSide, setConfirmSide] = useState<'home' | 'away' | 'draw' | null>(null);

  // ── 接入真实数据管线 ──
  const { allMatches, isLoading } = useMatchData(true);

  // 只取未结束的比赛
  const swipeMatches = allMatches.filter(m => m.status !== 'ended');

  const currentIndex = swipeMatches.length > 0
    ? ((page % swipeMatches.length) + swipeMatches.length) % swipeMatches.length
    : 0;
  const match = swipeMatches[currentIndex] || null;

  const goNext = useCallback(() => {
    setDirection(1);
    setPage(p => p + 1);
  }, []);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setPage(p => p - 1);
  }, []);

  // ── 获取选中方向的 tokenId ──
  const getSelectedTokenId = () => {
    if (!match) return '';
    if (confirmSide === 'home') return match.home.tokenId;
    if (confirmSide === 'away') return match.away.tokenId;
    if (confirmSide === 'draw') return match.draw.tokenId;
    return '';
  };

  return (
    <div
      className="fixed inset-0 w-full max-w-[480px] mx-auto pb-[90px] flex flex-col overflow-hidden z-0"
      style={{ background: '#060e1e', fontFamily: 'Inter, sans-serif' }}
    >
      {/* 全局顶部栏 */}
      <div className="z-30 relative">
        <TopHeader />
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <Loader2 size={32} className="animate-spin text-[#00F0FF]" />
          <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Loading Matches...
          </span>
        </div>
      )}

      {/* ── 无比赛 ── */}
      {!isLoading && swipeMatches.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <Zap size={40} color="#00F0FF" style={{ opacity: 0.3 }} />
          <span style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            暂无可用赛事，请稍后再来
          </span>
        </div>
      )}

      {/* ── 正常内容 ── */}
      {!isLoading && swipeMatches.length > 0 && match && (
        <>
          {/* 进度条 */}
          <div className="flex gap-1.5 px-4 pb-3 z-20">
            {swipeMatches.map((_, i) => (
              <div key={i} className="flex-1 rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.15)' }}>
                {i < currentIndex && (
                  <div style={{ width: '100%', height: '100%', background: '#00F0FF', boxShadow: '0 0 6px #00F0FF' }} />
                )}
                {i === currentIndex && (
                  <motion.div
                    key={`prog-${page}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 8, ease: 'linear' }}
                    style={{ height: '100%', background: '#00F0FF', boxShadow: '0 0 6px #00F0FF' }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* ── 卡片区域 ── */}
          <main className="flex-1 flex flex-col px-4 relative" style={{ minHeight: 0 }}>
            <div className="relative flex-1">
              {/* 背景堆叠卡 */}
              {[1, 2].map(offset => {
                const idx = (currentIndex + offset) % swipeMatches.length;
                const stackMatch = swipeMatches[idx];
                return stackMatch ? (
                  <SwipeableCard
                    key={`stack-${offset}`}
                    match={stackMatch}
                    onSwipeLeft={() => {}}
                    onSwipeRight={() => {}}
                    isTop={false}
                    stackOffset={offset - 1}
                  />
                ) : null;
              })}

              {/* 顶层可交互卡 */}
              <AnimatePresence custom={direction}>
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
                    match={match}
                    onSwipeLeft={goPrev}
                    onSwipeRight={goNext}
                    isTop={true}
                    stackOffset={0}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 滑动提示文字 */}
            <div className="flex items-center justify-center gap-4 py-2 z-20">
              <div className="flex items-center gap-1.5">
                <div style={{ width: '24px', height: '2px', background: 'linear-gradient(to left, #FF3B30, transparent)', borderRadius: '1px' }} />
                <span style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>左划上一场</span>
              </div>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }} />
              <div className="flex items-center gap-1.5">
                <span style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.3)' }}>右划下一场</span>
                <div style={{ width: '24px', height: '2px', background: 'linear-gradient(to right, #00F0FF, transparent)', borderRadius: '1px' }} />
              </div>
            </div>

            {/* ── 底部操作按钮区 ── */}
            <div className="flex justify-between items-center gap-3 pb-4 z-20">
              {/* 上一场 */}
              <button
                onClick={goPrev}
                className="flex items-center justify-center rounded-full active:scale-90 transition-transform flex-shrink-0"
                style={{ width: '56px', height: '56px', background: 'rgba(15,25,50,0.9)', border: '2px solid rgba(255,255,255,0.12)' }}
              >
                <ChevronLeft size={24} color="rgba(255,255,255,0.6)" />
              </button>

              {/* 主队胜 */}
              <button
                onClick={() => setConfirmSide('home')}
                className="flex flex-1 flex-col justify-center items-center rounded-2xl active:scale-95 transition-transform text-center"
                style={{
                  height: '56px',
                  background: `linear-gradient(135deg, ${match.home.style.primary}, ${match.home.style.accent})`,
                  boxShadow: `0 8px 24px ${match.home.style.glow}`,
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
                  支持 {match.home.shortCode}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '1px' }}>
                  {(100 / match.home.probability).toFixed(2)}x
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', marginTop: '2px' }}>
                  胜率 {match.home.probability}%
                </div>
              </button>

              {/* 平局 */}
              <button
                onClick={() => setConfirmSide('draw')}
                className="flex flex-col justify-center items-center px-1.5 rounded-2xl active:scale-95 transition-transform text-center"
                style={{
                  height: '56px',
                  background: 'linear-gradient(135deg, #334155, #475569)',
                  boxShadow: '0 8px 24px rgba(51,65,85,0.4)',
                  minWidth: '66px',
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase' }}>平局</div>
                <div style={{ fontFamily: 'Inter', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '1px' }}>
                  {(100 / match.draw.probability).toFixed(2)}x
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', marginTop: '2px' }}>
                  {match.draw.probability}%
                </div>
              </button>

              {/* 客队胜 */}
              <button
                onClick={() => setConfirmSide('away')}
                className="flex flex-1 flex-col justify-center items-center rounded-2xl active:scale-95 transition-transform text-center"
                style={{
                  height: '56px',
                  background: `linear-gradient(135deg, ${match.away.style.primary}, ${match.away.style.accent})`,
                  boxShadow: `0 8px 24px ${match.away.style.glow}`,
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase' }}>
                  支持 {match.away.shortCode}
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '20px', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginTop: '1px' }}>
                  {(100 / match.away.probability).toFixed(2)}x
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', marginTop: '2px' }}>
                  胜率 {match.away.probability}%
                </div>
              </button>

              {/* 下一场 */}
              <button
                onClick={goNext}
                className="flex items-center justify-center rounded-full active:scale-90 transition-transform flex-shrink-0"
                style={{ width: '56px', height: '56px', background: 'rgba(15,25,50,0.9)', border: '2px solid rgba(255,255,255,0.12)' }}
              >
                <ChevronRight size={24} color="rgba(255,255,255,0.6)" />
              </button>
            </div>
          </main>

          {/* ── ConfirmModal 下注面板 ── */}
          {match && (
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
                directionLabel: confirmSide === 'draw'
                  ? '买入平局'
                  : confirmSide === 'home'
                    ? `买入 ${match.home.name} 胜`
                    : `买入 ${match.away.name} 胜`,
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
                primaryColor: confirmSide === 'home'
                  ? match.home.style.primary
                  : confirmSide === 'draw'
                    ? DRAW_COLOR
                    : match.away.style.primary,
                accentColor: confirmSide === 'home'
                  ? match.home.style.accent
                  : confirmSide === 'draw'
                    ? '#475569'
                    : match.away.style.accent,
                glowColor: confirmSide === 'home'
                  ? match.home.style.glow
                  : confirmSide === 'draw'
                    ? 'rgba(51,65,85,0.4)'
                    : match.away.style.glow,
                badgeText: confirmSide === 'draw'
                  ? 'DRW'
                  : confirmSide === 'home'
                    ? match.home.shortCode
                    : match.away.shortCode,
              }}
              onConfirm={async (amount, executionPrice) => {
                setConfirmSide(null);
                if (onPlaceBet) {
                  await onPlaceBet(amount.toString(), getSelectedTokenId(), executionPrice);
                }
                goNext();
              }}
              onCancel={() => setConfirmSide(null)}
            />
          )}
        </>
      )}
    </div>
  );
}
