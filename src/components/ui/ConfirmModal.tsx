'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, X, Zap } from 'lucide-react';
import { SportMarket } from '@/types/sports';
import confetti from 'canvas-confetti';

interface ConfirmModalProps {
  isOpen: boolean;
  market: SportMarket;
  side: 'home' | 'away' | 'draw';
  onConfirm: (amount: number) => void;
  onCancel: () => void;
  amount?: number;
}

const AMOUNTS = [5, 10, 25, 50];

export function ConfirmModal({ isOpen, market, side, onConfirm, onCancel, amount: defaultAmount = 10 }: ConfirmModalProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [confirmed, setConfirmed] = useState(false);

  // If component receives market as undefined, return null to avoid crashes
  if (!market) return null;

  const team = side === 'home' ? market.homeTeam : side === 'draw' && market.drawTeam ? market.drawTeam : market.awayTeam;
  const odds = side === 'home' ? market.homeOdds : side === 'draw' && market.drawOdds !== undefined ? market.drawOdds : market.awayOdds;
  const expectedReturn = (amount * odds).toFixed(2);
  const profit = ((amount * odds) - amount).toFixed(2);

  const handleConfirm = () => {
    setConfirmed(true);
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: [team.accentColor, team.primaryColor, '#ADFF2F', '#00F0FF'],
    });
    setTimeout(() => {
        onConfirm(amount);
        setConfirmed(false); // reset state for next time
    }, 1800);
  };

  const handleCancel = () => {
      setConfirmed(false);
      onCancel();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end items-center">
          {/* Backdrop */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={handleCancel}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="relative w-full max-w-md rounded-t-[32px] p-6 pb-10"
            style={{
              background: 'linear-gradient(160deg, rgba(30,15,55,0.98), rgba(18,9,36,0.98))',
              border: '1px solid rgba(255,255,255,0.1)',
              borderBottom: 'none',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.7)',
            }}
          >
          {confirmed ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center py-8 gap-4"
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #ADFF2F, #00CC44)',
                  boxShadow: '0 0 30px rgba(173,255,47,0.5)',
                }}
              >
                <CheckCircle size={32} color="#0D0518" strokeWidth={3} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '18px', color: '#fff' }}>
                  下单成功！🎉
                </p>
                <p style={{ fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                  支持 {team.displayName} · ${amount} USDC
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Zap size={18} color="#ADFF2F" fill="#ADFF2F" />
                  <span style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '17px', color: '#fff' }}>
                    确认下单
                  </span>
                </div>
                <button
                  onClick={handleCancel}
                  className="w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X size={16} color="rgba(255,255,255,0.6)" />
                </button>
              </div>

              {/* Market info card */}
              <div
                className="p-4 rounded-2xl mb-5"
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: `1px solid ${team.accentColor}33`,
                }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {/* Team badge mini */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      background: team.primaryColor,
                      border: `2px solid ${team.accentColor}`,
                      boxShadow: `0 0 12px ${team.glowColor}`,
                      fontFamily: 'Inter',
                      fontWeight: 900,
                      fontSize: '10px',
                      color: '#fff',
                    }}
                  >
                    {team.shortName}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '14px', color: team.accentColor }}>
                      {team.displayName} ({team.shortName})
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      {market.leagueName} · {side === 'home' ? '主队' : '客队'}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    <div style={{ fontFamily: 'Inter', fontWeight: 900, fontStyle: 'italic', fontSize: '22px', color: '#fff' }}>
                      {odds.toFixed(2)}x
                    </div>
                    <div style={{ fontFamily: 'Inter', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                      赔率
                    </div>
                  </div>
                </div>
                <div
                  className="h-px w-full my-2"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                />
                <div className="flex justify-between">
                  <div>
                    <div style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      预计回报
                    </div>
                    <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '20px', color: '#ADFF2F' }}>
                      ${expectedReturn}
                    </div>
                    <div style={{ fontSize: '11px', fontFamily: 'Inter', color: 'rgba(173,255,47,0.6)' }}>
                      +${profit} 利润
                    </div>
                  </div>
                  <div className="text-right">
                    <div style={{ fontSize: '10px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      胜率
                    </div>
                    <div style={{ fontFamily: 'Inter', fontWeight: 900, fontSize: '20px', color: '#fff' }}>
                      {side === 'home' ? market.homeProbability : market.awayProbability}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount selector */}
              <div className="mb-5">
                <div
                  style={{ fontSize: '11px', fontFamily: 'Inter', fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}
                >
                  投注金额 (USDC)
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className="py-2 rounded-xl active:scale-95 transition-transform"
                      style={{
                        fontFamily: 'Inter',
                        fontWeight: 700,
                        fontSize: '14px',
                        background: amount === a
                          ? `linear-gradient(135deg, ${team.primaryColor}, ${team.accentColor}44)`
                          : 'rgba(255,255,255,0.07)',
                        border: amount === a ? `1.5px solid ${team.accentColor}` : '1.5px solid rgba(255,255,255,0.08)',
                        color: amount === a ? team.accentColor : 'rgba(255,255,255,0.5)',
                        boxShadow: amount === a ? `0 0 12px ${team.glowColor}` : 'none',
                      }}
                    >
                      ${a}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                className="w-full py-4 rounded-2xl active:scale-97 transition-transform"
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 900,
                  fontSize: '16px',
                  background: 'linear-gradient(135deg, #ADFF2F, #00CC44)',
                  color: '#0D0518',
                  boxShadow: '0 6px 24px rgba(173,255,47,0.4)',
                  letterSpacing: '0.02em',
                }}
              >
                🚀 确认下注 ${amount} USDC
              </button>

              <p
                style={{
                  fontSize: '10px',
                  fontFamily: 'Inter',
                  color: 'rgba(255,255,255,0.25)',
                  textAlign: 'center',
                  marginTop: '10px',
                }}
              >
                由 Polymarket 提供预测市场 · 需要连接钱包
              </p>
            </>
          )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
