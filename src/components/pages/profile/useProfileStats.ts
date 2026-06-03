import { useMemo } from "react";

export function useProfileStats(trades: any[], positions: any[]) {
  return useMemo(() => {
    let currentInvested = 0;
    let currentValue = 0;
    let historyInvested = 0;
    let historyRevenue = 0;

    if (trades && trades.length > 0) {
      trades.forEach((t: any) => {
        const usdc = Number(t.usdcSize || 0);
        if (t.type === "TRADE") {
          if (t.side === "BUY") {
            historyInvested += usdc;
          } else if (t.side === "SELL") {
            historyRevenue += usdc;
          }
        } else if (t.type === "REDEEM") {
          historyRevenue += usdc;
        }
      });
    }

    if (positions) {
      positions.forEach((pos: any) => {
        const cv = Number(pos.currentValue || 0);
        const iv = Number(pos.initialValue || pos.totalBought || 0);
        currentValue += cv;
        currentInvested += iv;
      });
    }

    const historyNetProfit = historyRevenue - historyInvested;
    const currentUnrealizedPnl = currentValue - currentInvested;
    const currentUnrealizedPct =
      currentInvested > 0 ? (currentUnrealizedPnl / currentInvested) * 100 : 0;

    return {
      historyInvested,
      historyRevenue,
      currentInvested,
      currentValue,
      historyNetProfit,
      currentUnrealizedPnl,
      currentUnrealizedPct,
    };
  }, [trades, positions]);
}
