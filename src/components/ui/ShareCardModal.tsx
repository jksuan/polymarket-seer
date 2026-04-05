'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Loader2, Share2 } from 'lucide-react';
import type { ShareCardData } from '@/hooks/useShareCard';

function XLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface ShareCardModalProps {
  isOpen: boolean;
  isGenerating: boolean;
  cardImageUrl: string | null;
  cardData: ShareCardData | null;
  onClose: () => void;
  onSaveCard: () => void;
  onShareToX: () => void;
}

function canNativeShare() {
  if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
  // Only treat as native share on real mobile devices (not Windows desktop Chrome/Edge)
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function ShareCardModal({
  isOpen, isGenerating, cardImageUrl, cardData, onClose, onSaveCard, onShareToX,
}: ShareCardModalProps) {
  const nativeShare = canNativeShare();
  if (!isOpen || !cardData) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(10px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="relative flex flex-col items-center w-full max-w-[440px] mx-4 mb-8 sm:mb-0"
          >
            <div className="flex items-center justify-between w-full mb-3">
              <span className="text-white/60 text-sm font-semibold tracking-wide">分享卡片预览</span>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/20 transition-all active:scale-90">
                <X size={16} />
              </button>
            </div>

            <div className="w-full overflow-hidden shadow-2xl" style={{ aspectRatio: '1.91 / 1', borderRadius: 12, background: '#0D0518', border: '1px solid rgba(255,255,255,0.08)' }}>
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center w-full h-full gap-2">
                  <Loader2 size={28} className="text-[#ADFF2F] animate-spin" />
                  <span className="text-white/40 text-xs font-medium">正在生成...</span>
                </div>
              ) : cardImageUrl ? (
                <img src={cardImageUrl} alt="Share card" className="w-full h-full object-cover block" />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-white/30 text-sm">生成失败，请重试</span>
                </div>
              )}
            </div>

            {cardImageUrl && !isGenerating && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="flex items-center gap-3 mt-4 w-full">
                <button onClick={onSaveCard} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] active:scale-95 transition-all outline-none" style={{ background: 'rgba(56,189,248,0.9)', color: '#FFF', boxShadow: '0 4px 12px rgba(14,165,233,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <Download size={16} /> 保存卡片
                </button>
                <button onClick={onShareToX} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-[14px] active:scale-95 transition-all outline-none" style={{ background: 'rgba(74,222,128,0.9)', color: '#FFF', boxShadow: '0 4px 12px rgba(34,197,94,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {nativeShare ? <Share2 size={15} /> : <XLogo size={15} />}
                  {nativeShare ? '一键分享' : '分享到 X'}
                </button>
              </motion.div>
            )}

            {cardImageUrl && !isGenerating && (
              <div className="text-[10px] text-white/70 mt-3 text-center leading-relaxed">
                {nativeShare ? (
                  <>
                    「保存卡片」→ 存储到相册<br />
                    「一键分享」→ 直接发布到 X、Instagram 等社交媒体
                  </>
                ) : (
                  <>
                    点击「保存卡片」下载图片<br />
                    请手动将图片附加到 Instagram、Facebook、Telegram 等社交媒体的帖子中
                  </>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
