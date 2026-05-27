import { isValidApiKeyCreds } from "@/lib/clobApiKeyCreds";
import {
  formatCollateralBalanceFromAtomicUnits,
  type CollateralAllowanceResponse,
} from "@/auth/collateralBalance";

export type CollateralBalanceResponse = CollateralAllowanceResponse;

export type ValidClobApiKeyCreds = {
  key: string;
  secret: string;
  passphrase: string;
};

/** @deprecated 使用 formatCollateralBalanceFromAtomicUnits */
export function formatUsdcBalanceFromAtomicUnits(atomicUnits: string): string {
  return formatCollateralBalanceFromAtomicUnits(atomicUnits);
}

/**
 * 顶栏 collateral 展示 = CLOB sync 后的可交易余额（pUSD）。
 * legacy USDC.e 须在调用方经 Collateral Onramp wrap 并完成 sync 后再传入 balanceAtomic。
 */
export async function readUsdcBalanceDisplay(params: {
  creds: ValidClobApiKeyCreds | null;
  fetchTradableCollateralBalance: () => Promise<{ balanceAtomic: bigint; readOk: boolean }>;
}): Promise<{ displayBalance: string; readOk: boolean }> {
  if (!isValidApiKeyCreds(params.creds)) {
    return { displayBalance: "0.00", readOk: false };
  }

  try {
    const { balanceAtomic, readOk } = await params.fetchTradableCollateralBalance();
    return {
      displayBalance: formatCollateralBalanceFromAtomicUnits(balanceAtomic),
      readOk,
    };
  } catch {
    return { displayBalance: "0.00", readOk: false };
  }
}
