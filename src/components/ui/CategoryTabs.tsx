'use client';

import { useRef } from 'react';
import { CATEGORIES } from '@/lib/mockMarkets';
import { SportCategory } from '@/types/sports';

interface CategoryTabsProps {
  active: SportCategory;
  onChange: (cat: SportCategory) => void;
}

export function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto px-4 py-2"
      style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
    >
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id as SportCategory)}
            className="flex-shrink-0 flex items-center gap-1 px-4 py-1.5 rounded-xl transition-all active:scale-95"
            style={{
              fontFamily: 'Inter',
              fontSize: '12px',
              fontWeight: 700,
              background: isActive
                ? 'linear-gradient(135deg, rgba(0,240,255,0.2) 0%, rgba(0,122,255,0.2) 100%)'
                : 'rgba(255,255,255,0.05)',
              border: isActive ? '1.5px solid #00F0FF' : '1.5px solid rgba(255,255,255,0.08)',
              color: isActive ? '#00F0FF' : '#666',
              boxShadow: isActive ? '0 0 12px rgba(0,240,255,0.25)' : 'none',
              textShadow: isActive ? '0 0 8px rgba(0,240,255,0.5)' : 'none',
              animation: isActive && cat.id === 'all' ? 'pulse 2s infinite' : 'none',
            }}
          >
            <span style={{ fontSize: '13px' }}>{cat.emoji}</span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}
