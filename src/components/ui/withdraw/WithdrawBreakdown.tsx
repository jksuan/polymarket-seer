"use client";

import { ChevronDown, Fuel } from "lucide-react";
import { useState } from "react";
import { formatPercent, formatUsd, toNumber } from "@/components/ui/deposit/format";
import { InfoBox, type InfoBoxRow } from "@/components/ui/deposit/shared-ui";
import type { QuoteFeeBreakdown } from "@/types/bridge";
import { useTranslation } from "@/i18n";

export function WithdrawBreakdown({ fee }: { fee?: QuoteFeeBreakdown }) {
  const { t } = useTranslation();
  const wf = t.withdrawFlow;
  const [open, setOpen] = useState(false);

  const gasUsd = toNumber(fee?.gasUsd);
  const impact = toNumber(fee?.swapImpact ?? fee?.totalImpact) ?? 0;
  const slippage = fee?.maxSlippage;
  const slippageValue =
    slippage === undefined
      ? `${wf.slippageAuto} • 0.00%`
      : `${wf.slippageAuto} • ${formatPercent(slippage)}`;

  const summary = `${formatUsd(gasUsd)} • ${formatPercent(impact)}`;

  const rows: InfoBoxRow[] = [
    {
      label: wf.networkCost,
      value: formatUsd(gasUsd),
      icon: <Fuel className="text-white/40" size={14} />,
    },
    [wf.priceImpact, formatPercent(impact)],
    [wf.maxSlippage, slippageValue],
  ];

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left text-xs"
      >
        <span className="font-medium text-white/35">{wf.breakdownTitle}</span>
        <span className="flex min-w-0 items-center gap-1 text-white/50">
          {!open && <span className="min-w-0 truncate font-normal">{summary}</span>}
          <ChevronDown
            className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            size={16}
          />
        </span>
      </button>
      {open ? <InfoBox rows={rows} /> : null}
    </div>
  );
}
