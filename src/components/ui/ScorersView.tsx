'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Loader2, User } from 'lucide-react';
import { HistoricYear, MOCK_SCORERS_DATA, type Scorer } from '@/lib/mockScorers';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { useState } from 'react';
import { useScorers2026 } from '@/hooks/useScorers2026';
import { useTranslation, translateCountryName } from '@/i18n';

export interface ScorersViewProps {
  selectedYear: HistoricYear;
}

export function ScorersView({ selectedYear }: ScorersViewProps) {
  return (
    <div className="flex flex-col w-full h-full pb-20 -mt-2">
      <div className="flex-1 px-4 mt-4" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedYear}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {selectedYear === '2026' ? (
              <Live2026ScorersView />
            ) : (
              <HistoricScorersView year={selectedYear} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Live2026ScorersView() {
  const { t } = useTranslation();
  const { scorers, isLoading, error, refresh } = useScorers2026(true);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={28} className="animate-spin text-[#00F0FF]" />
        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          {t.scorers.loadingLive}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
        <AlertTriangle size={28} color="#FFD700" />
        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          {t.scorers.liveError}
        </p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 rounded-lg text-[12px] font-bold text-[#00F0FF] border border-[#00F0FF]/30 bg-[#00F0FF]/10 active:scale-95 transition-transform"
        >
          {t.scorers.retry}
        </button>
      </div>
    );
  }

  if (scorers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 px-4">
        <User size={28} color="rgba(255,255,255,0.25)" />
        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          {t.scorers.emptyLive}
        </p>
      </div>
    );
  }

  return <ScorersList scorers={scorers} />;
}

function HistoricScorersView({ year }: { year: Exclude<HistoricYear, '2026'> }) {
  const scorers = MOCK_SCORERS_DATA[year];
  if (!scorers || scorers.length === 0) return null;
  return <ScorersList scorers={scorers} />;
}

function ScorersList({ scorers }: { scorers: Scorer[] }) {
  const { t, locale } = useTranslation();
  const maxGoals = Math.max(...scorers.map((s) => s.goals), 1);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6 pt-2 pb-8">
      {scorers.map((scorer, index) => {
        const isTop = scorer.rank === 1;
        const rankColor = isTop ? 'text-[#FFD700]' : scorer.rank === 2 ? 'text-[#E0E0E0]' : scorer.rank === 3 ? 'text-[#CD7F32]' : 'text-white/30';
        const rankGlow = isTop ? 'drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]' : '';

        return (
          <div key={scorer.id} className="flex flex-col gap-2 relative group w-full">
            <div className="flex items-center gap-3">
              <div
                className={`w-5 text-center font-black text-[18px] ${rankColor} ${rankGlow}`}
                style={{ fontFamily: 'Inter' }}
              >
                {scorer.rank}
              </div>

              <div className="relative flex-shrink-0 w-11 h-11">
                <AvatarImage
                  url={scorer.avatarUrl}
                  fallbackInitials={getInitials(scorer.name)}
                  isTop={isTop}
                />
              </div>

              <div className="flex flex-col flex-1 pl-1 justify-center">
                <div className="flex items-center justify-between">
                  <span className={`font-bold tracking-tight ${isTop ? 'text-white' : 'text-white/90'}`} style={{ fontSize: '15px' }}>
                    {t.players[scorer.name as keyof typeof t.players] || scorer.name}
                  </span>
                  <span
                    className={`font-black tracking-tighter ${isTop ? 'text-[#FFD700]' : 'text-white'}`}
                    style={{ fontSize: '18px', fontFamily: 'Inter' }}
                  >
                    {scorer.goals}
                  </span>
                </div>

                <div className="flex items-center justify-between mt-[2px]">
                  <div className="flex items-center gap-1.5 opacity-80">
                    <img
                      src={getCountryFlagUrl(scorer.countryCode, 40)}
                      alt={scorer.countryCode}
                      className="w-[20px] h-[14px] shadow-sm rounded-[2px] object-cover"
                    />
                    <span className="text-white/50 text-[12px] font-medium tracking-wide">
                      {translateCountryName(scorer.countryCode, locale)}
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold tracking-widest uppercase ${isTop ? 'text-[#FFD700]/60' : 'text-white/30'}`}>
                    {t.scorers.goals}
                  </span>
                </div>
              </div>
            </div>

            <div className="h-1.5 mt-1 rounded-full bg-white/[0.03] w-full relative overflow-hidden backdrop-blur-sm border border-white/[0.02]">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(scorer.goals / maxGoals) * 100}%` }}
                className={`absolute inset-y-0 left-0 rounded-full ${
                  isTop
                    ? 'bg-gradient-to-r from-[#FFD700]/60 via-[#FFD700]/90 to-[#FFFFFF] shadow-[0_0_12px_rgba(255,215,0,0.8)]'
                    : scorer.rank === 2
                      ? 'bg-gradient-to-r from-[#E0E0E0]/60 to-[#FFFFFF] shadow-[0_0_8px_rgba(224,224,224,0.5)]'
                      : scorer.rank === 3
                        ? 'bg-gradient-to-r from-[#CD7F32]/60 to-[#FFAE6E] shadow-[0_0_8px_rgba(205,127,50,0.5)]'
                        : 'bg-gradient-to-r from-[#00F0FF]/40 to-[#00F0FF]/80 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                }`}
                transition={{ duration: 1, delay: index * 0.12, ease: [0.25, 1, 0.5, 1] }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AvatarImage({ url, fallbackInitials, isTop }: { url: string | null; fallbackInitials: string; isTop: boolean }) {
  const [hasError, setHasError] = useState(false);
  const ringStyle = isTop ? 'border-[1.5px] border-[#FFD700]/50 shadow-[0_0_10px_rgba(255,215,0,0.2)]' : 'border border-white/10';

  if (!url || hasError) {
    return (
      <div
        className={`w-full h-full rounded-full flex items-center justify-center bg-gradient-to-br from-[#1A1D24] to-[#0A0D14] ${ringStyle}`}
      >
        <span className="text-[14px] font-bold text-white/50">{fallbackInitials}</span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full rounded-full overflow-hidden bg-[#1A1D24] relative ${ringStyle}`}>
      <img
        src={url}
        alt="avatar"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover object-top scale-110"
      />
    </div>
  );
}
