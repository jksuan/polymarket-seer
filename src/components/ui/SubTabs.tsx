'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MATCH_SUB_TABS, WORLD_CUP_GROUPS, WORLD_CUP_KNOCKOUTS } from '@/lib/mockMarkets';
import { MatchSubTab, PrimaryTab } from '@/types/sports';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from '@/i18n';

export interface SubTabsProps {
  primaryTab: PrimaryTab;
  matchSub: MatchSubTab;
  onMatchSubChange: (tab: MatchSubTab) => void;
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  selectedKnockout: string;
  onKnockoutChange: (knockout: string) => void;
}

export function SubTabs({
  primaryTab,
  matchSub,
  onMatchSubChange,
  selectedGroup,
  selectedKnockout,
  onGroupChange,
  onKnockoutChange,
}: SubTabsProps) {
  const { t } = useTranslation();
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showKnockoutPicker, setShowKnockoutPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // The BottomSheet portal components now handle their own click-outside via full-screen backdrops,
  // so we safely removed the document-level mousedown listener that was causing click interceptions.

  // Only render sub-tabs for matches
  if (primaryTab !== 'matches') return null;

  const handleClick = (id: MatchSubTab) => {
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
  };

  return (
    <div className="relative pt-2.5" ref={containerRef}>
      <div
        className="flex gap-2 overflow-x-auto px-4 py-1.5 no-scrollbar items-center"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {MATCH_SUB_TABS.map((tab) => {
          const isActive = matchSub === tab.id;
          const isGroupActive = tab.id === 'group' && matchSub === 'group';
          const isKnockoutActive = tab.id === 'knockout' && matchSub === 'knockout';
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab.id as MatchSubTab)}
              className="flex-shrink-0 flex items-center gap-1 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
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
              {{
                hot: t.home.hotOverview,
                group: t.home.groupPicker,
                knockout: t.home.knockoutPicker,
                ended: t.home.endedTab,
              }[tab.id] || tab.label}
              {isGroupActive && selectedGroup && (
                <span style={{ color: '#FFD700', fontWeight: 900, marginLeft: '2px' }}>{t.standings.groupPrefix}{selectedGroup}{t.standings.groupSuffix}</span>
              )}
              {isKnockoutActive && selectedKnockout && (
                <span style={{ color: '#FFD700', fontWeight: 900, marginLeft: '2px' }}>{t.home.knockoutsTrans[selectedKnockout as keyof typeof t.home.knockoutsTrans]}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Group Picker Bottom Sheet */}
      <GroupFilterSheet
        isOpen={showGroupPicker && primaryTab === 'matches'}
        onClose={() => setShowGroupPicker(false)}
        selectedGroup={selectedGroup}
        onSelect={onGroupChange}
      />

      {/* Knockout Picker Bottom Sheet */}
      <KnockoutFilterSheet
        isOpen={showKnockoutPicker && primaryTab === 'matches'}
        onClose={() => setShowKnockoutPicker(false)}
        selectedKnockout={selectedKnockout}
        onSelect={onKnockoutChange}
      />
    </div>
  );
}

// ── Group Filter Bottom Sheet ──
function GroupFilterSheetContent({ isOpen, onClose, selectedGroup, onSelect }: any) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] overflow-hidden flex flex-col"
            style={{
              maxWidth: '480px',
              margin: '0 auto',
              borderRadius: '24px 24px 0 0',
              background: 'linear-gradient(180deg, rgba(30,20,55,0.98), rgba(12,6,24,0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
              maxHeight: '85vh',
            }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20"></div>
            </div>
            <div className="px-5 py-3 shrink-0">
              <div className="text-[16px] font-black text-white tracking-wider">{t.home.selectGroupTitle}</div>
            </div>
            <div className="overflow-y-auto px-5 pb-8 flex-1" style={{ scrollbarWidth: 'none' }}>
              <div className="grid grid-cols-4 gap-3">
                {WORLD_CUP_GROUPS.map((g) => {
                  const isSelected = selectedGroup === g;
                  return (
                    <button
                      key={g}
                      onClick={() => {
                        onSelect(g);
                        onClose();
                      }}
                      className="py-4 rounded-2xl active:scale-95 transition-all text-center flex items-center justify-center"
                      style={{
                        fontFamily: 'Inter',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))'
                          : 'rgba(255,255,255,0.04)',
                        border: isSelected
                          ? '1.5px solid rgba(255,215,0,0.5)'
                          : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isSelected ? '0 0 12px rgba(255,215,0,0.15)' : 'none',
                      }}
                    >
                      <span className="text-[16px] font-black" style={{ color: isSelected ? '#FFD700' : 'rgba(255,255,255,0.7)' }}>
                        {t.standings.groupPrefix}{g}{t.standings.groupSuffix}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GroupFilterSheet(props: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<GroupFilterSheetContent {...props} />, document.body);
}

// ── Knockout Filter Bottom Sheet ──
function KnockoutFilterSheetContent({ isOpen, onClose, selectedKnockout, onSelect }: any) {
  const { t } = useTranslation();
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0 z-[1000] overflow-hidden flex flex-col"
            style={{
              maxWidth: '480px',
              margin: '0 auto',
              borderRadius: '24px 24px 0 0',
              background: 'linear-gradient(180deg, rgba(30,20,55,0.98), rgba(12,6,24,0.99))',
              border: '1px solid rgba(255,255,255,0.08)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
              maxHeight: '85vh',
            }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20"></div>
            </div>
            <div className="px-5 py-3 shrink-0">
              <div className="text-[16px] font-black text-white tracking-wider">{t.home.selectKnockoutTitle}</div>
            </div>
            <div className="overflow-y-auto px-5 pb-8 flex-1" style={{ scrollbarWidth: 'none' }}>
              <div className="grid grid-cols-2 gap-3">
                {WORLD_CUP_KNOCKOUTS.map((k) => {
                  const isSelected = selectedKnockout === k;
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        onSelect(k);
                        onClose();
                      }}
                      className="py-4 rounded-2xl active:scale-95 transition-all text-center flex items-center justify-center"
                      style={{
                        fontFamily: 'Inter',
                        background: isSelected
                          ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,165,0,0.1))'
                          : 'rgba(255,255,255,0.04)',
                        border: isSelected
                          ? '1.5px solid rgba(255,215,0,0.5)'
                          : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isSelected ? '0 0 12px rgba(255,215,0,0.15)' : 'none',
                      }}
                    >
                      <span className="text-[14px] font-bold" style={{ color: isSelected ? '#FFD700' : 'rgba(255,255,255,0.7)' }}>
                        {t.home.knockoutsTrans[k as keyof typeof t.home.knockoutsTrans]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function KnockoutFilterSheet(props: any) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<KnockoutFilterSheetContent {...props} />, document.body);
}
