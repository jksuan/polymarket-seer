'use client';

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X, Check } from "lucide-react";
import { useTranslation } from "@/i18n";
import type { Locale } from "@/i18n";

interface LanguageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LanguageDrawer({ isOpen, onClose }: LanguageDrawerProps) {
  const { locale, setLocale } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文' },
    // 可以在这里无缝添加新语言，例如：
    // { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    // { code: 'es', name: 'Spanish', nativeName: 'Español' },
  ];

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="lang-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          {/* Drawer Panel */}
          <motion.div
            key="lang-drawer"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              maxWidth: "448px",
              margin: "0 auto",
              background: "linear-gradient(180deg, #1A0D2E 0%, #0D0518 100%)",
              borderRadius: "24px 24px 0 0",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -24px 80px rgba(0,0,0,0.8)",
              maxHeight: "85vh",
              overflowY: "auto" as const,
            }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div
                style={{
                  width: "40px",
                  height: "4px",
                  borderRadius: "2px",
                  background: "rgba(255,255,255,0.15)",
                }}
              />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <h2
                style={{
                  fontFamily: "Inter",
                  fontWeight: 900,
                  fontSize: "20px",
                  color: "#dee5ff",
                  letterSpacing: "-0.5px",
                }}
              >
                {locale === 'zh' ? '选择语言' : 'Select Language'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <X size={16} color="#a3aac4" />
              </button>
            </div>

            {/* Language List */}
            <div className="px-4 pb-10 flex flex-col gap-2 mt-2">
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                {languages.map((lang, idx) => {
                  const isSelected = locale === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLocale(lang.code as Locale);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-5 py-4 active:bg-white/5 transition-colors"
                      style={{
                        borderBottom:
                          idx < languages.length - 1
                            ? "1px solid rgba(255,255,255,0.05)"
                            : "none",
                      }}
                    >
                      <div className="flex flex-col items-start gap-1">
                        <span
                          style={{
                            fontFamily: "Inter",
                            fontWeight: 700,
                            fontSize: "16px",
                            color: isSelected ? "#00F0FF" : "#dee5ff",
                          }}
                        >
                          {lang.nativeName}
                        </span>
                        {lang.name !== lang.nativeName && (
                          <span className="text-[12px] font-medium text-white/40">
                            {lang.name}
                          </span>
                        )}
                      </div>
                      
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-[#00F0FF]/10 flex items-center justify-center">
                          <Check size={14} color="#00F0FF" strokeWidth={3} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
