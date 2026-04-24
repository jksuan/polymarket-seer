import { motion } from "motion/react";
import { useProfileHistory } from "./useProfileHistory";
import { ShareCardModal } from "@/components/ui/ShareCardModal";
import { useShareCard } from "@/hooks/useShareCard";
import { GlassCard } from "./components/GlassCard";
import { OutcomePill } from "./components/OutcomePill";
import { ProfileEmptyState } from "./components/ProfileEmptyState";
import { ProfileCardSkeleton } from "./components/ProfileCardSkeleton";
import { useTranslation } from "@/i18n";

export interface ProfileHistoryProps {
  portfolioLoading: boolean;
  trades: any[];
}

export function ProfileHistory({ portfolioLoading, trades }: ProfileHistoryProps) {
  const { t } = useTranslation();
  const historyData = useProfileHistory(trades, t);

  const {
    isGenerating, showModal, cardImageUrl, cardData,
    generateCard, saveCard, shareToX, closeModal,
  } = useShareCard();

  const handleShareWin = (row: typeof historyData[0]) => {
    generateCard({
      type: 'history',
      icon: row.item.icon,          // raw URL — hook will fetch as base64
      title: row.item.title || t.profile.historyUnknown,
      outcome: row.outcome,
      isWon: true,
      netProfit: row.netProfit,
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
          <>
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
          </>
        ) : historyData.length === 0 ? (
          <ProfileEmptyState loading={false} emptyText={t.profile.historyEmpty} />
        ) : (
          historyData.map(({
            item, idx, usdcAmt, netProfit, isWon, lossCost, entryPct, holdingStr, timeStr, outcome
          }) => (
            <GlassCard key={`${item.id}-${idx}`} className="p-4" style={{ borderRadius: 12 }}>
              <div className="flex items-center justify-between mb-3 relative z-10">
                <span className="text-[12px] font-medium text-[#a3aac4]/70 tracking-wide">{timeStr}</span>
                <span
                  className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold tracking-wide"
                  style={
                    isWon
                      ? { background: "rgba(107,255,143,0.15)", color: "#6bff8f" }
                      : { background: "rgba(255,107,107,0.15)", color: "#ff6b6b" }
                  }
                >
                  {isWon ? t.profile.historyWon : t.profile.historyLost}
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
                    {item.title || t.profile.historyUnknown}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <OutcomePill outcome={outcome} />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-white/5 relative z-10 gap-2">
                <div className="flex flex-col shrink-0">
                  <span className="text-[9px] font-bold text-[#a3aac4]/50 tracking-wide mb-0.5">
                    {isWon ? t.profile.historyNetProfit : t.profile.historyNetLoss}
                  </span>
                  <span className="text-[18px] font-bold tracking-tight leading-none" style={{ color: isWon ? "#6bff8f" : "#ff6b6b" }}>
                    {isWon ? `+$${netProfit.toFixed(2)}` : `-$${lossCost.toFixed(2)}`}
                  </span>
                </div>

                {entryPct != null && (
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[9px] font-bold text-[#a3aac4]/50 tracking-wide mb-0.5">{t.profile.historyEntryProb}</span>
                    <span className="text-[13px] font-bold text-[#a3aac4]/80">@ {entryPct}%</span>
                  </div>
                )}

                {holdingStr && (
                  <div className="flex flex-col items-center shrink-0">
                    <span className="text-[9px] font-bold text-[#a3aac4]/50 tracking-wide mb-0.5">{t.profile.historyHoldingTime}</span>
                    <span className="text-[13px] font-bold text-[#a3aac4]/80">{holdingStr}</span>
                  </div>
                )}

                {/* 仅"赢"显示分享按钮，"输"不显示（已删除分享复盘） */}
                {isWon && (
                  <button
                    onClick={() => handleShareWin({ item, idx, usdcAmt, netProfit, isWon, lossCost, entryPct, holdingStr, timeStr, outcome })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors font-bold text-[12px] active:scale-95 shrink-0"
                    style={{ background: '#192540', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.2)' }}
                  >
                    {t.profile.historyShareWin}
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
