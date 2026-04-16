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
      className="flex gap-1 overflow-x-auto pl-1.5 pr-4 py-1"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {PRIMARY_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-2 transition-all active:scale-95 relative"
            style={{
              fontFamily: 'Inter',
              fontSize: '13px',
              fontWeight: isActive ? 800 : 600,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.4)',
              background: 'transparent',
              borderBottom: '2.5px solid transparent',
            }}
          >
            <tab.icon 
              size={15} 
              style={{ 
                color: isActive ? '#FFD700' : 'rgba(255,255,255,0.4)', 
                strokeWidth: isActive ? 2.5 : 2
              }} 
            />
            {tab.label}
            
            {/* Strict content-width underline */}
            {isActive && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 h-[2.5px] bg-[#FFD700] rounded-t-sm" 
                style={{ width: 'calc(100% - 20px)', bottom: '-2.5px' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
