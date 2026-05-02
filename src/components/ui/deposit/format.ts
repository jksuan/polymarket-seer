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

export function sanitizeAmountUsdInput(value: string): string {
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("").slice(0, 2);
  const trimmedInteger = integerPart.replace(/^0+(?=\d)/, "");
  const nextInteger = trimmedInteger || (integerPart ? "0" : "");
  const formattedInteger = nextInteger
    ? Number(nextInteger).toLocaleString("en-US")
    : "";

  if (normalized.includes(".")) {
    return (formattedInteger || "0") + "." + decimalPart;
  }

  return formattedInteger;
}

export function parseAmountUsd(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function formatAmountUsdInput(value: number): string {
  const normalized = Number.isFinite(value) && value >= 0 ? value : 0;
  return normalized.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
