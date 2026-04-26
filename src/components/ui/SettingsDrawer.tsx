'use client';

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Globe,
  Shield,
  FileText,
  ChevronRight,
  LogOut,
  Info,
  Copy,
  CheckCircle2,
  Wallet,
  Building2,
  ChevronLeft,
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
  const [activePanel, setActivePanel] = useState<'main' | 'privacy' | 'terms' | 'about'>('main');
  const [copiedProxy, setCopiedProxy] = useState(false);
  const [copiedEoa, setCopiedEoa] = useState(false);

  const SETTINGS_GROUPS = [
    {
      title: t.settings.preferences,
      items: [
        { id: 'language', icon: Globe, label: t.settings.language, value: locale === 'zh' ? t.settings.languageZh : t.settings.languageEn, color: "#00F0FF" },
      ],
    },
    {
      title: t.settings.legal,
      items: [
        { id: 'privacy', icon: Shield, label: t.settings.privacy, value: "", color: "#34D399" },
        { id: 'terms', icon: FileText, label: t.settings.terms, value: "", color: "#34D399" },
        { id: 'about', icon: Info, label: t.settings.about, value: "v1.0.0", color: "#F59E0B" },
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
                            } else if (item.id === 'privacy') {
                              setActivePanel('privacy');
                            } else if (item.id === 'terms') {
                              setActivePanel('terms');
                            } else if (item.id === 'about') {
                              setActivePanel('about');
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

          {/* Sub Panels */}
          <AnimatePresence>
            {activePanel !== 'main' && (
              <motion.div
                key="sub-panel"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 10000,
                  maxWidth: "448px",
                  margin: "0 auto",
                  background: "#0D0518",
                  display: "flex",
                  flexDirection: "column",
                  borderLeft: "1px solid rgba(255,255,255,0.08)",
                  borderRight: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {/* Sub Panel Header */}
                <div className="sticky top-0 z-50 bg-[#0D0518]/90 backdrop-blur-xl border-b border-white/5">
                  <div className="flex items-center justify-between px-4 h-14">
                    <button
                      onClick={() => setActivePanel('main')}
                      className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center active:bg-white/5 transition-colors"
                    >
                      <ChevronLeft size={24} className="text-white" />
                    </button>
                    <span className="font-bold text-lg">
                      {activePanel === 'privacy' && t.settings.privacy}
                      {activePanel === 'terms' && t.settings.terms}
                      {activePanel === 'about' && t.settings.about}
                    </span>
                    <div className="w-10" />
                  </div>
                </div>

                {/* Sub Panel Content */}
                <div className="flex-1 overflow-y-auto p-6 pb-12">
                  {activePanel === 'privacy' && <PrivacyContent />}
                  {activePanel === 'terms' && <TermsContent />}
                  {activePanel === 'about' && <AboutContent />}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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

function PrivacyContent() {
  return (
    <>
      <p className="text-white/50 text-xs mb-8 uppercase tracking-widest font-bold">
        Last Updated: April 2026
      </p>
      <h3 className="text-white text-lg font-bold mb-3">1. Information Collection</h3>
      <p className="text-white/70 text-[15px] leading-relaxed mb-6">
        We collect standard information required for Web3 authentication via Privy and usage analytics. Your wallet address, transaction history, and interactions with smart contracts are recorded on public blockchains and are naturally public.
      </p>
      <h3 className="text-white text-lg font-bold mb-3">2. Data Usage</h3>
      <p className="text-white/70 text-[15px] leading-relaxed mb-6">
        The information we collect locally or through our servers is primarily used to provide betting services, display your portfolio, and enhance your overall application experience. We do not sell your personal data to third parties.
      </p>
      <h3 className="text-white text-lg font-bold mb-3">3. Third-Party Services</h3>
      <p className="text-white/70 text-[15px] leading-relaxed mb-6">
        This application utilizes third-party infrastructure including Polymarket for market matching and Privy for wallet generation. Please refer to their respective privacy policies to understand how they handle your data on the blockchain.
      </p>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <p className="text-white/50 text-xs mb-8 uppercase tracking-widest font-bold">
        Last Updated: April 2026
      </p>
      <h3 className="text-white text-lg font-bold mb-3">1. Acceptance of Terms</h3>
      <p className="text-white/70 text-[15px] leading-relaxed mb-6">
        By accessing and using SEER.SPORTS, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
      </p>
      <h3 className="text-white text-lg font-bold mb-3">2. Restricted Territories</h3>
      <p className="text-white/70 text-[15px] leading-relaxed mb-6">
        You must not access this application if you are located in, or are a citizen or resident of, the United States of America or any other jurisdiction where such services are restricted or prohibited by law.
      </p>
      <h3 className="text-white text-lg font-bold mb-3">3. Risk Acknowledgement</h3>
      <p className="text-white/70 text-[15px] leading-relaxed mb-6">
        Trading in prediction markets involves significant risk of potential loss. You should carefully consider your financial situation and risk tolerance before trading. Smart contracts are subject to vulnerabilities. SEER.SPORTS acts solely as a UI interface and is not liable for any losses incurred.
      </p>
    </>
  );
}

function AboutContent() {
  return (
    <div className="flex flex-col items-center pt-8 text-center">
      <div className="w-24 h-24 bg-gradient-to-tr from-[#00F0FF] to-[#007AFF] rounded-3xl shadow-[0_0_30px_rgba(0,240,255,0.3)] flex items-center justify-center mb-6">
        <span className="text-white text-4xl font-black">S</span>
      </div>
      <h2 className="text-2xl font-black text-white mb-2">SEER.SPORTS</h2>
      <p className="text-[#00F0FF] font-bold text-sm mb-8 tracking-widest">v1.0.0</p>
      
      <p className="text-white/70 text-[15px] leading-relaxed mb-12">
        Next-generation sports prediction market built on top of Polymarket. 
        Trade the outcome of major sporting events securely and globally.
      </p>

      <div className="flex gap-4 w-full">
        <a href="#" className="flex-1 bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col items-center gap-2 active:bg-white/10 transition-colors">
          <Globe size={24} className="text-white/80" />
          <span className="text-white text-sm font-bold">Website</span>
        </a>
        <a href="#" className="flex-1 bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 p-4 rounded-2xl flex flex-col items-center gap-2 active:bg-[#1DA1F2]/20 transition-colors">
          <svg className="w-6 h-6 text-[#1DA1F2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span className="text-[#1DA1F2] text-sm font-bold">Twitter</span>
        </a>
      </div>
    </div>
  );
}
