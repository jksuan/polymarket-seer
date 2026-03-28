import { motion } from "motion/react";
import { useProfileStats } from "./useProfileStats";
import { CategoryPnlChart } from "./CategoryPnlChart";
import { useSportCategories } from "@/hooks/useSportCategories";

export interface ProfileOverviewProps {
  trades: any[];
  positions: any[];
}

export function ProfileOverview({ trades, positions }: ProfileOverviewProps) {
  const { leagueToSport, keywords, iconToCategory } = useSportCategories();

  const {
    historyInvested,
    historyRevenue,
    currentInvested,
    currentValue,
    historyNetProfit,
    currentUnrealizedPnl,
    currentUnrealizedPct,

    categoryPnlData,
  } = useProfileStats(trades, positions, leagueToSport, keywords, iconToCategory);

  const hasCategoryData = categoryPnlData && categoryPnlData.length > 0;

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
              总净盈亏 · 全周期
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



      {/* ── 分类盈亏条形图 ── */}
      <div className="w-full mb-6 relative z-20">
        <div
          className="p-4 rounded-3xl"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
              分类盈亏 · 全周期
            </div>
            {hasCategoryData && (
              <div className="text-[10px] text-white/25 font-medium">
                自动分类 · {categoryPnlData.length} 类
              </div>
            )}
          </div>
          <div className="w-full">
            {hasCategoryData ? (
              <CategoryPnlChart data={categoryPnlData} width={320} />
            ) : (
              <div className="flex items-center justify-center" style={{ height: 80 }}>
                <span className="text-[12px] text-white/20">正在加载分类数据…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
