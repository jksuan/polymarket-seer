import { motion } from "motion/react";
import { handleShare } from "./utils";
import { useProfileHistory } from "./useProfileHistory";

export interface ProfileHistoryProps {
  portfolioLoading: boolean;
  trades: any[];
}

export function ProfileHistory({ portfolioLoading, trades }: ProfileHistoryProps) {
  const historyData = useProfileHistory(trades);

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex flex-col gap-3"
    >
      {portfolioLoading ? (
        <div className="text-center text-[#a3aac4] text-[14px] py-10">正在同步历史数据...</div>
      ) : historyData.length === 0 ? (
        <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无历史战绩</div>
      ) : (
        historyData.map(({
          item, idx, usdcAmt, isWon, lossCost, entryPct, holdingStr, timeStr,
          outcome, outcomeBg, outcomeBorder, outcomeColor
        }) => (
          <div
            key={item.transactionHash || idx}
            className="p-3.5 rounded-xl relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between mb-3 relative z-10">
              <span className="text-[11px] text-[#a3aac4]/70 font-medium">{timeStr}</span>
              <span
                className="px-3 py-1 rounded-lg text-[12px] font-bold leading-none"
                style={isWon
                  ? { background: "#6bff8f", color: "#091328" }
                  : { background: "rgba(255,107,107,0.15)", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.3)" }
                }
              >
                {isWon ? "🏆 赢" : "输"}
              </span>
            </div>

            <div className="flex items-center gap-3 relative z-10">
              {item.icon && (
                <img
                  src={item.icon}
                  alt=""
                  className="w-[40px] h-[40px] rounded-[10px] object-cover shrink-0 bg-white"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[#dee5ff] truncate leading-snug notranslate" translate="no">
                  {item.title || "未知市场"}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {outcome && (
                    <span
                      className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold leading-none"
                      style={{ background: outcomeBg, border: outcomeBorder, color: outcomeColor }}
                    >
                      {outcome}
                    </span>
                  )}
                  {item.price != null && (
                    <span className="text-[11px] text-[#a3aac4]/70">
                      @ {(Number(item.price) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-white/5 relative z-10 gap-2">
              <div className="flex flex-col shrink-0">
                <span className="text-[9px] font-bold text-[#a3aac4]/50 uppercase tracking-[0.8px] mb-0.5">
                  {isWon ? "盈利" : "亏损"}
                </span>
                <span className="text-[18px] font-bold tracking-tight leading-none" style={{ color: isWon ? "#6bff8f" : "#ff6b6b" }}>
                  {isWon ? `+$${usdcAmt.toFixed(2)}` : `-$${lossCost.toFixed(2)}`}
                </span>
              </div>

              {entryPct != null && (
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[9px] font-bold text-[#a3aac4]/50 uppercase tracking-[0.8px] mb-0.5">入场胜率</span>
                  <span className="text-[13px] font-bold text-[#a3aac4]/80">@ {entryPct}%</span>
                </div>
              )}

              {holdingStr && (
                <div className="flex flex-col items-center shrink-0">
                  <span className="text-[9px] font-bold text-[#a3aac4]/50 uppercase tracking-[0.8px] mb-0.5">持仓历时</span>
                  <span className="text-[13px] font-bold text-[#a3aac4]/80">{holdingStr}</span>
                </div>
              )}

              {isWon ? (
                <button 
                  onClick={() => handleShare(
                    "SEER.SPORTS 胜利战报",
                    `我在「${item.title || "未知市场"}」中成功预测，实现盈利 $${usdcAmt.toFixed(2)}${entryPct ? `，入场精准度 ${entryPct}%` : ''}！胜算满满！`
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192540] text-[#60a5fa] hover:bg-[#203050] transition-colors font-bold text-[12px] active:scale-95 border border-[#60a5fa]/20 shrink-0"
                >
                  🎉 分享胜利
                </button>
              ) : (
                <button 
                  onClick={() => handleShare(
                    "SEER.SPORTS 交易复盘",
                    `在「${item.title || "未知市场"}」预测失利，当期建仓精确度 ${entryPct || '--'}%，吃一堑长一智，准备再战！`
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff9966]/10 text-[#ff9966] hover:bg-[#ff9966]/20 transition-colors font-bold text-[12px] active:scale-95 border border-[#ff9966]/30 shrink-0"
                >
                  📝 分享复盘
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </motion.div>
  );
}
