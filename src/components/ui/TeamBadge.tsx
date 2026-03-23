'use client';

import { motion } from 'motion/react';
import { TeamInfo } from '@/types/sports';

interface TeamBadgeProps {
  team: TeamInfo;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLive?: boolean;
  shape?: 'circle' | 'rounded';
}

const SIZES = {
  sm: { outer: 48, inner: 36, fontSize: '10px' },
  md: { outer: 60, inner: 46, fontSize: '11px' },
  lg: { outer: 96, inner: 72, fontSize: '16px' },
  xl: { outer: 120, inner: 90, fontSize: '20px' },
} as const;

export function TeamBadge({ team, size = 'md', isLive = false, shape = 'circle' }: TeamBadgeProps) {
  const dims = SIZES[size];
  const radius = shape === 'circle' ? '50%' : '28%';

  return (
    <div className="relative flex items-center justify-center" style={{ width: dims.outer, height: dims.outer }}>
      {/* Glow ring */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: radius,
          boxShadow: `0 0 ${size === 'lg' ? 28 : 18}px ${team.glowColor}`,
        }}
      />

      {/* Spinning dashed border (live only) */}
      {isLive && (
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
          style={{
            borderRadius: radius,
            border: `2px dashed ${team.accentColor}`,
            opacity: 0.6,
          }}
        />
      )}

      {/* Badge background */}
      <div
        style={{
          width: dims.inner,
          height: dims.inner,
          borderRadius: radius,
          background: `linear-gradient(145deg, ${team.primaryColor}dd, ${team.primaryColor}88)`,
          border: `2px solid ${team.accentColor}66`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter',
          fontWeight: 900,
          fontSize: dims.fontSize,
          color: '#FFFFFF',
          letterSpacing: '-0.5px',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          boxShadow: `inset 0 1px 4px rgba(255,255,255,0.1)`,
        }}
      >
        {team.shortName}
      </div>
    </div>
  );
}
