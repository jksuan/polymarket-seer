// Share function
export function handleShare(title: string, text: string) {
  if (navigator.share) {
    navigator.share({ title, text }).catch((err) => console.log('分享失败', err));
  } else {
    navigator.clipboard.writeText(`${title}\n${text}`).then(() => {
      alert("内容已复制到剪贴板，快去分享吧！");
    });
  }
}

// Format Unix Timestamp (seconds) to YYYY/MM/DD HH:mm
export function formatTimestamp(timestamp: number | null | undefined): string {
  if (!timestamp) return "";
  const ts = new Date(timestamp * 1000);
  return `${ts.getFullYear()}/${String(ts.getMonth()+1).padStart(2,"0")}/${String(ts.getDate()).padStart(2,"0")} ${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}`;
}

// Calculate holding duration based on buy/redeem timestamps
export function formatHoldingTime(redeemTs: number, buyTs: number, timeTranslations: any): string {
  if (redeemTs > 0 && buyTs > 0 && redeemTs > buyTs) {
    const diffSec = redeemTs - buyTs;
    const days = Math.floor(diffSec / 86400);
    const hours = Math.floor((diffSec % 86400) / 3600);
    if (days > 0) return hours > 0 ? timeTranslations.daysAndHours(days, hours) : timeTranslations.days(days);
    if (hours > 0) return timeTranslations.hours(hours);
    const mins = Math.floor(diffSec / 60);
    return mins > 0 ? timeTranslations.minutes(mins) : timeTranslations.lessThanMin;
  }
  return "";
}

// Get standard styling for YES/NO/Other outcome badges
export function getOutcomeStyle(outcome: string) {
  const lc = (outcome || "").toLowerCase();
  if (lc === "yes") return { bg: "rgba(107,255,143,0.12)", border: "1px solid rgba(107,255,143,0.25)", color: "#6bff8f" };
  if (lc === "no") return { bg: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b" };
  return { bg: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa" };
}
