'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { HistoricYear, HISTORIC_STANDINGS, type StandingsGroup } from '@/lib/mockStandings';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { KnockoutBracketView } from '@/components/ui/KnockoutBracketView';
import { useStandings2026 } from '@/hooks/useStandings2026';
import { useTranslation, translateCountryName } from '@/i18n';

export interface StandingsViewProps {
  selectedYear: HistoricYear;
  viewMode: 'groups' | 'knockout';
}

export function StandingsView({ selectedYear, viewMode }: StandingsViewProps) {
  return (
    <div className="flex flex-col w-full h-full pb-20 -mt-2">
      {/* ── Content Area ── */}
      <div className="flex-1 px-4 mt-4" style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedYear}-${viewMode}`}
            initial={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {viewMode === 'knockout' ? (
              <KnockoutBracketView year={selectedYear} />
            ) : selectedYear === '2026' ? (
              <Live2026StandingsView />
            ) : (
              <HistoricStandingsView year={selectedYear} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Live2026StandingsView() {
  const { t } = useTranslation();
  const { groups, isLoading, error, refresh } = useStandings2026(true);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 size={28} className="animate-spin text-[#00F0FF]" />
        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
          {t.standings.loadingLive}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4 px-4">
        <AlertTriangle size={28} color="#FFD700" />
        <p style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
          {t.standings.liveError}
        </p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="px-4 py-2 rounded-lg text-[12px] font-bold text-[#00F0FF] border border-[#00F0FF]/30 bg-[#00F0FF]/10 active:scale-95 transition-transform"
        >
          {t.standings.retry}
        </button>
      </div>
    );
  }

  return <StandingsGroupsList groups={groups} />;
}

function HistoricStandingsView({ year }: { year: Exclude<HistoricYear, '2026'> }) {
  const groups = HISTORIC_STANDINGS[year];
  if (!groups || groups.length === 0) return null;
  return <StandingsGroupsList groups={groups} />;
}

function StandingsGroupsList({ groups }: { groups: StandingsGroup[] }) {
  const { t, locale } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => {
        const match = group.groupName.match(/^([A-Z])/);
        const letter = match ? match[1] : group.groupName.charAt(0);
        const groupDisplay = `${t.standings.groupPrefix}${letter}${t.standings.groupSuffix}`;

        return (
          <div
            key={group.groupName}
            className="rounded-[20px] overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            }}
          >
            <div className="px-4 py-3 flex items-center border-b border-white/5" style={{ background: 'rgba(255,255,255,0.01)' }}>
              <span style={{ fontFamily: 'Inter', fontSize: '14px', fontWeight: 800, color: '#fff' }}>
                {groupDisplay}
              </span>
            </div>

            <div className="grid grid-cols-12 px-4 py-2 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="col-span-4 flex items-center text-[10px] font-semibold text-white/40 uppercase tracking-wider">{t.standings.team}</div>
              <div className="col-span-1 flex items-center justify-center text-[10px] font-semibold text-white/40">{t.standings.won}</div>
              <div className="col-span-1 flex items-center justify-center text-[10px] font-semibold text-white/40">{t.standings.drawn}</div>
              <div className="col-span-1 flex items-center justify-center text-[10px] font-semibold text-white/40">{t.standings.lost}</div>
              <div className="col-span-3 flex items-center justify-center text-[10px] font-semibold text-white/40">{t.standings.goals}</div>
              <div className="col-span-2 flex items-center justify-end text-[10px] font-semibold text-[#FFD700]/70 uppercase tracking-wider">{t.standings.points}</div>
            </div>

            <div className="flex flex-col">
              {group.teams.map((team, idx) => (
                <div
                  key={team.id}
                  className="grid grid-cols-12 px-4 py-3 relative border-b border-white/5 last:border-b-0 items-center overflow-hidden"
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-24 opacity-5 pointer-events-none"
                    style={{ background: `linear-gradient(90deg, ${team.primaryColor}, transparent)` }}
                  />

                  {team.qualified && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#ADFF2F] shadow-[0_0_8px_rgba(173,255,47,0.5)]" />
                  )}

                  <div className="col-span-4 flex items-center gap-2.5 relative z-10">
                    <div className="w-4 flex items-center justify-center shrink-0">
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
                      {translateCountryName(team.name, locale)}
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
                  <div className="col-span-3 flex items-center justify-center relative z-10">
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
        );
      })}
    </div>
  );
}
