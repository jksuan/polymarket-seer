'use client';

import { Lock, Trophy, BarChart3 } from 'lucide-react';
import { HistoricYear } from '@/lib/mockStandings';
import { useTranslation } from '@/i18n';

export interface StandingsNavProps {
  selectedYear: HistoricYear;
  onYearChange: (year: HistoricYear) => void;
  viewMode: 'groups' | 'knockout';
  onViewModeChange: (mode: 'groups' | 'knockout') => void;
}

export function StandingsNav({
  selectedYear,
  onYearChange,
  viewMode,
  onViewModeChange,
}: StandingsNavProps) {
  const { t } = useTranslation();

  const YEARS: Array<{ id: HistoricYear; label: string; locked?: boolean }> = [
    { id: '2026', label: '2026 🏆' },
    { id: '2022', label: `2022 ${t.standings.hostQatar}` },
    { id: '2018', label: `2018 ${t.standings.hostRussia}` },
    { id: '2014', label: `2014 ${t.standings.hostBrazil}` },
  ];
  return (
    <div className="flex flex-col pt-2.5 pb-2">
      {/* SubTabs for Years */}
      <div
        className="flex gap-2 overflow-x-auto px-4 pt-1.5 pb-1 no-scrollbar items-center"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {YEARS.map((y) => {
          const isActive = selectedYear === y.id;
          const isLockedTheme = y.locked;

          return (
            <button
              key={y.id}
              onClick={() => onYearChange(y.id)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
              style={{
                fontFamily: 'Inter',
                fontSize: '12px',
                fontWeight: isActive ? 800 : 600,
                background: isActive
                  ? (isLockedTheme 
                      ? 'linear-gradient(135deg, rgba(0,240,255,0.15) 0%, rgba(0,240,255,0.05) 100%)' 
                      : 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.1) 100%)')
                  : 'rgba(255,255,255,0.04)',
                border: isActive 
                  ? (isLockedTheme ? '1px solid rgba(0,240,255,0.4)' : '1px solid rgba(255,215,0,0.4)') 
                  : '1px solid rgba(255,255,255,0.06)',
                color: isActive 
                  ? (isLockedTheme ? '#00F0FF' : '#FFD700') 
                  : 'rgba(255,255,255,0.5)',
                boxShadow: isActive 
                  ? (isLockedTheme ? '0 0 10px rgba(0,240,255,0.2)' : '0 0 10px rgba(255,215,0,0.15)') 
                  : 'none',
              }}
            >
              {isLockedTheme && <Lock size={12} strokeWidth={2.5} />}
              {y.label}
            </button>
          );
        })}
      </div>

      {/* Segmented Control: Groups vs Knockout */}
      <div className="px-4 mt-1">
        <div className="flex p-1 bg-[#05060A] rounded-[10px] border border-white/5 relative z-10 shadow-inner">
          <button 
            onClick={() => onViewModeChange('groups')} 
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] rounded-[6px] transition-all duration-300 ${viewMode === 'groups' ? 'bg-white/10 text-white shadow-[0_2px_8px_rgba(0,0,0,0.5)] font-bold' : 'text-white/40 font-medium hover:text-white/70'}`}
          >
            <BarChart3 size={14} /> {t.standings.groupsTitle}
          </button>
          <button 
            onClick={() => onViewModeChange('knockout')} 
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] rounded-[6px] transition-all duration-300 ${viewMode === 'knockout' ? 'bg-gradient-to-br from-[#00F0FF]/20 to-[#00F0FF]/5 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.1)] font-bold border border-[#00F0FF]/20' : 'text-white/40 font-medium hover:text-white/70'}`}
          >
            <Trophy size={14} /> {t.standings.knockoutTitle}
          </button>
        </div>
      </div>
    </div>
  );
}
