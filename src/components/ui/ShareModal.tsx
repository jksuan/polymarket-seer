import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Download, Share, Loader2 } from 'lucide-react';
import { toJpeg } from 'html-to-image';
import { SharePoster } from './SharePoster';
import { ParsedMatch } from './MatchCard';

// ── 环境探针：区分真实移动设备与桌面浏览器 ──
function getIsMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

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
  const isMobile = useMemo(() => getIsMobile(), []);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && match) {
      setDataUrl(null);
      setIsGenerating(true);

      const timer = setTimeout(async () => {
        if (!posterRef.current) return;
        try {
          const url = await toJpeg(posterRef.current, { 
            quality: 0.9, 
            pixelRatio: 1,
            cacheBust: true,
          });
          setDataUrl(url);
        } catch (error) {
          console.error('Failed to generate poster:', error);
        } finally {
          setIsGenerating(false);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, match]);

  // ── 工具：将 dataUrl 转为 File 对象 ──
  const getImageFile = async (): Promise<File> => {
    const blob = await (await fetch(dataUrl!)).blob();
    return new File([blob], 'polymarket_prediction.jpg', { type: 'image/jpeg' });
  };

  // ── 检测当前环境是否支持 canShare(files) ──
  const canNativeShareFiles = async (file: File): Promise<boolean> => {
    try {
      return 'canShare' in navigator && navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  };

  // ══════════════════════════════════════════════════
  // 【一键分享】按钮逻辑
  //   手机端 → navigator.share({ files + text })，弹出系统原生分享面板
  //   桌面端 → 打开 Twitter/X Web Intent 窗口（纯文本+链接引导）
  // ══════════════════════════════════════════════════
  const handleShare = async () => {
    if (!dataUrl || !match) return;

    if (isMobile) {
      // ── 手机：原生分享面板（带图 + 文案） ──
      try {
        const file = await getImageFile();
        if (await canNativeShareFiles(file)) {
          await navigator.share({
            files: [file],
            title: 'Polymarket Seer Prediction',
            text: `⚡ ${match.home.name} vs ${match.away.name}\nI made my prediction on Polymarket Seer — think you know better?`,
          });
        } else {
          // 极端低版本手机不支持 canShare，降级到 Twitter Intent
          openTwitterIntent(match);
        }
      } catch (err: any) {
        // 用户点击原生面板外沿取消 → 静默吞噬
        if (err?.name === 'AbortError') return;
        // 非预期异常 → 降级到 Twitter Intent
        console.warn('Native share failed, falling back to Twitter Intent:', err);
        openTwitterIntent(match);
      }
    } else {
      // ── 桌面：弹出 Twitter/X Web Intent ──
      openTwitterIntent(match);
    }
  };

  // ══════════════════════════════════════════════════
  // 【保存相册】按钮逻辑
  //   手机端 → navigator.share({ files-only })，弹出系统面板让用户点"存储图像"
  //   桌面端 → 经典 <a download> HTML5 下载
  // ══════════════════════════════════════════════════
  const handleSave = async () => {
    if (!dataUrl || !match) return;

    if (isMobile) {
      // ── 手机：原生存储面板（纯图片，无文案） ──
      try {
        const file = await getImageFile();
        if (await canNativeShareFiles(file)) {
          await navigator.share({ files: [file] });
        } else {
          // 不支持 canShare → 降级为 <a download> 触发
          downloadRef.current?.click();
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('Native save failed, falling back to download:', err);
        downloadRef.current?.click();
      }
    } else {
      // ── 桌面：经典下载 ──
      downloadRef.current?.click();
    }
  };

  // ── Twitter/X Web Intent 弹窗 ──
  const openTwitterIntent = (m: ParsedMatch) => {
    const text = encodeURIComponent(
      `⚡ ${m.home.name} vs ${m.away.name}\n\nI made my prediction on @Polymarket — think you know better?\n\n👇 Save the card above & post it with your reply!`
    );
    const url = `https://twitter.com/intent/tweet?text=${text}`;
    window.open(url, '_blank', 'width=550,height=420,noopener,noreferrer');
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
                height: 'calc(100dvh - 290px)',
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
                <img 
                  src={dataUrl} 
                  alt="Prediction Poster" 
                  className="w-full h-full object-contain" 
                  style={{ touchAction: 'none' }} 
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
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      {isMobile ? '长按上方图片也可直接保存或发送给朋友' : '右键图片可另存为本地文件'}
                    </span>
                  </div>
                  
                  <div className="flex gap-3 w-full">
                    {/* 一键分享（手机: 原生面板带图+文，桌面: Twitter Intent） */}
                    <button
                      onClick={handleShare}
                      className="flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                      style={{ background: '#00F0FF', color: '#000', fontWeight: 800, fontSize: '15px' }}
                    >
                      <Share size={18} />
                      {isMobile ? '一键分享' : '分享到 𝕏'}
                    </button>
                    
                    {/* 保存相册（手机: 原生存储面板，桌面: 经典下载） */}
                    <button
                      onClick={handleSave}
                      className="flex-1 py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all text-white"
                      style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '15px' }}
                    >
                      <Download size={18} />
                      {isMobile ? '保存相册' : '保存图片'}
                    </button>
                  </div>

                  {/* 隐藏的 <a download> 锚点，供桌面端和 fallback 场景程序化触发 */}
                  <a
                    ref={downloadRef}
                    href={dataUrl}
                    download={`prediction_${match.id}.jpg`}
                    className="hidden"
                    aria-hidden="true"
                  />
                </>
              )}
            </div>
          </motion.div>

          {/* 隐藏的实际 DOM 生成区 */}
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
