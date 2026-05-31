import { ethers } from "ethers";
import type { RelayClient } from "@polymarket/builder-relayer-client";

import { buildTradingApprovalRelayBatch } from "@/auth/collateralBalance";
import { createTradingRelayClient } from "./relayClientFactory";

/** @deprecated 阶段二已迁移至 Deposit Wallet；保留供参考 */
export function createSafeRelayClient(signer: ethers.Signer): RelayClient {
  return createTradingRelayClient(signer);
}

/** 确保 Safe 金库已部署；返回部署前是否已存在 */
export async function ensureSafeVaultDeployed(
  relayClient: RelayClient,
  vaultAddress: string
): Promise<boolean> {
  const isDeployed = await relayClient.getDeployed(vaultAddress);
  if (isDeployed) {
    return true;
  }

  const deployTx = await relayClient.deploy();
  await deployTx.wait();
  return false;
}

/** 批量设置 pUSD / CTF 交易授权 */
export async function executeTradingApprovalBatch(relayClient: RelayClient): Promise<void> {
  const response = await relayClient.execute(buildTradingApprovalRelayBatch(), "Batch Approve");
  await response.wait();
}
