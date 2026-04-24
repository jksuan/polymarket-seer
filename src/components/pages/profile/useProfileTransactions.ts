import { useMemo } from "react";
import { formatTimestamp } from "./utils";

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
}

export function useProfileTransactions(trades: any[], t: any): TransactionRowData[] {
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

      let txLabel = t.profile.txOther;
      let txColor = "#a3aac4";
      let txBg = "rgba(255,255,255,0.07)";
      if (isBuy) { txLabel = t.profile.txBuy; txColor = "#60a5fa"; txBg = "rgba(96,165,250,0.12)"; }
      else if (item.side === "SELL") { txLabel = t.profile.txSell; txColor = "#fb923c"; txBg = "rgba(251,146,60,0.12)"; }
      else if (isWonRedeem) { txLabel = t.profile.txRedeem; txColor = "#6bff8f"; txBg = "rgba(107,255,143,0.12)"; }
      else if (isRedeem) { txLabel = t.profile.txArchive; txColor = "#a3aac4"; txBg = "rgba(255,255,255,0.07)"; }

      const amtDisplay = isBuy ? `-$${usdcAmt.toFixed(2)}` : `+$${usdcAmt.toFixed(2)}`;
      const amtColor = isBuy ? "#ff6b6b" : usdcAmt > 0.01 ? "#6bff8f" : "#a3aac4";

      const timeStr = formatTimestamp(item.timestamp);
      const outcome = item.outcome || "";

      return {
        item, idx, usdcAmt, txLabel, txColor, txBg, amtDisplay, amtColor, timeStr, outcome
      };
    });
  }, [trades, t]);
}
