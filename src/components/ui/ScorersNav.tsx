'use client';

import { Lock } from 'lucide-react';
import { HistoricYear } from '@/lib/mockScorers';

import { useTranslation } from '@/i18n';

export interface ScorersNavProps {
  selectedYear: HistoricYear;
  onYearChange: (year: HistoricYear) => void;
}

export function ScorersNav({ selectedYear, onYearChange }: ScorersNavProps) {
  const { t } = useTranslation();

  const YEARS: Array<{ id: HistoricYear; label: string; locked?: boolean }> = [
    { id: '2026', label: '2026 🏆', locked: true },
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
    </div>
  );
}
