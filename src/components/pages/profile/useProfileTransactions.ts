import { useMemo } from "react";

export interface TransactionRowData {
  item: any;
  idx: number;
  usdcAmt: number;
  txLabel: string;
  txColor: string;
  txBg: string;
  amtDisplay: string;
  amtColor: string;
  timeStr: string;
  outcome: string;
  outcomePill: { bg: string, border: string, color: string };
}

export function useProfileTransactions(trades: any[]): TransactionRowData[] {
  return useMemo(() => {
    if (!trades || trades.length === 0) return [];

    const txItems = [...trades]
      .filter((t: any) => t.type === "TRADE" || t.type === "REDEEM")
      .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

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

      return {
        item, idx, usdcAmt, txLabel, txColor, txBg, amtDisplay, amtColor, timeStr, outcome, outcomePill
      };
    });
  }, [trades]);
}
