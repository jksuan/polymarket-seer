"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { CircleArrowDown, CircleArrowUp } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useTranslation } from "@/i18n";

export function FundsActionSheet({
  isOpen,
  onClose,
  balanceUsd,
  onDeposit,
  onWithdraw,
}: {
  isOpen: boolean;
  onClose: () => void;
  balanceUsd: string;
  onDeposit: () => void;
  onWithdraw: () => void;
}) {
  useLockBodyScroll(isOpen);
  const { t } = useTranslation();
  const fm = t.fundsMenu;

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[54] touch-none bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[54] mx-auto w-full max-w-[448px] rounded-t-3xl border-t border-white/10 px-6 pb-8 pt-3"
            style={{
              background: "linear-gradient(180deg, #1A0D2E 0%, #0D0518 100%)",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.8)",
            }}
          >
            <div className="mb-5 flex w-full justify-center">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>
            <h2 className="mb-1 text-center text-lg font-black text-white">{fm.title}</h2>
            <p className="mb-5 text-center text-xs text-white/40">
              {fm.balanceLabel(Number(balanceUsd || 0).toFixed(2))}
            </p>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeposit();
                }}
                className="flex items-center justify-center gap-3 rounded-2xl border border-[#ADFF2F]/30 bg-[#ADFF2F]/10 p-4 active:scale-[0.98] hover:bg-[#ADFF2F]/15"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ADFF2F]/20 text-[#ADFF2F]">
                  <CircleArrowDown size={20} strokeWidth={1.75} />
                </span>
                <span className="text-base font-black text-[#ADFF2F]">{fm.deposit}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onWithdraw();
                }}
                className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 active:scale-[0.98] hover:bg-white/[0.06]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/80">
                  <CircleArrowUp size={20} strokeWidth={1.75} />
                </span>
                <span className="text-base font-black text-white">{fm.withdraw}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
