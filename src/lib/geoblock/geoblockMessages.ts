import type { Locale } from "@/i18n/localeStorage";
import type { GeoblockOrderGateResult } from "./types";

type GeoblockCopy = {
  blockedTitle: string;
  blockedDesc: string;
  checkFailedTitle: string;
  checkFailedDesc: string;
  banner: string;
  confirmDisabled: string;
  tradeBlockedDesc: string;
};

const zh: GeoblockCopy = {
  blockedTitle: "当前地区暂不支持下单",
  blockedDesc: "当前地区暂不支持下单交易",
  checkFailedTitle: "暂时无法验证地区",
  checkFailedDesc: "地区合规检查未成功，请稍后重试。",
  banner: "当前地区暂不支持下单",
  confirmDisabled: "您所在地区暂不支持下单",
  tradeBlockedDesc: "当前地区暂不支持下单交易",
};

const en: GeoblockCopy = {
  blockedTitle: "Trading unavailable in your region",
  blockedDesc: "Order placement is not available in your region",
  checkFailedTitle: "Unable to verify region",
  checkFailedDesc: "The geographic compliance check failed. Please try again later.",
  banner: "Trading unavailable in your region",
  confirmDisabled: "Trading unavailable in your region",
  tradeBlockedDesc: "Order placement is not available in your region",
};

export function getGeoblockCopy(locale: Locale): GeoblockCopy {
  return locale === "zh" ? zh : en;
}

export function formatGeoblockOrderError(
  locale: Locale,
  gate: Extract<GeoblockOrderGateResult, { allowed: false }>
): { title: string; description: string } {
  const copy = getGeoblockCopy(locale);
  if (gate.reason === "check_failed") {
    return { title: copy.checkFailedTitle, description: copy.checkFailedDesc };
  }
  return { title: copy.blockedTitle, description: copy.blockedDesc };
}

export function getGeoblockBannerText(locale: Locale, blocked: boolean): string | null {
  if (!blocked) return null;
  return getGeoblockCopy(locale).banner;
}

export function getGeoblockConfirmDisabledText(locale: Locale): string {
  return getGeoblockCopy(locale).confirmDisabled;
}

export function getGeoblockTradeBlockedDesc(locale: Locale): string {
  return getGeoblockCopy(locale).tradeBlockedDesc;
}
