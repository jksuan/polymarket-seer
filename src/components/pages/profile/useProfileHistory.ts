import { useMemo } from "react";

export interface HistoryRowData {
  item: any;
  idx: number;
  usdcAmt: number;
  isWon: boolean;
  lossCost: number;
  entryPct: string | null;
  holdingStr: string;
  timeStr: string;
  outcome: string;
  outcomeBg: string;
  outcomeBorder: string;
  outcomeColor: string;
}

export function useProfileHistory(trades: any[]): HistoryRowData[] {
  return useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    const buyCostByCondId: Record<string, number> = {};
    const buyPriceWeightedByCondId: Record<string, { totalCost: number; totalShares: number }> = {};
    const buyFirstTsByCondId: Record<string, number> = {};
    
    trades.forEach((t: any) => {
      if (t.type === "TRADE" && t.side === "BUY" && t.conditionId) {
        buyCostByCondId[t.conditionId] = (buyCostByCondId[t.conditionId] || 0) + Number(t.usdcSize || 0);
        const cost = Number(t.usdcSize || 0);
        const shares = Number(t.size || 0);
        if (!buyPriceWeightedByCondId[t.conditionId]) {
          buyPriceWeightedByCondId[t.conditionId] = { totalCost: 0, totalShares: 0 };
        }
        buyPriceWeightedByCondId[t.conditionId].totalCost += cost;
        buyPriceWeightedByCondId[t.conditionId].totalShares += shares;
        const ts = Number(t.timestamp || 0);
        if (ts > 0 && (!buyFirstTsByCondId[t.conditionId] || ts < buyFirstTsByCondId[t.conditionId])) {
          buyFirstTsByCondId[t.conditionId] = ts;
        }
      }
    });
    
    const historyItems = [...trades]
      .filter((t: any) => t.type === "REDEEM")
      .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

    return historyItems.map((item: any, idx: number) => {
      const usdcAmt = Number(item.usdcSize || 0);
      const isWon = usdcAmt > 0.01;

      const lossCost = !isWon ? (buyCostByCondId[item.conditionId] || 0) : 0;

      const wpData = buyPriceWeightedByCondId[item.conditionId];
      const entryPct = wpData && wpData.totalShares > 0
        ? ((wpData.totalCost / wpData.totalShares) * 100).toFixed(1)
        : item.price != null
          ? (Number(item.price) * 100).toFixed(1)
          : null;

      const redeemTs = Number(item.timestamp || 0);
      const buyTs = buyFirstTsByCondId[item.conditionId] || 0;
      let holdingStr = "";
      if (redeemTs > 0 && buyTs > 0 && redeemTs > buyTs) {
        const diffSec = redeemTs - buyTs;
        const days = Math.floor(diffSec / 86400);
        const hours = Math.floor((diffSec % 86400) / 3600);
        if (days > 0) {
          holdingStr = `${days}天${hours > 0 ? hours + "小时" : ""}`;
        } else if (hours > 0) {
          holdingStr = `${hours}小时`;
        } else {
          const mins = Math.floor(diffSec / 60);
          holdingStr = mins > 0 ? `${mins}分钟` : "不足1分钟";
        }
      }

      const ts = item.timestamp ? new Date(item.timestamp * 1000) : null;
      const timeStr = ts
        ? `${ts.getFullYear()}/${String(ts.getMonth()+1).padStart(2,"0")}/${String(ts.getDate()).padStart(2,"0")} ${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}`
        : "";

      const outcome = item.outcome || "";
      const outcomeLC = outcome.toLowerCase();
      const outcomeBg = outcomeLC === "yes" ? "rgba(107,255,143,0.12)" : outcomeLC === "no" ? "rgba(255,107,107,0.12)" : "rgba(96,165,250,0.12)";
      const outcomeBorder = outcomeLC === "yes" ? "1px solid rgba(107,255,143,0.25)" : outcomeLC === "no" ? "1px solid rgba(255,107,107,0.25)" : "1px solid rgba(96,165,250,0.25)";
      const outcomeColor = outcomeLC === "yes" ? "#6bff8f" : outcomeLC === "no" ? "#ff6b6b" : "#60a5fa";

      return {
        item,
        idx,
        usdcAmt,
        isWon,
        lossCost,
        entryPct,
        holdingStr,
        timeStr,
        outcome,
        outcomeBg,
        outcomeBorder,
        outcomeColor
      };
    });
  }, [trades]);
}
