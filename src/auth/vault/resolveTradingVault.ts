import { ethers } from "ethers";
import { SignatureTypeV2 } from "@polymarket/clob-client-v2";

import { createTradingRelayClient } from "./relayClientFactory";
import type { TradingVaultContext } from "./types";

/**
 * 解析当前用户的 Polymarket 交易金库（Deposit Wallet, CLOB type 3）。
 * 若缓存地址与链上推导一致则复用，避免旧 Safe 地址误用。
 */
export async function resolveTradingVault(
  signer: ethers.Signer,
  cachedVaultAddress?: string | null
): Promise<TradingVaultContext> {
  const relayClient = createTradingRelayClient(signer);
  const derivedAddress = await relayClient.deriveDepositWalletAddress();
  const useCached =
    cachedVaultAddress &&
    cachedVaultAddress.toLowerCase() === derivedAddress.toLowerCase();

  return {
    kind: "deposit",
    address: useCached ? cachedVaultAddress : derivedAddress,
    signatureType: SignatureTypeV2.POLY_1271,
  };
}
