import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X, Copy, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import QRCode from "react-qr-code";

interface DepositDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proxyAddress: string;
}

function DrawerContent({ isOpen, onClose, proxyAddress }: DepositDrawerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!proxyAddress) return;
    try {
      await navigator.clipboard.writeText(proxyAddress);
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex flex-col max-h-[85vh] rounded-t-3xl border-t border-white/10 mx-auto w-full max-w-[448px]"
            style={{
              background: "linear-gradient(180deg, #1c0f2e 0%, #0d0518 100%)",
              boxShadow: "0 -20px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* Grabber */}
            <div className="w-full flex justify-center pt-3 pb-2 cursor-pointer" onClick={onClose}>
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pb-8 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-white tracking-wide">
                  充值到金库
                </h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-center bg-white/5 rounded-3xl p-6 mb-6 border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#ADFF2F] opacity-10 blur-[50px] rounded-full pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#00F0FF] opacity-10 blur-[50px] rounded-full pointer-events-none" />
                
                <div className="bg-white p-3 rounded-2xl shadow-[0_0_20px_rgba(173,255,47,0.2)] mb-5 relative z-10">
                  <QRCode
                    value={proxyAddress || "0x"}
                    size={160}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox={`0 0 160 160`}
                  />
                </div>

                <div 
                  onClick={handleCopy}
                  className="flex items-center justify-between w-full bg-black/40 rounded-xl p-3 border border-white/10 cursor-pointer active:scale-[0.98] transition-all group"
                >
                  <div className="flex flex-col mr-3 flex-1 min-w-0">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">
                      充值地址 (Proxy Address)
                    </span>
                    <span className="text-[11px] text-white font-mono break-all leading-tight">
                      {proxyAddress || "未分配"}
                    </span>
                  </div>
                  <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-colors ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/60 group-hover:bg-white/20'}`}>
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                  </div>
                </div>
              </div>

              {/* Warning Checklist */}
              <div className="flex flex-col gap-3 mb-2">
                <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                  <Info className="text-blue-400 mt-0.5 shrink-0" size={18} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-blue-100 mb-1">必须选择 Polygon 网络</span>
                    <span className="text-xs text-blue-200/70 leading-relaxed">
                      请确保在交易所提币时选择 <strong className="text-[#ADFF2F]">Polygon (MATIC)</strong> 网络，选择错误网络将导致资产永久丢失。
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-purple-500/10 border border-purple-500/20 p-4 rounded-2xl">
                  <div className="w-4 h-4 shrink-0 mt-1 rounded-full border-[2px] border-purple-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-purple-100 mb-1">仅支持 USDC.e 或 USDC</span>
                    <span className="text-xs text-purple-200/70 leading-relaxed">
                      请勿充值任何其他代币，金库目前仅支持原生 USDC 及跨链桥 USDC.e 计价。
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 p-4 rounded-2xl">
                  <AlertTriangle className="text-[#ff6b6b] mt-0.5 shrink-0" size={18} />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#ffcad4] mb-1">切勿直接充值至登录钱包</span>
                    <span className="text-xs text-[#ffcad4]/70 leading-relaxed">
                      请严格使用上方的专属金库地址。充值到您的登录授权或邮箱生成的 EOA 钱包将<strong>无法用于下注</strong>。
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function DepositDrawer(props: DepositDrawerProps) {
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
