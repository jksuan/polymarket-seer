// ============================================================
// 通用工具函数
// ============================================================

/**
 * 将 Unix 时间戳 (秒) 转换为相对时间描述 (如 "3分前", "2小时前")
 */
export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "-";
  const diff = Math.floor(Date.now() / 1000 - timestamp);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

/**
 * 将文本复制到剪贴板
 */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * 清除所有 Polymarket API 凭证缓存 (localStorage 中以 poly_creds_ 开头的项)
 */
export function clearCredsCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("poly_creds_")) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

/**
 * 从 localStorage 读取 API 凭证
 */
export function getCachedCreds(walletAddress: string): any | null {
  try {
    const cached = localStorage.getItem(`poly_creds_${walletAddress}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

/**
 * 将 API 凭证写入 localStorage 缓存
 */
export function setCachedCreds(walletAddress: string, creds: any): void {
  localStorage.setItem(`poly_creds_${walletAddress}`, JSON.stringify(creds));
}

/**
 * 格式化钱包地址为缩略显示 (0x1234...abcd)
 */
export function shortenAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (!address) return "";
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}
