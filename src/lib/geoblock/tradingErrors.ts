import type { Locale } from "@/i18n/localeStorage";
import { getGeoblockTradeBlockedDesc } from "./geoblockMessages";

function normalizeErrorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

/** Map CLOB/axios failures; use geoblock copy when region is blocked. */
export function formatTradingExecutionError(
  err: unknown,
  locale: Locale,
  isRegionBlocked: boolean
): string {
  if (isRegionBlocked) {
    return getGeoblockTradeBlockedDesc(locale);
  }

  const raw = normalizeErrorText(err);
  const lower = raw.toLowerCase();

  if (lower.includes("fok_order_not_filled") || lower.includes("fok order")) {
    return locale === "zh"
      ? "市价卖出未能一次性全部成交（FOK）。可尝试减少份额或改用限价卖出。"
      : "Market sell could not fill entirely (FOK). Try a smaller size or a limit sell.";
  }

  if (lower.includes("network error") || lower === "network error") {
    return locale === "zh"
      ? "网络连接异常，未能提交订单。请检查网络后重试。"
      : "Network error while submitting the order. Check your connection and retry.";
  }

  return raw;
}
