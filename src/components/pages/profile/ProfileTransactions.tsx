import { motion } from "motion/react";

export interface ProfileTransactionsProps {
  portfolioLoading: boolean;
  trades: any[];
}

export function ProfileTransactions({ portfolioLoading, trades }: ProfileTransactionsProps) {
  return (
    <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="flex flex-col gap-3"
      >
        {portfolioLoading ? (
          <div className="text-center text-[#a3aac4] text-[14px] py-10">正在同步交易记录...</div>
        ) : trades.length === 0 ? (
          <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无交易记录</div>
        ) : (
          (() => {
            const txItems = [...trades]
              .filter((t: any) => t.type === "TRADE" || t.type === "REDEEM")
              .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

            if (txItems.length === 0) {
              return <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无交易记录</div>;
            }

            return txItems.map((item: any, idx: number) => {
              const usdcAmt = Number(item.usdcSize || 0);
              const isRedeem = item.type === "REDEEM";
              const isBuy = item.side === "BUY";
              const isWonRedeem = isRedeem && usdcAmt > 0.01;

              let txLabel = "其他";
              let txColor = "#a3aac4";
              let txBg = "rgba(255,255,255,0.07)";
              if (isBuy) { txLabel = "买入"; txColor = "#60a5fa"; txBg = "rgba(96,165,250,0.12)"; }
              else if (item.side === "SELL") { txLabel = "卖出"; txColor = "#fb923c"; txBg = "rgba(251,146,60,0.12)"; }
              else if (isWonRedeem) { txLabel = "兑换"; txColor = "#6bff8f"; txBg = "rgba(107,255,143,0.12)"; }
              else if (isRedeem) { txLabel = "归档"; txColor = "#a3aac4"; txBg = "rgba(255,255,255,0.07)"; }

              const amtDisplay = isBuy ? `-$${usdcAmt.toFixed(2)}` : `+$${usdcAmt.toFixed(2)}`;
              const amtColor = isBuy ? "#ff6b6b" : usdcAmt > 0.01 ? "#6bff8f" : "#a3aac4";

              const ts = item.timestamp ? new Date(item.timestamp * 1000) : null;
              const timeStr = ts
                ? `${ts.getFullYear()}/${String(ts.getMonth()+1).padStart(2,"0")}/${String(ts.getDate()).padStart(2,"0")} ${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}`
                : "";

              const outcome = item.outcome || "";
              const outcomeLC = outcome.toLowerCase();
              const outcomePill = outcomeLC === "yes"
                ? { bg: "rgba(107,255,143,0.12)", border: "1px solid rgba(107,255,143,0.25)", color: "#6bff8f" }
                : outcomeLC === "no"
                ? { bg: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b" }
                : { bg: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa" };

              return (
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
              );
            });
          })()
        )}
      </motion.div>
  );
}
