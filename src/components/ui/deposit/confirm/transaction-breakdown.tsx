import { ChevronDown } from "lucide-react";
import type { RefObject } from "react";
import { QUOTE_STALE_THRESHOLD_MS } from "../constants";
import { formatPercent, formatUsd } from "../format";
import type { ExecutionSnapshot } from "../types";
import { InfoBox, type InfoBoxRow } from "../shared-ui";

function breakdownSummaryDirect(snapshot: ExecutionSnapshot, locale: string): string {
  const impact = formatPercent(snapshot.priceImpact ?? 0);
  if (snapshot.networkCostUsd !== undefined) {
    return `${formatUsd(snapshot.networkCostUsd)} • ${impact}`;
  }
  return locale === "zh"
    ? `网络费见钱包 • ${impact}`
    : `Gas in wallet • ${impact}`;
}

function breakdownSummaryBridge(snapshot: ExecutionSnapshot): string {
  const breakdownFeeUsd =
    snapshot.fixedFeeUsd === undefined && snapshot.routeCostUsd === undefined
      ? undefined
      : (snapshot.fixedFeeUsd ?? 0) + (snapshot.routeCostUsd ?? 0);
  return `${formatUsd(breakdownFeeUsd)} • ${formatPercent(snapshot.priceImpact)}`;
}

function directBreakdownRows(snapshot: ExecutionSnapshot, locale: string): InfoBoxRow[] {
  const networkLabel = locale === "zh" ? "网络费用" : "Network cost";
  const networkValue =
    snapshot.networkCostUsd !== undefined
      ? formatUsd(snapshot.networkCostUsd)
      : locale === "zh"
        ? "以钱包预估为准"
        : "See wallet estimate";

  return [
    [networkLabel, networkValue],
    [locale === "zh" ? "路由成本" : "Route cost", formatUsd(snapshot.routeCostUsd ?? 0)],
    [locale === "zh" ? "价格影响" : "Price impact", formatPercent(snapshot.priceImpact ?? 0)],
  ];
}

function bridgeBreakdownRows(snapshot: ExecutionSnapshot, locale: string): InfoBoxRow[] {
  const fixedFeeText = snapshot.fixedFeeDisplay
    ? `${snapshot.fixedFeeDisplay}${snapshot.fixedFeeUsd === undefined ? "" : ` ≈ ${formatUsd(snapshot.fixedFeeUsd)}`}`
    : "-";
  const slippageText =
    snapshot.slippage === undefined ? "Auto" : `Auto • ${formatPercent(snapshot.slippage)}`;
  const quoteRefresh =
    locale === "zh"
      ? `每 ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s 自动刷新`
      : `Auto every ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s`;

  return [
    ["deBridge fixed fee", fixedFeeText],
    [locale === "zh" ? "路由成本" : "Route cost", formatUsd(snapshot.routeCostUsd)],
    [locale === "zh" ? "价格影响" : "Price impact", formatPercent(snapshot.priceImpact)],
    [locale === "zh" ? "最大滑点" : "Max slippage", slippageText],
    [locale === "zh" ? "报价刷新" : "Quote refresh", quoteRefresh],
  ];
}

export function ConfirmTransactionBreakdown({
  breakdownDetailsRef,
  isOpen,
  locale,
  onToggleOpen,
  snapshot,
}: {
  breakdownDetailsRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  locale: string;
  onToggleOpen: () => void;
  snapshot: ExecutionSnapshot;
}) {
  const isDirect = snapshot.kind === "direct-transfer";
  const summaryText = isDirect
    ? breakdownSummaryDirect(snapshot, locale)
    : breakdownSummaryBridge(snapshot);
  const rows = isDirect
    ? directBreakdownRows(snapshot, locale)
    : bridgeBreakdownRows(snapshot, locale);

  const title = locale === "zh" ? "费用明细" : "Transaction breakdown";

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={onToggleOpen}
        className="flex w-full items-center justify-between gap-3 text-left text-xs"
      >
        <span className="font-medium text-white/35">{title}</span>
        <span className="flex min-w-0 items-center gap-1 text-white/50">
          {!isOpen && (
            <span className="min-w-0 truncate font-normal">{summaryText}</span>
          )}
          <ChevronDown
            className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
            size={16}
          />
        </span>
      </button>
      {isOpen && (
        <div ref={breakdownDetailsRef}>
          <InfoBox rows={rows} />
        </div>
      )}
    </div>
  );
}
