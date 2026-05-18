"use client";

import { formatUsd } from "@/components/ui/deposit/format";
import { resolveTokenIconUrl } from "@/components/ui/deposit/icons";
import { TokenIcon } from "@/components/ui/deposit/shared-ui";
import type { WithdrawFeedback } from "./types";

export function WithdrawFeedbackLine({ feedback }: { feedback: WithdrawFeedback }) {
  const toneClass = feedback.tone === "error" ? "text-red-400" : "text-[#ADFF2F]";

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs font-medium ${toneClass}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <TokenIcon
          compact
          iconUrl={resolveTokenIconUrl(feedback.tokenSymbol, feedback.tokenIconUrl)}
          symbol={feedback.tokenSymbol}
        />
        <span className="font-bold">{formatUsd(feedback.amountUsd)}</span>
      </span>
      <span>{feedback.message}</span>
    </div>
  );
}
