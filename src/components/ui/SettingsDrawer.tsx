'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Globe,
  Shield,
  FileText,
  HelpCircle,
  ChevronRight,
  Bell,
  Moon,
  LogOut,
  Info,
  Copy,
  CheckCircle2,
  Wallet,
  Building2,
} from "lucide-react";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { shortenAddress } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { Locale } from "@/i18n";

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  authenticated?: boolean;
  onLogout?: () => void;
}



function DrawerContent({ isOpen, onClose, authenticated = false, onLogout }: SettingsDrawerProps) {
  const { displayIdentifier, proxyAddress, walletAddress } = usePolymarketAuth();
  const { t, locale, setLocale } = useTranslation();
  const [copiedProxy, setCopiedProxy] = useState(false);
  const [copiedEoa, setCopiedEoa] = useState(false);

  const SETTINGS_GROUPS = [
    {
      title: t.settings.preferences,
      items: [
        { id: 'language', icon: Globe, label: t.settings.language, value: locale === 'zh' ? t.settings.languageZh : t.settings.languageEn, color: "#00F0FF" },
        { id: 'notifications', icon: Bell, label: t.settings.notifications, value: t.settings.notificationsOn, color: "#ADFF2F" },
        { id: 'appearance', icon: Moon, label: t.settings.appearance, value: t.settings.darkMode, color: "#A78BFA" },
      ],
    },
    {
      title: t.settings.helpSupport,
      items: [
        { id: 'help', icon: HelpCircle, label: t.settings.helpCenter, value: "", color: "#60A5FA" },
        { id: 'about', icon: Info, label: t.settings.about, value: "v1.0.0", color: "#F59E0B" },
      ],
    },
    {
      title: t.settings.legal,
      items: [
        { id: 'privacy', icon: Shield, label: t.settings.privacy, value: "", color: "#34D399" },
        { id: 'terms', icon: FileText, label: t.settings.terms, value: "", color: "#34D399" },
      ],
    },
  ];

  const handleCopy = async (text: string, setCopied: (v: boolean) => void) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
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
            key="settings-drawer"
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
                {t.settings.title}
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

            {/* Profile Identity Block */}
            {authenticated && (
              <div className="px-4 mb-6 mt-1">
                <div 
                  className="rounded-2xl p-4 flex flex-col gap-4 relative overflow-hidden" 
                  style={{
                    background: "linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.08)"
                  }}
                >
                  <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#00F0FF] opacity-10 rounded-full blur-[40px] pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-[#007AFF] opacity-10 rounded-full blur-[40px] pointer-events-none" />
                  
                  {/* Avatar and Name */}
                  <div className="flex items-center gap-3 relative z-10">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#007AFF] flex items-center justify-center text-white font-black text-[20px] shadow-[0_0_15px_rgba(0,240,255,0.4)] shrink-0">
                      {displayIdentifier[0] === '@' ? displayIdentifier[1]?.toUpperCase() || 'S' : displayIdentifier[0]?.toUpperCase() || 'S'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-white font-bold text-lg truncate">
                        {displayIdentifier}
                      </span>
                      <span className="text-[#00F0FF] text-[11px] font-bold uppercase tracking-widest mt-0.5">
                        {t.settings.loggedInAccount}
                      </span>
                    </div>
                  </div>

                  <div className="h-[1px] w-full bg-white/10 my-1" />

                  {/* Addresses */}
                  <div className="flex flex-col gap-3 relative z-10">
                    {/* Proxy Address */}
                    <div 
                      onClick={() => handleCopy(proxyAddress || "", setCopiedProxy)}
                      className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 active:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#ADFF2F]/10 border border-[#ADFF2F]/20 flex items-center justify-center shrink-0">
                          <Building2 size={13} className="text-[#ADFF2F]" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/50 font-bold tracking-wider mb-0.5 uppercase">{t.settings.proxyWallet}</span>
                          <span className="text-[12px] text-white font-mono">{proxyAddress ? shortenAddress(proxyAddress, 6, 6) : t.settings.notAssigned}</span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 flex items-center justify-center rounded-md ${copiedProxy ? 'text-[#ADFF2F]' : 'text-white/30 group-hover:text-white/60 transition-colors'}`}>
                        {copiedProxy ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </div>
                    </div>

                    {/* EOA Address */}
                    <div 
                      onClick={() => handleCopy(walletAddress || "", setCopiedEoa)}
                      className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5 active:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                          <Wallet size={13} className="text-blue-400" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-white/50 font-bold tracking-wider mb-0.5 uppercase">{t.settings.signerWallet}</span>
                          <span className="text-[12px] text-white font-mono">{walletAddress ? shortenAddress(walletAddress, 6, 6) : t.settings.notConnected}</span>
                        </div>
                      </div>
                      <div className={`w-6 h-6 flex items-center justify-center rounded-md ${copiedEoa ? 'text-blue-400' : 'text-white/30 group-hover:text-white/60 transition-colors'}`}>
                        {copiedEoa ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Groups */}
            <div className="px-4 pb-12 flex flex-col gap-6 mt-2">
              {SETTINGS_GROUPS.map((group) => (
                <div key={group.title}>
                  <div
                    className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
                    style={{ color: "rgba(163,170,196,0.5)" }}
                  >
                    {group.title}
                  </div>
                  <div
                    className="rounded-2xl overflow-hidden"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    {group.items.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={() => {
                            if (item.id === 'language') {
                              setLocale(locale === 'zh' ? 'en' : 'zh' as Locale);
                            }
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-white/5 transition-colors"
                          style={{
                            borderBottom:
                              idx < group.items.length - 1
                                ? "1px solid rgba(255,255,255,0.05)"
                                : "none",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{
                              background: `${item.color}18`,
                              border: `1px solid ${item.color}30`,
                            }}
                          >
                            <Icon size={16} color={item.color} />
                          </div>
                          <span
                            className="flex-1 text-left"
                            style={{
                              fontFamily: "Inter",
                              fontWeight: 600,
                              fontSize: "15px",
                              color: "#dee5ff",
                            }}
                          >
                            {item.label}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {item.value && (
                              <span style={{ fontSize: "13px", fontWeight: 500, color: "#a3aac4" }}>
                                {item.value}
                              </span>
                            )}
                            <ChevronRight size={16} color="#4a5270" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Logout Button */}
              {authenticated && (
                <button
                  onClick={() => {
                    onClose();
                    if (onLogout) onLogout();
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 rounded-2xl active:scale-95 transition-all"
                  style={{
                    background: "rgba(255,68,68,0.08)",
                    border: "1px solid rgba(255,68,68,0.25)",
                    color: "#ff6b6b",
                    fontFamily: "Inter",
                    fontWeight: 700,
                    fontSize: "15px",
                  }}
                >
                  <LogOut size={16} />
                  {t.common.logout}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function SettingsDrawer(props: SettingsDrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <DrawerContent {...props} />,
    document.body
  );
}
