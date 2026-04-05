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
  usdcAmt?: number;
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

  const saveCard = useCallback(() => {
    if (!cardImageUrl) return;
    const a = document.createElement('a');
    a.href = cardImageUrl;
    a.download = `SEER_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [cardImageUrl]);

  const shareToX = useCallback((title?: string) => {
    if (!cardData) return;
    const t = title ? `我正在预测「${title}」\n` : '我的 Polymarket 预测\n';
    let xText: string;
    if (cardData.type === 'position') {
      const p = cardData.pnl || 0;
      xText = `${t}当前浮${p >= 0 ? '盈' : '亏'} $${Math.abs(p).toFixed(2)}\n\n快来 SEER.SPORTS 一起交流！\n`;
    } else {
      xText = `${t}净盈利 $${(cardData.usdcAmt || 0).toFixed(2)}\n\n来 SEER.SPORTS 挑战我！\n`;
    }
    setTimeout(() => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}`, '_blank');
    }, 500);
  }, [cardData, saveCard]);

  return { showModal, isGenerating, cardImageUrl, cardData, generateCard, closeModal, saveCard, shareToX };
}
