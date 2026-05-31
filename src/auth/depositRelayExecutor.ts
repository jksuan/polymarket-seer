import { ethers } from "ethers";

import type { RelayExecutor } from "@/auth/collateralBalance";
import {
  createTradingRelayClient,
  executeDepositWalletRelayBatch,
} from "@/auth/vault";

/** 通过 Polymarket relayer 以 Deposit Wallet 身份执行 gasless 批次 */
export function createDepositRelayExecutor(
  signer: ethers.Signer,
  walletAddress: string
): RelayExecutor {
  const relayClient = createTradingRelayClient(signer);

  return {
    execute: async (transactions, label) => {
      await executeDepositWalletRelayBatch(
        relayClient,
        walletAddress,
        transactions,
        label
      );
    },
  };
}
