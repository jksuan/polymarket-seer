'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Archive, Trophy, AlertCircle } from "lucide-react";

interface RedeemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position: any | null;
  /** Called when user confirms the on-chain redeem action */
  onConfirm: (position: any) => void;
}

// ── Main Drawer Content ──────────────────────────────────────
function DrawerContent({ isOpen, onClose, position, onConfirm }: RedeemDrawerProps) {
  if (!position) return null;

  const isWon = position._marketStatus === "won";
  const displayTitle = (position.title || "未知市场").replace(/\.+$/, "");
  const initialVal = position.initialValue || position.totalBought || 0;
  const currentVal = position.currentValue || 0;
  const expectedReturn = position.size || 0;

  // Color scheme differs between winning (gold/green) and losing (grey/muted)
  const accentColor = isWon ? "#ADFF2F" : "#a3aac4";
  const accentBg = isWon ? "rgba(173,255,47,0.08)" : "rgba(255,255,255,0.04)";
  const accentBorder = isWon ? "rgba(173,255,47,0.25)" : "rgba(255,255,255,0.08)";
  const btnBg = isWon
    ? "linear-gradient(90deg, #7edd00, #ADFF2F)"
    : "rgba(255,255,255,0.08)";
  const btnColor = isWon ? "#0D0518" : "#a3aac4";
  const btnBorder = isWon ? "none" : "1px solid rgba(255,255,255,0.12)";
  const btnShadow = isWon ? "0 0 24px rgba(173,255,47,0.3)" : "none";

  const subtitleLost = '点击「归档」将此记录标记为已结束，不产生任何链上交易';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="redeem-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 9998,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(5px)",
              WebkitBackdropFilter: "blur(5px)",
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            key="redeem-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
              maxWidth: "448px", margin: "0 auto",
              background: "linear-gradient(180deg, #1A0D2E 0%, #0D0518 100%)",
              borderRadius: "24px 24px 0 0",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.8)",
              maxHeight: "90vh", overflowY: "auto" as const,
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                {isWon
                  ? <Trophy size={18} style={{ color: "#ADFF2F" }} />
                  : <Archive size={18} style={{ color: "#a3aac4" }} />
                }
                <h2 style={{ fontFamily: "Inter", fontWeight: 900, fontSize: 18, color: "#dee5ff", letterSpacing: "-0.5px" }}>
                  {isWon ? "兑换领奖" : "归档持仓"}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <X size={16} color="#a3aac4" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 flex flex-col gap-4">

              {/* Status Banner */}
              <div
                className="p-3 rounded-xl flex items-center gap-3"
                style={{ background: accentBg, border: `1px solid ${accentBorder}` }}
              >
                {isWon
                  ? <Trophy size={20} style={{ color: "#ADFF2F", flexShrink: 0 }} />
                  : <AlertCircle size={20} style={{ color: "#a3aac4", flexShrink: 0 }} />
                }
                <div>
                  <div className="text-[12px] font-bold" style={{ color: accentColor }}>
                    {isWon ? "🎉 恭喜！您的预测正确" : "· 此盘口已结束，预测未中"}
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">
                    {isWon
                      ? "点击下方按钮，在链上兑换您的奖励 USDC"
                      : subtitleLost}
                  </div>
                </div>
              </div>

              {/* Market Info */}
              <div className="flex gap-3 items-center bg-white/5 p-3 rounded-xl border border-white/5">
                {position.icon && (
                  <img src={position.icon} className="w-10 h-10 object-cover rounded-lg shrink-0" alt="" />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-white text-xs font-medium truncate">{displayTitle}</span>
                  {position.outcome && (
                    <div className="flex gap-2 items-center mt-1">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                        style={{
                          background: isWon ? "rgba(173,255,47,0.12)" : "rgba(255,107,107,0.12)",
                          color: isWon ? "#ADFF2F" : "#ff6b6b",
                        }}
                      >
                        {position.outcome}
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: isWon ? "#ADFF2F" : "#ff6b6b" }}>
                        {isWon ? "✓ 预测正确" : "✗ 预测未中"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[#a3aac4] text-sm font-medium">投入本金</span>
                  <span className="text-sm font-bold text-[#dee5ff]">${Number(initialVal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#a3aac4] text-sm font-medium">当前价值</span>
                  <span className="text-sm font-bold" style={{ color: isWon ? "#ADFF2F" : "#ff6b6b" }}>
                    ${Number(currentVal).toFixed(2)}
                  </span>
                </div>

                {isWon && (
                  <>
                    <div className="h-[1px] bg-white/5 w-full" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-[#a3aac4] text-sm font-medium">可领取奖励</span>
                      <span className="text-2xl font-black tracking-tight" style={{ color: "#ADFF2F" }}>
                        ~${Number(expectedReturn).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                {!isWon && (
                  <>
                    <div className="h-[1px] bg-white/5 w-full" />
                    <div className="flex justify-between items-center">
                      <span className="text-[#a3aac4] text-sm font-medium">亏损金额</span>
                      <span className="text-sm font-bold text-[#ff6b6b]">
                        -${Number(initialVal).toFixed(2)} (100%)
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Note for lost position */}
              {!isWon && (
                <div
                  className="p-3 rounded-xl text-[11px] text-[#a3aac4]/70 leading-relaxed"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  ℹ️ 归档操作会调用链上合约，销毁钱包中已归零的代币，清理链上状态。
                  不会产生额外费用，也不会扣减任何资金，交易由 Relayer 免 Gas 执行。
                </div>
              )}

              {/* Action Button */}
              <div className="mb-4">
                <button
                  onClick={() => onConfirm(position)}
                  className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all text-base"
                  style={{
                    background: btnBg,
                    color: btnColor,
                    border: btnBorder,
                    boxShadow: btnShadow,
                  }}
                >
                  {isWon ? "🏆 立即兑换领奖" : "📦 归档"}
                </button>
                <p className="text-center text-[11px] text-[#a3aac4]/60 mt-3 tracking-wide">
                  {isWon
                    ? "此操作将调用 Polymarket CTF 合约，在 Polygon 链上兑换您的奖励。"
                    : "本交易由您的智能合约钱包在 Polygon 链上免 Gas 费执行。"}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Portal Wrapper ───────────────────────────────────────────
export function RedeemDrawer(props: RedeemDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<DrawerContent {...props} />, document.body);
}
