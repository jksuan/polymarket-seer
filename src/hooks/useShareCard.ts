import { useState, useCallback } from 'react';

export type ShareCardData = {
  type: 'position' | 'history';
  title?: string;
  icon?: string;
  iconBase64?: string;
  outcome?: string;
  isWon?: boolean;
  pnl?: number;
  pnlPct?: number;
  initialValue?: number;
  currentValue?: number;
  expectedReturn?: number;
  avgPrice?: number;
  curPrice?: number;
  netProfit?: number;
  entryPct?: number;
  holdingStr?: string;
  timeStr?: string;
};

export function useShareCard() {
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardImageUrl, setCardImageUrl] = useState<string | null>(null);
  const [cardData, setCardData] = useState<ShareCardData | null>(null);

  const generateCard = useCallback(async (data: ShareCardData) => {
    setCardData(data);
    setCardImageUrl(null);
    setIsGenerating(true);
    setShowModal(true);

    try {
      // 1. Proxy icon URL -> base64
      let iconBase64 = data.iconBase64;
      if (data.icon && !iconBase64) {
        try {
          const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(data.icon)}`);
          if (res.ok) {
            const blob = await res.blob();
            iconBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          }
        } catch (e) {
          console.error("Failed to proxy icon:", e);
        }
      }

      // 2. POST to Satori API route
      const response = await fetch('/api/share-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, iconBase64 }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error ${response.status}: ${errText}`);
      }

      // 3. Convert response PNG blob to object URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setCardImageUrl(url);
      setCardData(prev => prev ? { ...prev, iconBase64 } : null);
    } catch (e) {
      console.error('Error generating share card:', e);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const saveCard = useCallback(async () => {
    if (!cardImageUrl) return;

    const isMobile = typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Mobile: use native share sheet (files only) — user taps "Save to Photos"
    if (isMobile && navigator.share && navigator.canShare) {
      try {
        const response = await fetch(cardImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `SEER_${Date.now()}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // user cancelled
        console.warn('Web Share save failed, falling back to download:', e);
      }
    }

    // Desktop fallback: trigger browser download
    const a = document.createElement('a');
    a.href = cardImageUrl;
    a.download = `SEER_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [cardImageUrl]);

  const shareToX = useCallback(async (title?: string) => {
    if (!cardData) return;
    const t = title ? `我正在预测「${title}」\n` : '我的 Polymarket 预测\n';
    
    // 从环境变量中读取品牌名和链接，并提供默认兜底值
    const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || 'SEER.SPORTS';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://supastarter.08612345.xyz';
    
    let xText: string;
    if (cardData.type === 'position') {
      const p = cardData.pnl || 0;
      const pct = cardData.pnlPct || 0;
      if (p >= 0) {
        xText = `${t}当前浮盈 $${Math.abs(p).toFixed(2)}，收益率+${Math.abs(pct).toFixed(2)}%，坐等收米！\n\n快来 ${brandName} 挑战我！\n${baseUrl}`;
      } else {
        xText = `${t}当前浮亏 $${Math.abs(p).toFixed(2)}，收益率-${Math.abs(pct).toFixed(2)}%，持有中，静待翻盘！\n\n快来 ${brandName} 挑战我！\n${baseUrl}`;
      }
    } else {
      const netProfit = cardData.netProfit || 0;
      const entryPct = cardData.entryPct || 100; // 避免除以 0
      const roi = ((100 - entryPct) / entryPct) * 100;
      
      xText = `${t}成功吃肉！净利 $${netProfit.toFixed(2)}，回报率 ${roi.toFixed(2)}%，收米离场！\n\n快来 ${brandName} 挑战我！\n${baseUrl}`;
    }

    // Only use Web Share API on real mobile devices
    const isMobile = typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && cardImageUrl && navigator.share && navigator.canShare) {
      try {
        const response = await fetch(cardImageUrl);
        const blob = await response.blob();
        const file = new File([blob], `SEER_${Date.now()}.png`, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'SEER.SPORTS', text: xText, files: [file] });
          return;
        }
      } catch (e: unknown) {
        // User cancelled the share sheet — do nothing, stay on preview
        if (e instanceof DOMException && e.name === 'AbortError') return;
        console.warn('Web Share API failed, falling back to X intent:', e);
      }
    }

    // Desktop / fallback: open X intent link
    setTimeout(() => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`, '_blank');
    }, 100);
  }, [cardData, cardImageUrl]);

  return { showModal, isGenerating, cardImageUrl, cardData, generateCard, closeModal, saveCard, shareToX };
}
