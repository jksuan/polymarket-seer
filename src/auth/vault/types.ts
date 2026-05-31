import type { SignatureTypeV2 } from "@polymarket/clob-client-v2";

/** 交易金库类型 */
export type TradingVaultKind = "safe" | "deposit";

/** 用户 Polymarket 交易金库上下文（funder + CLOB signatureType） */
export type TradingVaultContext = {
  kind: TradingVaultKind;
  address: string;
  signatureType: SignatureTypeV2;
};
