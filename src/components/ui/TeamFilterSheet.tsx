'use client';

import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X, Search } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';
import { useTranslation, translateCountryName } from '@/i18n';

// 48 teams grouped by World Cup 2026 groups
const TEAMS_BY_GROUP: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'Korea Republic', 'Czechia'],
  B: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'],
  C: ['Brazil', 'Morocco', 'Haiti', 'Scotland'],
  D: ['United States', 'Paraguay', 'Australia', 'Türkiye'],
  E: ['Germany', 'Curaçao', "Côte d'Ivoire", 'Ecuador'],
  F: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'IR Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'],
  L: ['England', 'Croatia', 'Ghana', 'Panama'],
};

interface TeamFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (teamName: string | null) => void;
  selectedTeam: string | null;
}

function TeamFilterSheetContent({ isOpen, onClose, onSelect, selectedTeam }: TeamFilterSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { t, locale } = useTranslation();

  // Filter groups/teams based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return TEAMS_BY_GROUP;

    const q = searchQuery.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [group, teams] of Object.entries(TEAMS_BY_GROUP)) {
      const filtered = teams.filter(t => {
        const displayName = translateCountryName(t, locale);
        return t.toLowerCase().includes(q) || displayName.toLowerCase().includes(q);
      });
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [searchQuery, locale]);

  const handleSelect = (team: string) => {
    onSelect(team === selectedTeam ? null : team);
    onClose();
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
    setSearchQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm"
            onClick={() => { onClose(); setSearchQuery(''); }}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] h-[85dvh] overflow-hidden flex flex-col"
            style={{
              maxWidth: '480px',
              margin: '0 auto',
              borderRadius: '24px 24px 0 0',
              background: 'linear-gradient(180deg, rgba(30,20,55,0.98), rgba(12,6,24,0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-white/20"></div>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 shrink-0">
              <div className="text-[16px] font-black text-white tracking-wider">{t.home.teamFilterTitle}</div>
              <div className="flex items-center gap-3">
                {selectedTeam && (
                  <button
                    onClick={handleClear}
                    className="text-[12px] font-bold text-[#FFD700] px-2 py-0.5 rounded-md active:scale-95"
                    style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)' }}
                  >
                    {t.home.clearFilter}
                  </button>
                )}
                <button
                  onClick={() => { onClose(); setSearchQuery(''); }}
                  className="w-8 h-8 flex items-center justify-center rounded-full active:scale-90"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X size={16} className="text-white/60" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="px-5 pb-3 shrink-0">
              <div
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Search size={16} className="text-white/30 shrink-0" />
                <input
                  type="text"
                  placeholder={t.home.searchTeam}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-[16px] font-bold text-white placeholder:text-white/25 w-full"
                  style={{ fontFamily: 'Inter' }}
                />
              </div>
            </div>

            {/* Scrollable Team Grid */}
            <div className="overflow-y-auto px-5 pb-8 flex-1" style={{ scrollbarWidth: 'thin' }}>
              {Object.entries(filteredGroups).map(([group, teams]) => (
                <div key={group} className="mb-4">
                  <div className="text-[10px] font-black text-white/30 tracking-widest uppercase mb-2">
                    {t.standings.groupPrefix}{group}{t.standings.groupSuffix}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {teams.map((team) => {
                      const isSelected = selectedTeam === team;
                      const displayName = translateCountryName(team, locale);
                      return (
                        <button
                          key={team}
                          onClick={() => handleSelect(team)}
                          className="flex flex-col items-center justify-center gap-1.5 px-1 py-2.5 rounded-xl transition-all active:scale-95"
                          style={{
                            background: isSelected
                              ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))'
                              : 'rgba(255,255,255,0.04)',
                            border: isSelected
                              ? '1.5px solid rgba(255,215,0,0.5)'
                              : '1px solid rgba(255,255,255,0.06)',
                            boxShadow: isSelected ? '0 0 12px rgba(255,215,0,0.15)' : 'none',
                          }}
                        >
                          <img
                            src={getCountryFlagUrl(team, 40)}
                            alt={team}
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
                            className="text-[11px] font-bold w-full text-center truncate px-0.5"
                            style={{
                              fontFamily: 'Inter',
                              color: isSelected ? '#FFD700' : 'rgba(255,255,255,0.7)',
                            }}
                          >
                            {displayName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {Object.keys(filteredGroups).length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 opacity-40">
                  <div className="text-[12px] font-bold text-white/50 tracking-widest">{t.home.noTeamsFound}</div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function TeamFilterSheet(props: TeamFilterSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <TeamFilterSheetContent {...props} />,
    document.body
  );
}
