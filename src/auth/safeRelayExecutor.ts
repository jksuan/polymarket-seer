import { ethers } from "ethers";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk";

import { POLYGON_CHAIN_ID, RELAYER_URL } from "@/lib/constants";
import type { RelayExecutor } from "@/auth/collateralBalance";

/** 通过 Polymarket relayer 以 Safe 身份执行 gasless 批次 */
export function createSafeRelayExecutor(signer: ethers.Signer): RelayExecutor {
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: { url: `${window.location.origin}/api/sign` },
  });
  const relayClient = new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer as any,
    builderConfig,
    RelayerTxType.SAFE
  );

  return {
    execute: async (transactions, label) => {
      const response = await relayClient.execute(transactions, label);
      await response.wait();
    },
  };
}
