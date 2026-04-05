import { motion } from "motion/react";
import { useProfileHistory } from "./useProfileHistory";
import { ShareCardModal } from "@/components/ui/ShareCardModal";
import { useShareCard } from "@/hooks/useShareCard";
import { GlassCard } from "./components/GlassCard";
import { OutcomePill } from "./components/OutcomePill";
import { ProfileEmptyState } from "./components/ProfileEmptyState";

export interface ProfileHistoryProps {
  portfolioLoading: boolean;
  trades: any[];
}

export function ProfileHistory({ portfolioLoading, trades }: ProfileHistoryProps) {
  const historyData = useProfileHistory(trades);

  const {
    isGenerating, showModal, cardImageUrl, cardData,
    generateCard, saveCard, shareToX, closeModal,
  } = useShareCard();

  const handleShareWin = (row: typeof historyData[0]) => {
    generateCard({
      type: 'history',
      icon: row.item.icon,          // raw URL — hook will fetch as base64
      title: row.item.title || '未知市场',
      outcome: row.outcome,
      isWon: true,
      usdcAmt: row.usdcAmt,
      entryPct: row.entryPct != null ? Number(row.entryPct) : undefined,
      holdingStr: row.holdingStr,
      timeStr: row.timeStr,
    });
  };

  return (
    <>
      <ShareCardModal
        isOpen={showModal}
        isGenerating={isGenerating}
        cardImageUrl={cardImageUrl}
        cardData={cardData}
        onClose={closeModal}
        onSaveCard={saveCard}
        onShareToX={() => shareToX(cardData?.title)}
      />

      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="flex flex-col gap-3"
      >
        {portfolioLoading ? (
          <ProfileEmptyState loading={true} loadingText="正在同步历史数据..." />
        ) : historyData.length === 0 ? (
          <ProfileEmptyState loading={false} emptyText="暂无历史战绩" />
        ) : (
          historyData.map(({
            item, idx, usdcAmt, isWon, lossCost, entryPct, holdingStr, timeStr, outcome
          }) => (
            <GlassCard key={item.transactionHash || idx} className="p-3.5">
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
                    <OutcomePill outcome={outcome} />
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

                {/* 仅"赢"显示分享按钮，"输"不显示（已删除分享复盘） */}
                {isWon && (
                  <button
                    onClick={() => handleShareWin({ item, idx, usdcAmt, isWon, lossCost, entryPct, holdingStr, timeStr, outcome })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-bold text-[12px] active:scale-95 shrink-0"
                    style={{ background: '#192540', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}
                  >
                    🎉 分享胜利
                  </button>
                )}
              </div>
            </GlassCard>
          ))
        )}
      </motion.div>
    </>
  );
}
