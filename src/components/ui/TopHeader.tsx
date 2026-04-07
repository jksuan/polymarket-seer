'use client';

import { Zap, Wallet } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { usePolymarketAuth } from '@/contexts/PolymarketAuthContext';
import { shortenAddress } from '@/lib/utils';

export function TopHeader() {
  const { login, authenticated } = usePrivy();
  const { proxyAddress, displayIdentifier, usdcBalance } = usePolymarketAuth();

  return (
    <div className="flex items-center justify-between px-4 mb-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(173,255,47,0.4)]" style={{ background: 'linear-gradient(135deg,#ADFF2F,#00F0FF)' }}>
          <div className="w-full h-full bg-[#0D0518] rounded-full flex items-center justify-center">
            <Zap size={14} fill="#ADFF2F" color="#ADFF2F" />
          </div>
        </div>
        <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'Inter', color: '#fff', letterSpacing: '-0.5px' }}>
          SEER<span style={{ color: '#ADFF2F' }}>.</span>SPORTS
        </span>
      </div>
      
      {/* Wallet */}
      <button
        onClick={() => !authenticated && login()}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full active:scale-95 transition-all"
        style={{
          background: authenticated ? 'rgba(255,255,255,0.05)' : 'rgba(173,255,47,0.08)',
          border: authenticated ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(173,255,47,0.5)',
          boxShadow: authenticated ? 'none' : '0 0 12px rgba(173,255,47,0.15)',
          color: authenticated ? '#dee5ff' : '#ADFF2F',
          fontFamily: 'Inter',
          fontWeight: 800,
          fontSize: '11px',
        }}
      >
        <Wallet size={12} />
        {authenticated ? (
          <div className="flex items-center gap-2 leading-none">
            <span className="text-[#ADFF2F]">{Number(usdcBalance || 0).toFixed(2)} USDC</span>
            <span className="text-white/40">|</span>
            <span className="text-white/70">{proxyAddress ? shortenAddress(proxyAddress, 4, 4) : displayIdentifier}</span>
          </div>
        ) : (
          '连接钱包'
        )}
      </button>
    </div>
  );
}
