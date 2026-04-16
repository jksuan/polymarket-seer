'use client';

import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, Search } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';

// 48 teams grouped by World Cup 2026 groups
const TEAMS_BY_GROUP: Record<string, string[]> = {
  A: ['Mexico', 'South Africa', 'Korea Republic', 'Czechia'],
  B: ['United States', 'Paraguay', 'Türkiye', 'Australia'],
  C: ['Brazil', 'Morocco', 'Scotland', 'Haiti'],
  D: ['Switzerland', 'Qatar', 'Bosnia and Herzegovina', 'Canada'],
  E: ['Germany', 'Curaçao', 'Ecuador', "Côte d'Ivoire"],
  F: ['Japan', 'Netherlands', 'Sweden', 'Tunisia'],
  G: ['Belgium', 'Egypt', 'IR Iran', 'New Zealand'],
  H: ['Spain', 'Cabo Verde', 'Saudi Arabia', 'Uruguay'],
  I: ['France', 'Senegal', 'Iraq', 'Norway'],
  J: ['Argentina', 'Algeria', 'Austria', 'Jordan'],
  K: ['Portugal', 'DR Congo', 'Croatia', 'England'],
  L: ['Colombia', 'Uzbekistan', 'Ghana', 'Panama'],
};

// Display name overrides for cleaner UI
const DISPLAY_NAMES: Record<string, string> = {
  'Korea Republic': '韩国',
  'United States': '美国',
  'Türkiye': '土耳其',
  'Bosnia and Herzegovina': '波黑',
  'Czechia': '捷克',
  "Côte d'Ivoire": '科特迪瓦',
  'Curaçao': '库拉索',
  'IR Iran': '伊朗',
  'New Zealand': '新西兰',
  'Cabo Verde': '佛得角',
  'Saudi Arabia': '沙特',
  'DR Congo': '刚果(金)',
  'South Africa': '南非',
  'Mexico': '墨西哥',
  'Australia': '澳大利亚',
  'Paraguay': '巴拉圭',
  'Switzerland': '瑞士',
  'Qatar': '卡塔尔',
  'Canada': '加拿大',
  'Brazil': '巴西',
  'Morocco': '摩洛哥',
  'Scotland': '苏格兰',
  'Haiti': '海地',
  'Germany': '德国',
  'Ecuador': '厄瓜多尔',
  'Japan': '日本',
  'Netherlands': '荷兰',
  'Sweden': '瑞典',
  'Tunisia': '突尼斯',
  'Belgium': '比利时',
  'Egypt': '埃及',
  'Spain': '西班牙',
  'Uruguay': '乌拉圭',
  'France': '法国',
  'Senegal': '塞内加尔',
  'Iraq': '伊拉克',
  'Norway': '挪威',
  'Argentina': '阿根廷',
  'Algeria': '阿尔及利亚',
  'Austria': '奥地利',
  'Jordan': '约旦',
  'Portugal': '葡萄牙',
  'Croatia': '克罗地亚',
  'England': '英格兰',
  'Colombia': '哥伦比亚',
  'Uzbekistan': '乌兹别克',
  'Ghana': '加纳',
  'Panama': '巴拿马',
};

interface TeamFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (teamName: string | null) => void;
  selectedTeam: string | null;
}

export function TeamFilterSheet({ isOpen, onClose, onSelect, selectedTeam }: TeamFilterSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter groups/teams based on search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return TEAMS_BY_GROUP;

    const q = searchQuery.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [group, teams] of Object.entries(TEAMS_BY_GROUP)) {
      const filtered = teams.filter(t => {
        const displayName = DISPLAY_NAMES[t] || t;
        return t.toLowerCase().includes(q) || displayName.includes(q);
      });
      if (filtered.length > 0) result[group] = filtered;
    }
    return result;
  }, [searchQuery]);

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
            className="fixed bottom-0 left-0 right-0 z-[1000] max-h-[75vh] overflow-hidden flex flex-col"
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
              <div className="text-[16px] font-black text-white tracking-wider">选择球队</div>
              <div className="flex items-center gap-3">
                {selectedTeam && (
                  <button
                    onClick={handleClear}
                    className="text-[12px] font-bold text-[#FFD700] px-2 py-0.5 rounded-md active:scale-95"
                    style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)' }}
                  >
                    清除筛选
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
                  placeholder="搜索球队..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-[13px] font-bold text-white placeholder:text-white/25 w-full"
                  style={{ fontFamily: 'Inter' }}
                />
              </div>
            </div>

            {/* Scrollable Team Grid */}
            <div className="overflow-y-auto px-5 pb-8 flex-1" style={{ scrollbarWidth: 'thin' }}>
              {Object.entries(filteredGroups).map(([group, teams]) => (
                <div key={group} className="mb-4">
                  <div className="text-[10px] font-black text-white/30 tracking-widest uppercase mb-2">
                    {group}组
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {teams.map((team) => {
                      const isSelected = selectedTeam === team;
                      const displayName = DISPLAY_NAMES[team] || team;
                      return (
                        <button
                          key={team}
                          onClick={() => handleSelect(team)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all active:scale-95"
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
                            width={22}
                            height={16}
                            style={{
                              width: '22px',
                              height: '16px',
                              objectFit: 'cover',
                              borderRadius: '2px',
                              border: '1px solid rgba(255,255,255,0.15)',
                              flexShrink: 0,
                            }}
                            loading="lazy"
                          />
                          <span
                            className="text-[12px] font-bold truncate"
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
                  <div className="text-[12px] font-bold text-white/50 tracking-widest">未找到匹配的球队</div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
