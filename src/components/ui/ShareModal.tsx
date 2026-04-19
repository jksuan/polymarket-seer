import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share, Loader2 } from 'lucide-react';
import { toPng, toJpeg } from 'html-to-image';
import { SharePoster } from './SharePoster';
import { ParsedMatch } from './MatchCard';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: ParsedMatch | null;
  positions?: any[];
}

export function ShareModal({ isOpen, onClose, match, positions }: ShareModalProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const posterRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && match) {
      setDataUrl(null);
      setIsGenerating(true);

      // 小幅延迟，确保隐藏的 DOM 完全渲染并且字体/图片加载完成
      const timer = setTimeout(async () => {
        if (!posterRef.current) return;
        try {
          // 为了兼容 iOS 跨域和渲染，使用 toJpeg 并忽略 CORS 报错，如果可能的话
          const url = await toJpeg(posterRef.current, { 
            quality: 0.9, 
            pixelRatio: 1, // 已经是 1080x1920，不需要再放大像素比
            cacheBust: true,
          });
          setDataUrl(url);
        } catch (error) {
          console.error('Failed to generate poster:', error);
          // TODO: 优雅降级或提示
        } finally {
          setIsGenerating(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, match]);

  // 调用原生 Web Share API （如果支持）
  const handleNativeShare = async () => {
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'prediction.jpg', { type: 'image/jpeg' });
      if ('canShare' in navigator && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Polymarket Prediction',
          text: `Check out my prediction for ${match?.home.name} vs ${match?.away.name}!`,
        });
      } else {
        alert('系统不支持原生分享，请长按图片保存。');
      }
    } catch (err) {
      console.error('Share error:', err);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && match && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative z-10 w-full max-w-sm flex flex-col items-center p-4"
          >
            {/* Close button row */}
            <div className="w-full flex justify-end mb-3">
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 active:scale-90 transition-all border border-white/10"
              >
                <X size={20} color="#fff" />
              </button>
            </div>

            {/* Poster Preview */}
            <div 
              className="relative rounded-2xl overflow-hidden shadow-2xl flex-shrink-0"
              style={{ 
                aspectRatio: '9/16', 
                background: '#111',
                height: 'calc(100dvh - 290px)', // 给按钮行、底部文案和操作留出空间
                maxHeight: '520px',
                width: 'auto',
                maxWidth: '100%'
              }}
            >
              {isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                  <Loader2 size={32} color="#00F0FF" className="animate-spin" />
                  <span style={{ fontFamily: 'Inter', fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                    正在生成全息战报...
                  </span>
                </div>
              ) : dataUrl ? (
                // 显示生成的图片
                <img 
                  src={dataUrl} 
                  alt="Prediction Poster" 
                  className="w-full h-full object-contain" 
                  style={{ touchAction: 'none' /* 防止拖拽，但支持长按 */ }} 
                />
              ) : null}
            </div>

            {/* Actions */}
            <div className="w-full mt-6 flex flex-col gap-3">
              {dataUrl && (
                <>
                  <div className="text-center mb-1 flex flex-col gap-1">
                    <span style={{ fontSize: '13px', color: '#00F0FF', fontWeight: 800 }}>
                      🎁 邀请朋友扫码参战，持续赚取 Polymarket 推荐返佣
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>长按上方图片可直接保存或发送给朋友</span>
                  </div>
                  
                  <div className="flex gap-3 w-full">
                    {/* Web Share Button */}
                    {typeof navigator !== 'undefined' && 'canShare' in navigator && (
                      <button
                        onClick={handleNativeShare}
                        className="flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        style={{ background: '#00F0FF', color: '#000', fontWeight: 800, fontSize: '15px' }}
                      >
                        <Share size={18} />
                        一键分享
                      </button>
                    )}
                    
                    {/* Download Anchor Fallback */}
                    <a
                      href={dataUrl}
                      download={`prediction_${match.id}.jpg`}
                      className="flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-white"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '15px' }}
                    >
                      <Download size={18} />
                      保存相册
                    </a>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* 隐藏的实际 DOM 生成区 (必须在 viewport 之内，但通过 opacity-0 隐藏，否则 html-to-image 无法渲染) */}
          <div 
            style={{ 
              position: 'fixed', 
              top: 0, 
              left: 0, 
              opacity: 0, 
              pointerEvents: 'none', 
              zIndex: -100 
            }}
          >
            {/* 只传特定 match 和 user 的对应的 position */}
            <SharePoster 
              ref={posterRef} 
              match={match} 
              userPosition={
                positions?.find(p => p.asset === match.home.tokenId) || 
                positions?.find(p => p.asset === match.away.tokenId) || 
                positions?.find(p => p.asset === match.draw.tokenId)
              } 
            />
          </div>
        </div>
      )}
    </AnimatePresence>, 
    document.body
  );
}
