import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `$${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `$${(volume / 1_000).toFixed(1)}k`;
  return `$${volume.toFixed(0)}`;
}

export function formatSupporters(count: number): string {
  if (count >= 10_000) return `${(count / 10_000).toFixed(1)}w`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toString();
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "-";
  const diff = Math.floor(Date.now() / 1000 - timestamp);
  if (diff < 60) return "刚刚";
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  return `${Math.floor(diff / 86400)}天前`;
}

export function clearCredsCache(): void {
  if (typeof window === "undefined") return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("poly_creds_")) keysToRemove.push(k);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

export function getCachedCreds(walletAddress: string): any | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = localStorage.getItem(`poly_creds_${walletAddress}`);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function setCachedCreds(walletAddress: string, creds: any): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`poly_creds_${walletAddress}`, JSON.stringify(creds));
}

export function shortenAddress(address: string, prefixLen = 6, suffixLen = 4): string {
  if (!address) return "";
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`;
}

export async function copyToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined") {
    await navigator.clipboard.writeText(text);
  }
}
