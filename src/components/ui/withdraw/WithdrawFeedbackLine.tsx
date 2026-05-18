"use client";

import { Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { formatUsd } from "@/components/ui/deposit/format";
import { resolveTokenIconUrl } from "@/components/ui/deposit/icons";
import { TokenIcon } from "@/components/ui/deposit/shared-ui";
import type { WithdrawFeedback } from "./types";

export function WithdrawFeedbackLine({ feedback }: { feedback: WithdrawFeedback }) {
  const toneClass = feedback.tone === "error" ? "text-red-400" : "text-[#ADFF2F]";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={`${feedback.message}-${feedback.celebrate ? "celebrate" : "plain"}`}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="flex flex-col items-center gap-3"
      >
        {feedback.celebrate ? <WithdrawSuccessBadge /> : null}
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
      </motion.div>
    </AnimatePresence>
  );
}

function WithdrawSuccessBadge() {
  return (
    <motion.div
      className="relative flex h-10 w-10 items-center justify-center"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <span
        aria-hidden
        className="absolute h-10 w-10 rounded-full bg-[#ADFF2F]/28"
      />
      <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#ADFF2F] shadow-[0_0_12px_rgba(173,255,47,0.35)]">
        <Check className="text-[#0D0518]" size={20} strokeWidth={3} />
      </span>
    </motion.div>
  );
}
