'use client';

import { useRef } from 'react';
import { PRIMARY_TABS } from '@/lib/mockMarkets';
import { PrimaryTab } from '@/types/sports';

interface CategoryTabsProps {
  active: PrimaryTab;
  onChange: (tab: PrimaryTab) => void;
}

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1 overflow-x-auto px-4 py-1"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {PRIMARY_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 transition-all active:scale-95 relative"
            style={{
              fontFamily: 'Inter',
              fontSize: '13px',
              fontWeight: isActive ? 800 : 600,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
              background: 'transparent',
              borderBottom: isActive ? '2.5px solid #FFD700' : '2.5px solid transparent',
            }}
          >
            <span style={{ fontSize: '14px' }}>{tab.emoji}</span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
