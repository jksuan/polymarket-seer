import { motion } from "motion/react";
import { useProfileTransactions } from "./useProfileTransactions";
import { GlassCard } from "./components/GlassCard";
import { OutcomePill } from "./components/OutcomePill";
import { ProfileEmptyState } from "./components/ProfileEmptyState";
import { ProfileTransactionSkeleton } from "./components/ProfileTransactionSkeleton";

export interface ProfileTransactionsProps {
  portfolioLoading: boolean;
  trades: any[];
}

export function ProfileTransactions({ portfolioLoading, trades }: ProfileTransactionsProps) {
  const transactionData = useProfileTransactions(trades);

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex flex-col gap-3"
    >
      {portfolioLoading ? (
        <>
          <ProfileTransactionSkeleton />
          <ProfileTransactionSkeleton />
          <ProfileTransactionSkeleton />
          <ProfileTransactionSkeleton />
          <ProfileTransactionSkeleton />
        </>
      ) : transactionData.length === 0 ? (
        <ProfileEmptyState loading={false} emptyText="暂无交易记录" />
      ) : (
        transactionData.map(({
          item, idx, txLabel, txColor, txBg, amtDisplay, amtColor, timeStr, outcome
        }) => (
          <GlassCard key={item.transactionHash || idx} className="p-3 flex items-center gap-3">
            <div className="w-[42px] shrink-0">
              <div
                className="text-[11px] font-bold py-1.5 rounded-md text-center w-full leading-none"
                style={{ color: txColor, background: txBg }}
              >
                {txLabel}
              </div>
            </div>

            <div className="flex-1 flex items-center gap-2 min-w-0">
              {item.icon && (
                <img
                  src={item.icon}
                  alt=""
                  className="w-[28px] h-[28px] rounded-[6px] object-cover shrink-0 bg-white"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div
                  className="text-[12px] font-semibold text-[#dee5ff] truncate notranslate"
                  translate="no"
                >
                  {item.title || "未知市场"}
                </div>
                <OutcomePill outcome={outcome} className="mt-0.5" />
              </div>
            </div>

            <div className="text-right shrink-0 min-w-[74px]">
              <div className="text-[15px] font-bold" style={{ color: amtColor }}>
                {amtDisplay}
              </div>
              <div className="text-[10px] text-[#a3aac4]/60 mt-0.5">{timeStr}</div>
            </div>
          </GlassCard>
        ))
      )}
    </motion.div>
  );
}
