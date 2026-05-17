"use client";

import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useTranslation } from "@/i18n";
import { FundsMovementTermsPanel } from "@/components/ui/FundsMovementTermsPanel";
import type { WithdrawDrawerProps } from "./withdraw/types";
import { useWithdrawDrawerController } from "./withdraw/useWithdrawDrawerController";
import { WithdrawFormStep } from "./withdraw/WithdrawFormStep";

function DrawerContent({
  isOpen,
  onClose,
  proxyAddress,
  balanceUsd,
  onBalanceRefresh,
}: WithdrawDrawerProps) {
  useLockBodyScroll(isOpen);
  const { locale, t } = useTranslation();

  const c = useWithdrawDrawerController({
    isOpen,
    proxyAddress,
    balanceUsd,
    locale,
    onBalanceRefresh,
    onClose,
  });

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-[55] touch-none bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 right-0 z-[56] mx-auto flex max-h-[90vh] min-h-0 w-full max-w-[448px] touch-pan-y flex-col overflow-y-auto overscroll-y-contain rounded-t-3xl border-t border-white/10"
              style={{
                background: "linear-gradient(180deg, #1A0D2E 0%, #0D0518 100%)",
                boxShadow: "0 -24px 80px rgba(0,0,0,0.8)",
              }}
            >
              <div className="flex w-full shrink-0 justify-center pb-2 pt-3">
                <div className="h-1.5 w-12 rounded-full bg-white/20" />
              </div>

              <div className="flex flex-col px-6 pb-7">
                <div className="relative mb-6 flex shrink-0 items-center justify-center">
                  <h2 className="text-xl font-black text-white">{t.withdrawFlow.title}</h2>
                  <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                <WithdrawFormStep c={c} />

                <button
                  type="button"
                  onClick={() => c.setFundsTermsOpen(true)}
                  className="mt-4 text-center text-xs font-medium text-white/35 underline-offset-2 hover:text-white/55 hover:underline"
                >
                  {t.fundsMovementTerms.linkLabel}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <FundsMovementTermsPanel
        isOpen={c.fundsTermsOpen}
        onClose={() => c.setFundsTermsOpen(false)}
      />
    </>
  );
}

export function WithdrawDrawer(props: WithdrawDrawerProps) {
  if (typeof document === "undefined") return null;
  return createPortal(<DrawerContent {...props} />, document.body);
}
