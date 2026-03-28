import { motion } from "motion/react";
import { useProfileTransactions } from "./useProfileTransactions";

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
        <div className="text-center text-[#a3aac4] text-[14px] py-10">正在同步交易记录...</div>
      ) : transactionData.length === 0 ? (
        <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无交易记录</div>
      ) : (
        transactionData.map(({
          item, idx, txLabel, txColor, txBg, amtDisplay, amtColor, timeStr, outcome, outcomePill
        }) => (
          <div
            key={item.transactionHash || idx}
            className="p-3 rounded-xl flex items-center gap-3"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
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
                {outcome && (
                  <span
                    className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold leading-none mt-0.5"
                    style={{ background: outcomePill.bg, border: outcomePill.border, color: outcomePill.color }}
                  >
                    {outcome}
                  </span>
                )}
              </div>
            </div>

            <div className="text-right shrink-0 min-w-[74px]">
              <div className="text-[15px] font-bold" style={{ color: amtColor }}>
                {amtDisplay}
              </div>
              <div className="text-[10px] text-[#a3aac4]/60 mt-0.5">{timeStr}</div>
            </div>
          </div>
        ))
      )}
    </motion.div>
  );
}
