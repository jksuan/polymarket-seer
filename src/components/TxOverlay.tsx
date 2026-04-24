"use client";

import { CheckCircle2, XCircle, Copy, Check, HandCoins } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { copyToClipboard } from "@/lib/utils";
import type { TxStep } from "@/hooks/useTrading";
import { useTranslation } from "@/i18n";

interface TxOverlayProps {
  txStep: TxStep;
  txMessage: string;
  txOrderId: string | null;
  txError: string | null;
  proxyAddress: string | null;
  amount: string;
  onClose: () => void;
  onRetry: () => void;
}

export default function TxOverlay({ txStep, txMessage, txOrderId, txError, proxyAddress, amount, onClose, onRetry }: TxOverlayProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (txStep === "idle") return null;

  const isInsufficient = txError?.includes("余额不足") && !!proxyAddress;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-2xl shadow-black/80 flex flex-col items-center gap-5 text-center">
        
        {/* Spinner / Success / Error Icon */}
        {(txStep === "preparing" || txStep === "deploying" || txStep === "approving" || txStep === "placing") && (
          <div className="relative">
            <div className="w-20 h-20 rounded-full border-4 border-zinc-800 border-t-blue-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            </div>
          </div>
        )}
        {txStep === "success" && (
          <div className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
            <CheckCircle2 size={40} className="text-green-500" />
          </div>
        )}
        {txStep === "error" && (
          <div className="w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
            <XCircle size={40} className="text-red-500" />
          </div>
        )}

        {/* Step Indicators */}
        {txStep !== "success" && txStep !== "error" && (
          <div className="flex items-center gap-2 w-full justify-center">
            {(["preparing", "deploying", "approving", "placing"] as TxStep[]).map((step, i) => {
              const steps: TxStep[] = ["preparing", "deploying", "approving", "placing"];
              const currentIdx = steps.indexOf(txStep);
              const stepIdx = i;
              const isActive = stepIdx === currentIdx;
              const isDone = stepIdx < currentIdx;
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    isDone ? "bg-green-500" : isActive ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-zinc-700"
                  }`} />
                  {i < 3 && <div className={`w-6 h-0.5 transition-all duration-300 ${isDone ? "bg-green-500" : "bg-zinc-800"}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Step Label */}
        <div>
          {txStep === "preparing" && <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{t.tx.preparing}</p>}
          {txStep === "deploying" && <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">{t.tx.deploying}</p>}
          {txStep === "approving" && <p className="text-purple-400 text-xs font-bold uppercase tracking-widest">{t.tx.approving}</p>}
          {txStep === "placing" && <p className="text-green-400 text-xs font-bold uppercase tracking-widest">{t.tx.placing}</p>}
          {txStep === "success" && <p className="text-green-400 text-sm font-black uppercase tracking-widest">{t.tx.success}</p>}
          {txStep === "error" && <p className="text-red-400 text-sm font-black uppercase tracking-widest">{t.tx.error}</p>}
        </div>

        {/* Dynamic Message */}
        <p className="text-white text-sm font-medium leading-relaxed">{txMessage}</p>

        {/* Insufficient Balance: Deposit View */}
        {txStep === "error" && isInsufficient && (
          <div className="w-full flex flex-col items-center gap-4 mt-2 mb-2">
            <div className="bg-white p-2 rounded-xl">
              <QRCodeSVG value={proxyAddress!} size={120} />
            </div>
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 w-full space-y-2">
               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest text-left">{t.tx.depositAddress}</p>
               <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-zinc-300 truncate w-full">{proxyAddress}</span>
                  <button onClick={() => handleCopy(proxyAddress!)} className="text-blue-400 hover:text-blue-300 p-1 flex-shrink-0">
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                  </button>
               </div>
            </div>
            <p className="text-xs text-orange-400 font-bold bg-orange-400/10 border border-orange-400/20 px-3 py-2 rounded-lg text-left w-full">
              ⚠️ {t.tx.depositHint} <b>${amount} USDC.e</b> {t.tx.depositHintSuffix}
            </p>
          </div>
        )}

        {/* Order ID on success */}
        {txStep === "success" && txOrderId && (
          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">{t.tx.orderId}</p>
            <p className="text-xs font-mono text-zinc-300 break-all">{txOrderId}</p>
          </div>
        )}

        {/* Error detail (Generic) */}
        {txStep === "error" && txError && !isInsufficient && (
          <div className="w-full bg-red-500/5 border border-red-500/20 rounded-xl p-3 max-h-24 overflow-y-auto">
            <p className="text-xs text-red-300/80 font-mono break-all">{txError}</p>
          </div>
        )}

        {/* Action Buttons */}
        {(txStep === "success" || txStep === "error") && (
          <div className="flex gap-3 w-full mt-2">
            {!isInsufficient && (
              <button
                onClick={onClose}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                  txStep === "success"
                    ? "bg-green-500 hover:bg-green-400 text-black"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white"
                }`}
              >
                {txStep === "success" ? t.trade.done : t.trade.close}
              </button>
            )}
            
            {txStep === "error" && (
              <button
                onClick={onRetry}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all active:scale-95"
              >
                 {isInsufficient ? t.tx.retryAfterDeposit : t.trade.retry}
              </button>
            )}
            
            {/* 如果是余额不足，额外给一个取消按钮 */}
            {txStep === "error" && isInsufficient && (
               <button onClick={onClose} className="py-3 px-4 rounded-xl font-bold text-sm bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95 text-xs">
                 {t.trade.later}
               </button>
            )}
          </div>
        )}

        {/* Subtle hint during processing */}
        {txStep !== "success" && txStep !== "error" && (
          <p className="text-amber-400/90 text-[10px] mt-2 font-medium animate-pulse px-4 py-1.5 bg-amber-400/5 rounded-full border border-amber-400/10">
            ⚠️ {t.tx.doNotClose}
          </p>
        )}
      </div>
    </div>
  );
}
