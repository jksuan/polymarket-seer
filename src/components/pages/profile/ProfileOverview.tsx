import { motion } from "motion/react";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useProfileStats } from "./useProfileStats";

export interface ProfileOverviewProps {
  trades: any[];
  positions: any[];
}

export function ProfileOverview({ trades, positions }: ProfileOverviewProps) {
  const {
    historyInvested,
    historyRevenue,
    currentInvested,
    currentValue,
    distributionData,
    totalPnl,
    historyNetProfit,
    currentUnrealizedPnl,
    currentUnrealizedPct
  } = useProfileStats(trades, positions);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-3 w-full relative z-20">
        
        {/* ── 历史流水账本 (Top Card) ── */}
        <div
          className="p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between gap-4"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Main Profit Number */}
          <div className="flex flex-col relative z-10 h-full">
            <div
              style={{
                fontSize: "11px", fontFamily: "Inter", fontWeight: 600,
                color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              全周期总净盈亏 (Net Cash)
            </div>
            <div className="flex items-baseline gap-2 mt-1 flex-1">
              <span
                style={{
                  fontSize: "32px", fontFamily: "Inter", fontWeight: 900,
                  color: historyNetProfit >= 0 ? "#ADFF2F" : "#ff6b6b",
                  letterSpacing: "-0.02em",
                  textShadow: historyNetProfit >= 0 ? "0 0 16px rgba(173,255,47,0.3)" : "0 0 16px rgba(255,107,107,0.3)",
                }}
              >
                {historyNetProfit >= 0 ? '+' : '-'}${Math.abs(historyNetProfit).toFixed(2)}
              </span>
            </div>
            
            {/* Supporting Breakdown */}
            <div className="flex justify-between items-end border-t border-white/10 pt-2 mt-auto">
              <div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">总投入(买入)</span>
                <div className="text-[13px] font-black text-white/80">${historyInvested.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">总收入(卖出+兑换)</span>
                <div className="text-[13px] font-black text-white/80">${historyRevenue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 当前持仓阵地 (Bottom Card) ── */}
        <div
          className="p-4 rounded-3xl relative overflow-hidden flex flex-col gap-3 w-full"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Subtle background glow based on unrealized PnL */}
          <div className={`absolute -right-10 -bottom-10 w-32 h-32 opacity-10 blur-3xl rounded-full ${currentUnrealizedPnl >= 0 ? 'bg-[#ADFF2F]' : 'bg-[#ff6b6b]'}`} />

          {/* Title */}
          <div
            className="relative z-10 border-b border-white/10 pb-3 mb-1"
            style={{
              fontSize: "11px", fontFamily: "Inter", fontWeight: 600,
              color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em",
            }}
          >
            当前持仓
          </div>

          <div className="flex w-full">
            <div className="flex-1 flex flex-col items-center relative z-10 border-r border-white/10">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">总本金</div>
              <div className="text-[16px] font-black text-white">${currentInvested.toFixed(2)}</div>
            </div>
            
            <div className="flex-1 flex flex-col items-center relative z-10 border-r border-white/10">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">总价值</div>
              <div className="text-[16px] font-black text-[#00F0FF]">${currentValue.toFixed(2)}</div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: currentUnrealizedPnl >= 0 ? "rgba(173,255,47,0.7)" : "rgba(255,107,107,0.7)" }}>浮动盈亏</div>
              <div className="flex flex-col items-center">
                 <div className={`text-[15px] font-black leading-none ${currentUnrealizedPnl >= 0 ? 'text-[#ADFF2F]' : 'text-[#ff6b6b]'}`}>
                   {currentUnrealizedPnl >= 0 ? '+' : '-'}${Math.abs(currentUnrealizedPnl).toFixed(2)}
                 </div>
                 <div className={`text-[10px] font-bold mt-1 leading-none ${currentUnrealizedPnl > 0 ? 'text-[#ADFF2F]/70' : currentUnrealizedPnl < 0 ? 'text-[#ff6b6b]/70' : 'text-white/30'}`}>
                   ({currentUnrealizedPnl > 0 ? '+' : ''}{currentUnrealizedPct.toFixed(1)}%)
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Domain Distribution (PieChart) ── */}
      <div className="w-full mb-6 relative z-20">
        <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
              收益构成
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              {distributionData.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 flex-shrink-0 rounded-full" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}80` }} />
                  <span className="text-[12px] font-bold text-white/80">{item.name}</span>
                  <span className="text-[12px] font-black tabular-nums" style={{ color: (item as any).pnl >= 0 ? '#4ade80' : '#f87171' }}>
                    {(item as any).pnl >= 0 ? '+' : ''}{(item as any).pnl.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[110px] h-[110px] relative flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  innerRadius={36}
                  outerRadius={52}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center: total PnL */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">总盈亏</span>
              <span className="text-[12px] font-black mt-0.5" style={{ color: totalPnl >= 0 ? '#4ade80' : '#f87171' }}>
                {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
