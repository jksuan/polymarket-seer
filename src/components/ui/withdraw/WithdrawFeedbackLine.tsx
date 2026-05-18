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
    <div className="relative flex h-14 w-14 items-center justify-center">
      <motion.span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[#ADFF2F]/30"
        animate={{ scale: [1, 1.45, 1], opacity: [0.5, 0.12, 0.5] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.span
        aria-hidden
        className="absolute inset-1 rounded-full bg-[#ADFF2F]/20"
        animate={{ scale: [1.05, 1.2, 1.05], opacity: [0.35, 0.15, 0.35] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 0.12 }}
      />
      <motion.span
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#ADFF2F] shadow-[0_0_20px_rgba(173,255,47,0.45)]"
        initial={{ scale: 0.45, opacity: 0 }}
        animate={{
          scale: [0.45, 1.08, 1],
          opacity: [0, 1, 1],
          boxShadow: [
            "0 0 0 rgba(173,255,47,0)",
            "0 0 24px rgba(173,255,47,0.5)",
            "0 0 16px rgba(173,255,47,0.35)",
          ],
        }}
        transition={{
          scale: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.35 },
          boxShadow: { duration: 0.55, ease: "easeOut" },
        }}
      >
        <Check className="text-[#0D0518]" size={20} strokeWidth={3} />
      </motion.span>
    </div>
  );
}
