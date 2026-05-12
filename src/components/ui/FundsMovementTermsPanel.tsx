"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "@/i18n";

export type FundsMovementTermsPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

function FundsMovementTermsBody() {
  const { t } = useTranslation();
  const ft = t.fundsMovementTerms;

  const sections = [
    { title: ft.section1Title, body: ft.section1Body },
    { title: ft.section2Title, body: ft.section2Body },
    { title: ft.section3Title, body: ft.section3Body },
    { title: ft.section4Title, body: ft.section4Body },
    { title: ft.section5Title, body: ft.section5Body },
    { title: ft.section6Title, body: ft.section6Body },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative mb-8 rounded-2xl border border-white/5 bg-white/[0.03] p-5">
        <p className="text-[15px] font-medium leading-relaxed text-white/80">{ft.intro}</p>
      </div>

      <div className="space-y-10">
        {sections.map((section, index) => (
          <section key={section.title}>
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white ring-1 ring-white/20">
                {index + 1}
              </span>
              <h4 className="text-lg font-bold text-white">{section.title}</h4>
            </div>
            <p className="pl-9 text-[15px] leading-relaxed text-white/70">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-16 flex w-full flex-col items-center gap-2 border-t border-white/5 pt-8">
        <span className="text-[11px] font-bold italic tracking-widest text-white/40">{ft.footerSecurity}</span>
        <p className="text-[11px] font-medium tracking-tight text-white/40">{ft.footerCopyright}</p>
      </div>
    </div>
  );
}

function PanelInner({ isOpen, onClose }: FundsMovementTermsPanelProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="funds-terms-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
            className="fixed inset-0 z-[10049] touch-none bg-black/70 backdrop-blur-[4px]"
            aria-hidden
          />

          <motion.div
            key="funds-terms-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[10050] mx-auto flex max-w-[448px] flex-col border-x border-white/[0.08] bg-[#0D0518]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="funds-movement-terms-title"
          >
            <div className="sticky top-0 z-50 border-b border-white/5 bg-[#0D0518]/90 backdrop-blur-xl">
              <div className="flex h-14 items-center justify-between px-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="-ml-2 flex h-10 w-10 items-center justify-center rounded-full transition-colors active:bg-white/5"
                  aria-label={t.common.close}
                >
                  <ChevronLeft size={24} className="text-white" />
                </button>
                <span id="funds-movement-terms-title" className="text-lg font-bold text-white">
                  {t.fundsMovementTerms.panelTitle}
                </span>
                <div className="w-10" />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-6 pb-12">
              <FundsMovementTermsBody />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function FundsMovementTermsPanel({ isOpen, onClose }: FundsMovementTermsPanelProps) {
  if (typeof document === "undefined") return null;

  return createPortal(<PanelInner isOpen={isOpen} onClose={onClose} />, document.body);
}
