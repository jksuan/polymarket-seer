import { USDC_DECIMALS } from "@/lib/constants";
import { isValidApiKeyCreds } from "@/lib/clobApiKeyCreds";

export type CollateralBalanceResponse = {
  balance?: string | null;
} | null;

export type ValidClobApiKeyCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

export function formatUsdcBalanceFromAtomicUnits(atomicUnits: string): string {
  const whole = Number(atomicUnits) / 10 ** USDC_DECIMALS;
  return whole.toFixed(2);
}

/**
 * 按 ADR-0004：有效 creds 时优先 CLOB collateral，否则读 proxy Safe 上 USDC.e。
 */
export async function readUsdcBalanceDisplay(params: {
  creds: ValidClobApiKeyCreds | null;
  fetchClobCollateralBalance: () => Promise<CollateralBalanceResponse>;
  fetchProxyUsdcBalance: () => Promise<string>;
  switchChainForFallback: () => Promise<void>;
}): Promise<{ displayBalance: string; readOk: boolean }> {
  if (isValidApiKeyCreds(params.creds)) {
    try {
      const balanceData = await params.fetchClobCollateralBalance();
      if (balanceData != null && balanceData.balance != null && balanceData.balance !== undefined) {
        return {
          displayBalance: formatUsdcBalanceFromAtomicUnits(String(balanceData.balance)),
          readOk: true,
        };
      }
    } catch {
      // 降级链上
    }
  }

  try {
    await params.switchChainForFallback();
    const proxyBal = await params.fetchProxyUsdcBalance();
    return {
      displayBalance: formatUsdcBalanceFromAtomicUnits(proxyBal),
      readOk: true,
    };
  } catch {
    return { displayBalance: "0.00", readOk: false };
  }
}
