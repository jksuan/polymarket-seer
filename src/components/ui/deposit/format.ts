export function formatCompactBalance(balance?: string): string {
  const value = Number(balance || 0);
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  if (value < 0.0001) return "<0.0001";
  return value.toFixed(value < 1 ? 4 : 3);
}

export function formatTokenAmount(amountUsd: number, symbol: string): string {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return `0 ${symbol}`;
  return `${amountUsd.toFixed(symbol.toUpperCase().includes("USDC") ? 2 : 5)} ${symbol}`;
}

export function formatUsd(value?: number): string {
  return value === undefined ? "-" : `$${value.toFixed(2)}`;
}

export function formatPercent(value?: number): string {
  return value === undefined ? "-" : `${value.toFixed(2)}%`;
}

export function formatMs(value?: number): string {
  if (!value) return "< 1 min";
  const minutes = Math.max(1, Math.ceil(value / 60_000));
  return minutes <= 1 ? "< 1 min" : `${minutes} min`;
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}
