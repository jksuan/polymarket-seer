import { useMemo } from "react";
import { formatTimestamp, formatHoldingTime } from "./utils";

export interface HistoryRowData {
  item: any;
  idx: number;
  usdcAmt: number;
  netProfit: number;
  isWon: boolean;
  lossCost: number;
  entryPct: string | null;
  holdingStr: string;
  timeStr: string;
  outcome: string;
}

export function useProfileHistory(trades: any[], t: any): HistoryRowData[] {
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
      const holdingStr = formatHoldingTime(redeemTs, buyTs, t.time);
      const timeStr = formatTimestamp(item.timestamp);
      const outcome = item.outcome || "";
      
      const netProfit = isWon ? (usdcAmt - (usdcAmt * (Number(entryPct || 100) / 100))) : 0;

      return {
        item,
        idx,
        usdcAmt,
        netProfit,
        isWon,
        lossCost,
        entryPct,
        holdingStr,
        timeStr,
        outcome
      };
    });
  }, [trades, t]);
}
