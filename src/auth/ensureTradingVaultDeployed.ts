import { ethers } from "ethers";

import {
  createTradingRelayClient,
  ensureDepositVaultDeployed,
} from "@/auth/vault";

/** 提现 / wrap 等批次前确保 Deposit Wallet 已部署 */
export async function ensureTradingVaultDeployed(
  signer: ethers.Signer,
  vaultAddress: string
): Promise<void> {
  const relayClient = createTradingRelayClient(signer);
  await ensureDepositVaultDeployed(relayClient, vaultAddress);
}
