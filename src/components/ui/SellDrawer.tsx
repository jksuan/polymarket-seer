'use client';

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Zap, Target, Minus, Plus } from "lucide-react";

interface SellDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position: any | null;
  onMarketSell: (tokenId: string, shares: string) => void;
  onLimitSell: (tokenId: string, shares: string, price: number) => void;
}

// ── Helpers ─────────────────────────────────────────────────
// Convert $price → % win-rate string
const priceToWinRate = (price: number) => (price * 100);

// Convert % win-rate → $price
const winRateToPrice = (pct: number) => pct / 100;

// Step in % units based on tick size
const tickSizeToStep = (tickSize: string | number | undefined): number => {
  switch (String(tickSize)) {
    case "0.1":   return 10;
    case "0.01":  return 1;
    case "0.001": return 0.1;
    case "0.0001":return 0.01;
    default:      return 1;
  }
};

const stepDecimals = (step: number): number => {
  if (step >= 1) return 0;
  return step.toString().split(".")[1]?.length ?? 1;
};

// ── Row ──────────────────────────────────────────────────────
function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[#a3aac4] text-sm font-medium">{label}</span>
      <span
        className="text-sm font-bold"
        style={{ color: highlight ? "#dee5ff" : "#a3aac4" }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Stepper ──────────────────────────────────────────────────
function WinRateStepper({
  value,
  onChange,
  step,
  min,
  max,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  step: number;
  min: number;
  max: number;
}) {
  const decimals = stepDecimals(step);
  const [inputValue, setInputValue] = useState(value !== null ? value.toFixed(decimals) : "");

  // Sync internal input state when external value changes
  useEffect(() => {
    setInputValue(value !== null ? value.toFixed(decimals) : "");
  }, [value, decimals]);

  const decrement = () => {
    if (value === null) return;
    const next = parseFloat((Math.max(min, value - step)).toFixed(decimals));
    onChange(next);
  };
  const increment = () => {
    if (value === null) {
      onChange(min);
      return;
    }
    const next = parseFloat((Math.min(max, value + step)).toFixed(decimals));
    onChange(next);
  };

  const handleBlur = () => {
    let parsed = parseFloat(inputValue);
    // If empty or invalid, clear UI entirely, emit null, and do not revert.
    if (isNaN(parsed)) {
      setInputValue("");
      onChange(null);
      return;
    }
    
    // Clamp to min/max
    if (parsed < min) parsed = min;
    if (parsed > max) parsed = max;
    
    // Snap to nearest step precision based on tickSize
    const stepsCount = Math.round(parsed / step);
    parsed = stepsCount * step;
    
    // Re-clamp just in case rounding pushed it out
    if (parsed < min) parsed = min;
    if (parsed > max) parsed = max;

    const formatted = parseFloat(parsed.toFixed(decimals));
    setInputValue(formatted.toFixed(decimals));
    onChange(formatted);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9.]/g, '');
    
    if (decimals === 0) {
      val = val.replace(/\./g, '');
    } else {
      const parts = val.split('.');
      if (parts.length > 2) {
        val = parts[0] + '.' + parts.slice(1).join('');
      }
      if (val.includes('.')) {
        const p = val.split('.');
        if (p[1].length > decimals) {
          val = p[0] + '.' + p[1].slice(0, decimals);
        }
      }
    }

    if (parseFloat(val) > max) {
      val = val.slice(0, -1);
      if (parseFloat(val) > max) {
         val = max.toString();
      }
    }

    setInputValue(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const placeholderZero = parseFloat("0").toFixed(decimals);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={decrement}
        disabled={value === null || value <= min}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-30"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Minus size={14} color="#dee5ff" />
      </button>

      <div className="relative flex items-center">
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          placeholder={placeholderZero}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-[84px] text-center focus:border-[#00F0FF] py-1.5 pr-5 pl-1 rounded-lg font-bold text-white tabular-nums outline-none transition-colors placeholder:text-white/30"
          style={{ background: "rgba(0,240,255,0.08)", border: "1px solid rgba(0,240,255,0.25)", fontSize: "15px" }}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white font-bold opacity-60 pointer-events-none text-sm">%</span>
      </div>

      <button
        onClick={increment}
        disabled={value !== null && value >= max}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-all active:scale-90 disabled:opacity-30"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <Plus size={14} color="#dee5ff" />
      </button>
    </div>
  );
}

// ── Main Drawer Content ─────────────────────────────────────
function DrawerContent({ isOpen, onClose, position, onMarketSell, onLimitSell }: SellDrawerProps) {
  const [tab, setTab] = useState<"market" | "limit">("market");
  const [limitWinRate, setLimitWinRate] = useState<number | null>(50);
  const [fetchedTickSize, setFetchedTickSize] = useState<string | null>(null);

  const tickSize: string = fetchedTickSize || position?.tickSize || "0.01";
  const step = tickSizeToStep(tickSize);

  useEffect(() => {
    if (isOpen && position) {
      setTab("market");
      const activeTickSize = position.tickSize || "0.01";
      const curWr = priceToWinRate(position.curPrice || 0.5);

      const setLimit = (tkSize: string) => {
        const tempStep = tickSizeToStep(tkSize);
        const tempDecimals = stepDecimals(tempStep);
        const bumped = parseFloat(Math.min(99, curWr + tempStep).toFixed(tempDecimals));
        setLimitWinRate(bumped);
      };

      // If tickSize is not bundled, fetch from market API to get precision
      if (position.asset && !position.tickSize) {
        fetch(`https://clob.polymarket.com/tick-size?token_id=${position.asset}`)
          .then(res => res.json())
          .then(data => {
            if (data && data.minimum_tick_size) {
              const sz = String(data.minimum_tick_size);
              setFetchedTickSize(sz);
              setLimit(sz);
            } else {
              setLimit(activeTickSize);
            }
          })
          .catch(() => setLimit(activeTickSize));
      } else {
         setLimit(activeTickSize);
      }
    } else {
      setFetchedTickSize(null);
    }
  }, [isOpen, position]);

  if (!position) return null;

  const shares = Number(position.size || 0);
  const curPrice: number = position.curPrice || 0;
  const entryPrice: number = position.avgPrice || position.price || curPrice; // price at which user bought
  const curWinRate = priceToWinRate(curPrice);
  const entryWinRate = priceToWinRate(entryPrice);
  // stepDecimals controls the stepper step precision (from tickSize)
  const decimals = stepDecimals(step);
  // displayDecimals: always show 1 decimal for win rate display (e.g. 14.3%)
  const displayDecimals = Math.max(1, decimals);

  const isYes = String(position.outcome).toLowerCase() === 'yes';
  const displayTitle = (position.title || "未知市场").replace(/\.+$/, '');

  // Estimated income
  const estimatedMarket = (shares * curPrice).toFixed(2);
  const limitPriceNum = limitWinRate !== null ? winRateToPrice(limitWinRate) : null;
  const estimatedLimit = limitPriceNum !== null ? (shares * limitPriceNum).toFixed(2) : "0.00";

  // Invested principal: entry price × shares
  const principal = (shares * entryPrice).toFixed(2);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="sell-backdrop"
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
            key="sell-drawer"
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
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
              <h2 style={{ fontFamily: "Inter", fontWeight: 900, fontSize: 18, color: "#dee5ff", letterSpacing: "-0.5px" }}>
                卖出平仓
              </h2>
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

              {/* Asset Info — no shares shown */}
              <div className="flex gap-3 items-center bg-white/5 p-3 rounded-xl border border-white/5">
                {position.icon && (
                  <img src={position.icon} className="w-10 h-10 object-cover rounded-lg shrink-0" alt="" />
                )}
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-white text-xs font-medium truncate">{displayTitle}</span>
                  <div className="flex gap-2 items-center mt-1">
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${isYes ? "bg-[#6bff8f]/10 text-[#6bff8f]" : "bg-[#ff6b6b]/10 text-[#ff6b6b]"}`}
                    >
                      {position.outcome || "Unknown"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tab Toggle */}
              <div className="bg-[#192540] p-1 rounded-xl flex">
                <button
                  onClick={() => setTab("market")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5
                    ${tab === "market" ? "bg-white/10 text-white shadow-sm" : "text-[#a3aac4] hover:text-white"}`}
                >
                  <Zap size={14} /> 快速卖出
                </button>
                <button
                  onClick={() => setTab("limit")}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5
                    ${tab === "limit" ? "bg-white/10 text-white shadow-sm" : "text-[#a3aac4] hover:text-white"}`}
                >
                  <Target size={14} /> 限价挂单
                </button>
              </div>

              {/* Detail Panel */}
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex flex-col gap-3.5">

                {/* Common rows — no divider yet */}
                <InfoRow label="投入本金" value={`$${principal}`} />
                <InfoRow
                  label="入场胜率"
                  value={`${entryWinRate.toFixed(displayDecimals)}%`}
                />

                {/* ── Market Tab ── */}
                {tab === "market" && (
                  <>
                    <InfoRow
                      label="当前胜率"
                      value={`${curWinRate.toFixed(displayDecimals)}%`}
                      highlight
                    />
                    {/* divider above 预估卖出收入 */}
                    <div className="h-[1px] bg-white/5 w-full" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-[#a3aac4] text-sm font-medium">预估卖出收入</span>
                      <span
                        className="text-2xl font-black tracking-tight"
                        style={{ color: "#6bff8f" }}
                      >
                        ~${estimatedMarket}
                      </span>
                    </div>
                  </>
                )}

                {/* ── Limit Tab ── */}
                {tab === "limit" && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-[#a3aac4] text-sm font-medium">目标胜率</span>
                      <WinRateStepper
                        value={limitWinRate}
                        onChange={setLimitWinRate}
                        step={step}
                        min={parseFloat(step.toFixed(decimals))}
                        max={99}
                      />
                    </div>
                    {/* divider above 预估卖出收入 */}
                    <div className="h-[1px] bg-white/5 w-full" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-[#a3aac4] text-sm font-medium">预估卖出收入</span>
                      <span
                        className="text-2xl font-black tracking-tight"
                        style={{ color: "#00F0FF" }}
                      >
                        ~${estimatedLimit}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Action Button */}
              <div className="mb-4">
                {tab === "market" ? (
                  <button
                    onClick={() => position.asset && onMarketSell(position.asset, String(shares))}
                    className="w-full text-white font-bold py-3.5 rounded-2xl active:scale-95 transition-all text-base shadow-[0_0_20px_rgba(0,153,255,0.35)]"
                    style={{ background: "linear-gradient(90deg, #0099FF, #0060CC)" }}
                  >
                    立即卖出
                  </button>
                ) : (
                  <button
                    onClick={() => limitPriceNum !== null && position.asset && onLimitSell(position.asset, String(shares), limitPriceNum)}
                    disabled={limitPriceNum === null}
                    className="w-full font-bold py-3.5 rounded-2xl active:scale-95 transition-all text-base border shadow-[0_0_20px_rgba(0,240,255,0.12)] disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
                    style={{
                      background: "rgba(0,240,255,0.08)",
                      border: "1px solid rgba(0,240,255,0.4)",
                      color: "#00F0FF",
                    }}
                  >
                    提交限价卖单
                  </button>
                )}
                <p className="text-center text-[11px] text-[#a3aac4]/60 mt-3 tracking-wide">
                  本交易由您的智能合约钱包在 Polygon 链上免 Gas 费执行。
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
export function SellDrawer(props: SellDrawerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return createPortal(<DrawerContent {...props} />, document.body);
}
