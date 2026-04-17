'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Trophy, BarChart3, Clock, AlertTriangle } from 'lucide-react';
import { HistoricYear, HISTORIC_STANDINGS } from '@/lib/mockStandings';
import { getCountryFlagUrl } from '@/lib/countryFlags';

const YEARS: Array<{ id: HistoricYear; label: string; locked?: boolean }> = [
  { id: '2026', label: '2026 🏆', locked: true },
  { id: '2022', label: '2022 卡塔尔' },
  { id: '2018', label: '2018 俄罗斯' },
  { id: '2014', label: '2014 巴西' },
];

export function StandingsView() {
  const [selectedYear, setSelectedYear] = useState<HistoricYear>('2022');

  return (
    <div className="flex flex-col w-full h-full pb-20">
      {/* ── SubTabs for Years ── */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar items-center border-b border-white/5"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {YEARS.map((y) => {
            const isActive = selectedYear === y.id;
            const isLockedTheme = y.locked;

            return (
              <button
                key={y.id}
                onClick={() => setSelectedYear(y.id)}
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

      {/* ── Content Area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 no-scrollbar" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedYear}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {selectedYear === '2026' ? (
              <Locked2026State />
            ) : (
              <HistoricStandingsView year={selectedYear} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Locked State for 2026 ──
function Locked2026State() {
  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-12">
      {/* Locked Header */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-[#00F0FF] blur-[40px] opacity-20 rounded-full animate-pulse" />
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center relative z-10"
          style={{ background: 'rgba(0, 240, 255, 0.1)', border: '1px solid rgba(0, 240, 255, 0.3)' }}
        >
          <Lock size={28} color="#00F0FF" strokeWidth={2} />
        </div>
      </div>

      <h3 style={{ fontFamily: 'Inter', fontSize: '18px', fontWeight: 900, color: '#fff', letterSpacing: '0.02em', marginBottom: '8px' }}>
        赛事数据尚未解锁
      </h3>
      <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: '280px', marginBottom: '32px' }}>
        2026 美加墨世界杯积分榜数据引擎挂起中，待小组赛开打后将实时同步注入系统。
      </p>

      {/* Placeholder Skeleton Rows */}
      <div className="w-full max-w-sm rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
          <div className="h-4 w-16 bg-white/10 rounded animate-pulse" />
          <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', fontWeight: 800 }}>{i}</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-white/10 animate-pulse" />
              <div className="h-4 w-20 bg-white/10 rounded animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-4 w-6 bg-white/5 rounded" />
              <div className="h-4 w-6 bg-white/5 rounded" />
              <div className="h-4 w-8 bg-white/10 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Render historic data ──
function HistoricStandingsView({ year }: { year: Exclude<HistoricYear, '2026'> }) {
  const groups = HISTORIC_STANDINGS[year];
  
  if (!groups || groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group, gIdx) => (
        <div 
          key={group.groupName}
          className="rounded-[20px] overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}
        >
          {/* Group Header */}
          <div className="px-4 py-3 flex items-center border-b border-white/5" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
              {group.groupName.split(' ')[0]}
            </span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 px-4 py-2 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.2)' }}>
            <div className="col-span-5 flex items-center text-[10px] font-semibold text-white/40 uppercase tracking-wider">球队</div>
            <div className="col-span-1 flex items-center justify-center text-[10px] font-semibold text-white/40">胜</div>
            <div className="col-span-1 flex items-center justify-center text-[10px] font-semibold text-white/40">平</div>
            <div className="col-span-1 flex items-center justify-center text-[10px] font-semibold text-white/40">负</div>
            <div className="col-span-2 flex items-center justify-center text-[10px] font-semibold text-white/40">进/失</div>
            <div className="col-span-2 flex items-center justify-end text-[10px] font-semibold text-[#FFD700]/70 uppercase tracking-wider">积分</div>
          </div>

          {/* Teams */}
          <div className="flex flex-col">
            {group.teams.map((team, idx) => (
              <div 
                key={team.id}
                className="grid grid-cols-12 px-4 py-3 relative border-b border-white/5 last:border-b-0 items-center overflow-hidden"
              >
                {/* Team gradient background */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-24 opacity-5 pointer-events-none"
                  style={{ background: `linear-gradient(90deg, ${team.primaryColor}, transparent)` }}
                />

                {/* Qualification indicator (left thin border) */}
                {team.qualified && (
                  <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#ADFF2F] shadow-[0_0_8px_rgba(173,255,47,0.5)]" />
                )}

                <div className="col-span-5 flex items-center gap-2.5 relative z-10">
                  <div className="w-4 flex items-center justify-center">
                    <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 800, color: team.qualified ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                      {idx + 1}
                    </span>
                  </div>
                  <div 
                    className="w-[26px] h-[18px] rounded-[3px] overflow-hidden shrink-0 shadow-sm relative"
                    style={{ border: '1px solid rgba(255,255,255,0.15)' }}
                  >
                    <img 
                      src={getCountryFlagUrl(team.name, 40)} 
                      alt={team.code} 
                      className="absolute inset-0 w-full h-full object-cover" 
                      loading="lazy"
                    />
                  </div>
                  <span style={{ fontSize: '13px', fontFamily: 'Inter', fontWeight: 700, color: team.qualified ? '#fff' : 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {team.name}
                  </span>
                </div>

                <div className="col-span-1 flex items-center justify-center relative z-10">
                  <span style={{ fontSize: '12px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{team.won}</span>
                </div>
                <div className="col-span-1 flex items-center justify-center relative z-10">
                  <span style={{ fontSize: '12px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{team.drawn}</span>
                </div>
                <div className="col-span-1 flex items-center justify-center relative z-10">
                  <span style={{ fontSize: '12px', fontFamily: 'Inter', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{team.lost}</span>
                </div>
                <div className="col-span-2 flex items-center justify-center relative z-10">
                  <span style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 500, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>
                    {team.goalsFor}/{team.goalsAgainst}
                  </span>
                </div>
                <div className="col-span-2 flex items-center justify-end relative z-10">
                  <span style={{ fontSize: '15px', fontFamily: 'Inter', fontWeight: 900, color: team.qualified ? '#FFD700' : 'rgba(255,215,0,0.5)' }}>
                    {team.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
