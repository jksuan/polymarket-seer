'use client';

import { useState, useCallback, useRef, memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Zap, Loader2, Share2, Activity } from 'lucide-react';
import { useMatchData } from '@/hooks/useMatchData';
import { ParsedMatch } from '@/components/ui/MatchCard';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ShareModal } from '@/components/ui/ShareModal';
import { TopHeader } from '@/components/ui/TopHeader';
import { formatVolume } from '@/lib/utils';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { useTranslation } from '@/i18n';
import { translateCountryName } from '@/i18n/countryNames';

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
// CarouselCard — 丝滑原生滑动卡片
// ═══════════════════════════════════════════════════

interface CarouselCardProps {
  match: ParsedMatch;
  positions?: any[];
  onShare: (match: ParsedMatch) => void;
}

const CarouselCard = memo(function CarouselCard({ match, positions, onShare }: CarouselCardProps) {
  const isLive = match.status === 'live';
  const { t, locale } = useTranslation();
  const cn = (name: string, short?: boolean) => translateCountryName(name, locale, short);

  // ── 计算该场比赛的用户持仓 ──
  const homePos = positions?.find(p => p.asset === match.home.tokenId && parseFloat(p.size) > 0);
  const drawPos = positions?.find(p => p.asset === match.draw.tokenId && parseFloat(p.size) > 0);
  const awayPos = positions?.find(p => p.asset === match.away.tokenId && parseFloat(p.size) > 0);

  const hasAnyPosition = homePos || drawPos || awayPos;

  return (
    <div className="w-full h-full flex flex-col px-1 shrink-0 snap-center pb-2">
      <div
        className="w-full relative flex-1"
        style={{
          borderRadius: '36px',
          background: 'linear-gradient(160deg, rgba(15,25,50,0.97), rgba(8,14,30,0.97))',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), inset 0 0 20px rgba(0,240,255,0.06)',
          overflow: 'hidden',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      >
        {/* ── 动态背景辉光 ── */}
        <div style={{ position: 'absolute', top: '-40px', left: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: match.home.style.glow, filter: 'blur(70px)', opacity: 0.35, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', right: '-40px', width: '200px', height: '200px', borderRadius: '50%', background: match.away.style.glow, filter: 'blur(70px)', opacity: 0.35, pointerEvents: 'none' }} />

        {/* ── 卡片正文 ── */}
        <div className="relative z-10 flex flex-col items-center h-full p-5 pb-4" style={{ gap: '10px' }}>

          {/* 1. 赛事名称 + 分组 */}
          <div className="flex items-center gap-2 mt-1">
            <span style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '12px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {t.challenge.title}
            </span>
            <div
              className="px-1.5 py-[1px] rounded-[4px] text-[10px] font-black"
              style={{
                background: match.isGroupStage ? 'rgba(255,215,0,0.15)' : 'rgba(173,255,47,0.15)',
                color: match.isGroupStage ? '#FFD700' : '#ADFF2F',
                border: match.isGroupStage ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(173,255,47,0.3)',
              }}
            >
              {match.isGroupStage ? `${locale === 'zh' ? '' : 'Group '}${match.group}${locale === 'zh' ? t.home.groupSuffix : ''}` : t.home.knockoutStage}
            </div>
          </div>

          {/* 2. 顶部状态 */}
          <div className="flex flex-col items-center gap-2 mt-2">
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
                {t.challenge.liveNow}
              </motion.div>
            )}
            {match.status === 'upcoming' && (
              <div style={{
                background: 'rgba(0,240,255,0.1)',
                border: '1px solid rgba(0,240,255,0.35)',
                borderRadius: '8px',
                padding: '3px 12px',
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '10px',
                color: '#00F0FF',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {t.challenge.kickoff} {match.timeLabel} · {match.dateLabel}
              </div>
            )}
            {match.status === 'ended' && (
              <div style={{
                background: 'rgba(150,150,150,0.12)',
                border: '1px solid rgba(150,150,150,0.3)',
                borderRadius: '8px',
                padding: '3px 12px',
                fontFamily: 'Inter',
                fontWeight: 700,
                fontSize: '10px',
                color: 'rgba(180,180,180,0.7)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {t.challenge.ended}
              </div>
            )}
          </div>

          {/* 3. 大圆圈对阵区 */}
          <div className="w-full flex justify-between items-center" style={{ padding: '0 4px', flex: 1, minHeight: 0 }}>
            {/* 主队圆圈 */}
            <div className="flex flex-col items-center gap-2 w-[40%]">
              <FlagBadge
                flagUrl={getCountryFlagUrl(match.home.name, 'svg')}
                teamName={match.home.name}
                primaryColor={match.home.style.primary}
                accentColor={match.home.style.accent}
                glowColor={match.home.style.glow}
                isLive={isLive}
              />
              <div className="text-center">
                <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>
                  {cn(match.home.name)}
                </div>
                <div style={{
                  fontFamily: 'Inter',
                  fontWeight: 900,
                  fontSize: '26px',
                  color: match.home.style.accent,
                  textShadow: `0 0 16px ${match.home.style.glow}`,
                  lineHeight: 1,
                }}>
                  {(100 / match.home.probability).toFixed(2)}x
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {match.home.probability}% {t.challenge.winRate}
                </div>
              </div>
            </div>

            {/* VS 闪电中央 */}
            <div className="flex flex-col items-center justify-center">
              <Zap size={28} color="#ADFF2F" fill="#ADFF2F" style={{ filter: 'drop-shadow(0 0 8px #ADFF2F)' }} />
              <span style={{ fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '16px', color: 'rgba(255,255,255,0.15)', marginTop: '4px' }}>VS</span>
              <div
                className="mt-3 px-3 py-1.5 rounded-lg"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ fontFamily: 'Inter', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>{t.challenge.drawLabel}</div>
                <div style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 900, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 1, marginTop: '1px' }}>
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
                flagUrl={getCountryFlagUrl(match.away.name, 'svg')}
                teamName={match.away.name}
                primaryColor={match.away.style.primary}
                accentColor={match.away.style.accent}
                glowColor={match.away.style.glow}
                isLive={isLive}
              />
              <div className="text-center">
                <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '13px', color: 'rgba(255,255,255,0.9)', marginBottom: '4px' }}>
                  {cn(match.away.name)}
                </div>
                <div style={{
                  fontFamily: 'Inter',
                  fontWeight: 900,
                  fontSize: '26px',
                  color: match.away.style.accent,
                  textShadow: `0 0 16px ${match.away.style.glow}`,
                  lineHeight: 1,
                }}>
                  {(100 / match.away.probability).toFixed(2)}x
                </div>
                <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                  {match.away.probability}% {t.challenge.winRate}
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,255,0,0.1)', boxShadow: 'inset 0 0 8px rgba(0,255,0,0.2)' }}>
                <Activity size={16} color="#00FF00" />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {t.challenge.marketPool}
                </div>
                <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '16px', color: '#fff', marginTop: '1px' }}>
                  {formatVolume(match.volume)}
                </div>
              </div>
            </div>

            {/* 我的持仓 */}
            <div className="flex-1 flex justify-center">
              {hasAnyPosition && (
                <div 
                  className="px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
                  <span style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 600, color: '#00F0FF' }}>
                    {t.challenge.holding}
                  </span>
                  <span style={{ fontFamily: 'Inter', fontSize: '12px', fontWeight: 800, color: '#fff', marginLeft: '2px' }}>
                    {homePos ? `${cn(match.home.name)} ${parseFloat(homePos.size).toFixed(1)} ${t.challenge.shares}` : 
                     awayPos ? `${cn(match.away.name)} ${parseFloat(awayPos.size).toFixed(1)} ${t.challenge.shares}` : 
                     `${t.challenge.drawLabel} ${parseFloat(drawPos!.size).toFixed(1)} ${t.challenge.shares}`}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.05)' }}
                onClick={() => {
                  onShare(match);
                }}
              >
                <Share2 size={16} color="rgba(255,255,255,0.7)" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════
// 主页面组件
// ═══════════════════════════════════════════════════

export function ChallengePage({ onPlaceBet, positions }: ChallengePageProps) {
  const { t, locale } = useTranslation();
  const cn = (name: string, short?: boolean) => translateCountryName(name, locale, short);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasRestoredScroll = useRef(false);

  // ── Session Storage 状态记忆 ──
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('challenge_swipe_index');
      if (saved !== null) return parseInt(saved, 10);
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('challenge_swipe_index', currentIndex.toString());
    }
  }, [currentIndex]);

  const [confirmSide, setConfirmSide] = useState<'home' | 'away' | 'draw' | null>(null);
  const [sharingMatch, setSharingMatch] = useState<ParsedMatch | null>(null);

  // ── 接入真实数据管线 ──
  const { allMatches, isLoading } = useMatchData(true);

  // 只取未结束的比赛
  const swipeMatches = allMatches.filter(m => m.status !== 'ended');

  // 当加载完成时，立刻把容器滑动到记忆卡片的位置
  useEffect(() => {
    if (!isLoading && swipeMatches.length > 0 && !hasRestoredScroll.current) {
      hasRestoredScroll.current = true;
      if (currentIndex > 0 && scrollRef.current) {
        // 利用 requestAnimationFrame 确保 DOM 已经渲染完毕
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            const width = scrollRef.current.clientWidth;
            scrollRef.current.scrollTo({ left: currentIndex * width, behavior: 'instant' });
          }
        });
      }
    }
  }, [isLoading, swipeMatches.length, currentIndex]);
  const match = swipeMatches[currentIndex] || null;

  // 监听滚动更新 index
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const scrollX = scrollRef.current.scrollLeft;
    const width = scrollRef.current.clientWidth;
    const newIndex = Math.round(scrollX / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (!scrollRef.current) return;
    const newIndex = Math.min(currentIndex + 1, swipeMatches.length - 1);
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: newIndex * width, behavior: 'smooth' });
  }, [currentIndex, swipeMatches.length]);

  const goPrev = useCallback(() => {
    if (!scrollRef.current) return;
    const newIndex = Math.max(currentIndex - 1, 0);
    const width = scrollRef.current.clientWidth;
    scrollRef.current.scrollTo({ left: newIndex * width, behavior: 'smooth' });
  }, [currentIndex]);

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
      {/* 隐藏滚动条样式 */}
      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {/* 全局顶部栏 */}
      <div className="z-30 relative">
        <TopHeader />
      </div>

      {/* ── Loading Skeleton (骨架屏) ── */}
      {isLoading && (
        <div className="flex-1 flex flex-col w-full relative px-1 sm:px-2 animate-pulse mt-1 pb-[18px]">
          {/* 主卡片占位 */}
          <div className="w-full flex flex-col rounded-[32px] overflow-hidden p-6 relative" 
               style={{ flex: 1, minHeight: 0, background: 'linear-gradient(to bottom, rgba(30,41,59,0.5), rgba(15,23,42,0.8))', border: '1px solid rgba(255,255,255,0.03)' }}>
            
            {/* 顶部标签 */}
            <div className="flex justify-between items-center mb-8">
              <div className="w-20 h-5 rounded bg-white/5" />
              <div className="w-24 h-5 rounded bg-white/5" />
            </div>

            {/* 对阵队伍 */}
            <div className="flex justify-between items-center mt-2">
              <div className="flex flex-col items-center w-[40%] gap-3">
                <div className="rounded-full bg-white/5" style={{ width: 'min(24vw, 100px)', height: 'min(24vw, 100px)' }} />
                <div className="w-16 h-4 rounded bg-white/5 mt-1" />
                <div className="w-24 h-8 rounded bg-white/5" />
              </div>
              
              {/* VS 占位 */}
              <div className="w-8 h-8 rounded-full bg-white/5" />

              <div className="flex flex-col items-center w-[40%] gap-3">
                <div className="rounded-full bg-white/5" style={{ width: 'min(24vw, 100px)', height: 'min(24vw, 100px)' }} />
                <div className="w-16 h-4 rounded bg-white/5 mt-1" />
                <div className="w-24 h-8 rounded bg-white/5" />
              </div>
            </div>

            <div className="flex-1" />

            {/* 底部长条占位 */}
            <div className="w-full h-[60px] rounded-[20px] bg-white/5 mt-auto" />
          </div>

          {/* 轮播指示器占位 */}
          <div className="flex items-center justify-center gap-4 py-2 my-1">
             <div className="w-12 h-1 rounded-full bg-white/5" />
             <div className="w-12 h-4 rounded bg-white/10" />
             <div className="w-12 h-1 rounded-full bg-white/5" />
          </div>

          {/* 底部三大金刚操作栏占位 */}
          <div className="flex justify-between items-center mb-4 mt-1" style={{ gap: 'clamp(6px, 1.5vw, 12px)', padding: '0 clamp(0px, 1vw, 4px)' }}>
            <div className="rounded-full bg-white/5 shrink-0" style={{ width: 'clamp(44px, 12vw, 56px)', height: 'clamp(44px, 12vw, 56px)' }} />
            <div className="rounded-2xl bg-white/5" style={{ flex: 1.2, height: 'clamp(48px, 13vw, 56px)' }} />
            <div className="rounded-2xl bg-white/5" style={{ flex: 0.9, height: 'clamp(48px, 13vw, 56px)' }} />
            <div className="rounded-2xl bg-white/5" style={{ flex: 1.2, height: 'clamp(48px, 13vw, 56px)' }} />
            <div className="rounded-full bg-white/5 shrink-0" style={{ width: 'clamp(44px, 12vw, 56px)', height: 'clamp(44px, 12vw, 56px)' }} />
          </div>
        </div>
      )}

      {/* ── 无比赛 ── */}
      {!isLoading && swipeMatches.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8">
          <Zap size={40} color="#00F0FF" style={{ opacity: 0.3 }} />
          <span style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            {t.challenge.noMatches}
          </span>
        </div>
      )}

      {/* ── 正常内容 ── */}
      {!isLoading && swipeMatches.length > 0 && match && (
        <>


          {/* ── 原生轮播区域 ── */}
          <main className="flex-1 flex flex-col relative w-full pt-1" style={{ minHeight: 0 }}>
            <div 
              ref={scrollRef}
              onScroll={handleScroll}
              className="flex-1 w-full flex overflow-x-auto snap-x snap-mandatory hide-scrollbar"
              style={{ scrollBehavior: 'smooth' }}
            >
              {swipeMatches.map((m) => (
                <CarouselCard key={m.id} match={m} positions={positions} onShare={setSharingMatch} />
              ))}
            </div>

            {/* 滑动提示文字 */}
            <div className="flex items-center justify-center gap-4 py-2 z-20">
              <div className="flex items-center gap-1.5 opacity-60">
                <div style={{ width: '24px', height: '2px', background: 'linear-gradient(to left, #fff, transparent)', borderRadius: '1px' }} />
                <span style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{t.challenge.swipeLeft}</span>
              </div>
              <span style={{ fontFamily: 'Inter', fontWeight: 900, color: '#00F0FF', textShadow: '0 0 8px #00F0FF', fontSize: '14px' }}>
                {currentIndex + 1} / {swipeMatches.length}
              </span>
              <div className="flex items-center gap-1.5 opacity-60">
                <span style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{t.challenge.swipeRight}</span>
                <div style={{ width: '24px', height: '2px', background: 'linear-gradient(to right, #fff, transparent)', borderRadius: '1px' }} />
              </div>
            </div>

            {/* ── 底部操作按钮区 ── */}
            <div className="flex justify-between items-center pb-4 z-20" style={{ gap: 'clamp(6px, 1.5vw, 12px)', padding: '0 clamp(0px, 1vw, 4px)' }}>
              {/* 往右滑 (看下一张) */}
              <button
                onClick={goNext}
                disabled={currentIndex === swipeMatches.length - 1}
                className={`flex items-center justify-center rounded-full transition-all flex-shrink-0 ${currentIndex === swipeMatches.length - 1 ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}`}
                style={{ width: 'clamp(44px, 12vw, 56px)', height: 'clamp(44px, 12vw, 56px)', background: 'rgba(15,25,50,0.9)', border: '2px solid rgba(255,255,255,0.12)' }}
              >
                <ChevronLeft size={24} color="rgba(255,255,255,0.6)" className="scale-75 sm:scale-100" />
              </button>

              {/* 主队胜 */}
              <button
                onClick={() => setConfirmSide('home')}
                className="flex flex-col justify-center items-center rounded-2xl active:scale-95 transition-transform text-center overflow-hidden"
                style={{
                  flex: 1.2,
                  height: 'clamp(48px, 13vw, 56px)',
                  background: `linear-gradient(135deg, ${match.home.style.primary}, ${match.home.style.accent})`,
                  boxShadow: `0 8px 24px ${match.home.style.glow}`,
                }}
              >
                <div className="truncate w-full px-0.5 sm:px-1" style={{ fontFamily: 'Inter', fontSize: locale === 'zh' ? 'clamp(11px, 3vw, 13px)' : 'clamp(10px, 2.8vw, 13px)', fontWeight: 900, color: '#fff', letterSpacing: locale === 'zh' ? '0.03em' : '-0.01em' }}>
                  {t.challenge.buyWin.replace('{code}', locale === 'zh' ? cn(match.home.name, true) : match.home.shortCode)}
                </div>
              </button>

              {/* 平局 */}
              <button
                onClick={() => setConfirmSide('draw')}
                className="flex flex-col justify-center items-center px-1 rounded-2xl active:scale-95 transition-transform text-center overflow-hidden"
                style={{
                  flex: 0.9,
                  height: 'clamp(48px, 13vw, 56px)',
                  background: 'linear-gradient(135deg, #334155, #475569)',
                  boxShadow: '0 8px 24px rgba(51,65,85,0.4)',
                }}
              >
                <div className="truncate w-full px-0.5 sm:px-1" style={{ fontFamily: 'Inter', fontSize: locale === 'zh' ? 'clamp(11px, 3vw, 13px)' : 'clamp(10px, 2.8vw, 13px)', fontWeight: 900, color: 'rgba(255,255,255,0.95)', letterSpacing: locale === 'zh' ? '0.03em' : '-0.01em' }}>{t.challenge.buyDraw}</div>
              </button>

              {/* 客队胜 */}
              <button
                onClick={() => setConfirmSide('away')}
                className="flex flex-col justify-center items-center rounded-2xl active:scale-95 transition-transform text-center overflow-hidden"
                style={{
                  flex: 1.2,
                  height: 'clamp(48px, 13vw, 56px)',
                  background: `linear-gradient(135deg, ${match.away.style.primary}, ${match.away.style.accent})`,
                  boxShadow: `0 8px 24px ${match.away.style.glow}`,
                }}
              >
                <div className="truncate w-full px-0.5 sm:px-1" style={{ fontFamily: 'Inter', fontSize: locale === 'zh' ? 'clamp(11px, 3vw, 13px)' : 'clamp(10px, 2.8vw, 13px)', fontWeight: 900, color: '#fff', letterSpacing: locale === 'zh' ? '0.03em' : '-0.01em' }}>
                  {t.challenge.buyWin.replace('{code}', locale === 'zh' ? cn(match.away.name, true) : match.away.shortCode)}
                </div>
              </button>

              {/* 往左滑 (看上一张) */}
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className={`flex items-center justify-center rounded-full transition-all flex-shrink-0 ${currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'active:scale-90'}`}
                style={{ width: 'clamp(44px, 12vw, 56px)', height: 'clamp(44px, 12vw, 56px)', background: 'rgba(15,25,50,0.9)', border: '2px solid rgba(255,255,255,0.12)' }}
              >
                <ChevronRight size={24} color="rgba(255,255,255,0.6)" className="scale-75 sm:scale-100" />
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
                  ? `${cn(match.home.name)} vs ${cn(match.away.name)} — ${t.trade.draw}`
                  : confirmSide === 'home'
                    ? `${cn(match.home.name)} ${t.discover.win}`
                    : `${cn(match.away.name)} ${t.discover.win}`,
                directionLabel: confirmSide === 'draw'
                  ? `${t.trade.buy} ${t.trade.draw}`
                  : confirmSide === 'home'
                    ? `${t.trade.buy} ${cn(match.home.name)} ${t.discover.win}`
                    : `${t.trade.buy} ${cn(match.away.name)} ${t.discover.win}`,
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
                const isLast = currentIndex === swipeMatches.length - 1;
                if (!isLast) {
                  goNext();
                }
              }}
              onCancel={() => setConfirmSide(null)}
            />
          )}

          {/* ── 海报分享弹窗 ── */}
          <ShareModal 
            isOpen={!!sharingMatch}
            onClose={() => setSharingMatch(null)}
            match={sharingMatch}
            positions={positions}
          />
        </>
      )}
    </div>
  );
}
