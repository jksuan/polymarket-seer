'use client';

import { useRef, useState } from 'react';
import { MATCH_SUB_TABS, OUTRIGHT_SUB_TABS, WORLD_CUP_GROUPS, WORLD_CUP_KNOCKOUTS } from '@/lib/mockMarkets';
import { PrimaryTab, MatchSubTab, OutrightSubTab } from '@/types/sports';
import { AnimatePresence, motion } from 'motion/react';

interface SubTabsProps {
  primaryTab: PrimaryTab;
  activeMatchSub: MatchSubTab;
  activeOutrightSub: OutrightSubTab;
  selectedGroup: string;
  selectedKnockout: string;
  onMatchSubChange: (sub: MatchSubTab) => void;
  onOutrightSubChange: (sub: OutrightSubTab) => void;
  onGroupChange: (group: string) => void;
  onKnockoutChange: (knockout: string) => void;
}

export function SubTabs({
  primaryTab,
  activeMatchSub,
  activeOutrightSub,
  selectedGroup,
  selectedKnockout,
  onMatchSubChange,
  onOutrightSubChange,
  onGroupChange,
  onKnockoutChange,
}: SubTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showKnockoutPicker, setShowKnockoutPicker] = useState(false);

  // Only render sub-tabs for matches & outrights
  if (primaryTab !== 'matches' && primaryTab !== 'outrights') return null;

  const tabs = primaryTab === 'matches' ? MATCH_SUB_TABS : OUTRIGHT_SUB_TABS;
  const activeId = primaryTab === 'matches' ? activeMatchSub : activeOutrightSub;

  const handleClick = (id: string) => {
    if (primaryTab === 'matches') {
      if (id === 'group') {
        setShowGroupPicker((prev) => !prev);
        setShowKnockoutPicker(false);
        onMatchSubChange('group');
      } else if (id === 'knockout') {
        setShowKnockoutPicker((prev) => !prev);
        setShowGroupPicker(false);
        onMatchSubChange('knockout');
      } else {
        setShowGroupPicker(false);
        setShowKnockoutPicker(false);
        onMatchSubChange(id as MatchSubTab);
      }
    } else {
      onOutrightSubChange(id as OutrightSubTab);
    }
  };

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-1.5"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          const isGroupActive = tab.id === 'group' && activeMatchSub === 'group';
          const isKnockoutActive = tab.id === 'knockout' && activeMatchSub === 'knockout';
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab.id)}
              className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{
                fontFamily: 'Inter',
                fontSize: '11px',
                fontWeight: 700,
                background: isActive
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.2) 0%, rgba(255,165,0,0.15) 100%)'
                  : 'rgba(255,255,255,0.05)',
                border: isActive ? '1.5px solid rgba(255,215,0,0.5)' : '1.5px solid rgba(255,255,255,0.08)',
                color: isActive ? '#FFD700' : 'rgba(255,255,255,0.45)',
                boxShadow: isActive ? '0 0 10px rgba(255,215,0,0.15)' : 'none',
              }}
            >
              {tab.label}
              {isGroupActive && selectedGroup && (
                <span style={{ color: '#FFD700', fontWeight: 900, marginLeft: '2px' }}>{selectedGroup}组</span>
              )}
              {isKnockoutActive && selectedKnockout && (
                <span style={{ color: '#FFD700', fontWeight: 900, marginLeft: '2px' }}>{selectedKnockout}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Group Picker Popover */}
      <AnimatePresence>
        {showGroupPicker && primaryTab === 'matches' && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute left-4 right-4 z-50 mt-1 p-3 rounded-2xl"
            style={{
              background: 'linear-gradient(160deg, rgba(35,20,60,0.98), rgba(20,12,38,0.98))',
              border: '1px solid rgba(255,215,0,0.2)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            }}
          >
            <div
              style={{
                fontFamily: 'Inter',
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '8px',
              }}
            >
              选择小组
            </div>
            <div className="grid grid-cols-6 gap-2">
              {WORLD_CUP_GROUPS.map((g) => {
                const isSelected = selectedGroup === g;
                return (
                  <button
                    key={g}
                    onClick={() => {
                      onGroupChange(g);
                      setShowGroupPicker(false);
                    }}
                    className="py-2 rounded-xl active:scale-90 transition-all"
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 800,
                      fontSize: '13px',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,165,0,0.2))'
                        : 'rgba(255,255,255,0.06)',
                      border: isSelected ? '1.5px solid rgba(255,215,0,0.6)' : '1.5px solid rgba(255,255,255,0.06)',
                      color: isSelected ? '#FFD700' : 'rgba(255,255,255,0.5)',
                      boxShadow: isSelected ? '0 0 8px rgba(255,215,0,0.2)' : 'none',
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Knockout Picker Popover */}
      <AnimatePresence>
        {showKnockoutPicker && primaryTab === 'matches' && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute left-4 right-4 z-50 mt-1 p-3 rounded-2xl"
            style={{
              background: 'linear-gradient(160deg, rgba(35,20,60,0.98), rgba(20,12,38,0.98))',
              border: '1px solid rgba(255,215,0,0.2)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            }}
          >
            <div
              style={{
                fontFamily: 'Inter',
                fontSize: '10px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '8px',
              }}
            >
              选择淘汰赛轮次
            </div>
            <div className="grid grid-cols-3 gap-2">
              {WORLD_CUP_KNOCKOUTS.map((k) => {
                const isSelected = selectedKnockout === k;
                return (
                  <button
                    key={k}
                    onClick={() => {
                      onKnockoutChange(k);
                      setShowKnockoutPicker(false);
                    }}
                    className="py-2 rounded-xl active:scale-95 transition-all text-center"
                    style={{
                      fontFamily: 'Inter',
                      fontWeight: 800,
                      fontSize: '12px',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255,215,0,0.3), rgba(255,165,0,0.2))'
                        : 'rgba(255,255,255,0.06)',
                      border: isSelected ? '1.5px solid rgba(255,215,0,0.6)' : '1.5px solid rgba(255,255,255,0.06)',
                      color: isSelected ? '#FFD700' : 'rgba(255,255,255,0.5)',
                      boxShadow: isSelected ? '0 0 8px rgba(255,215,0,0.2)' : 'none',
                    }}
                  >
                    {k}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
