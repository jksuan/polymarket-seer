import { ethers } from "ethers";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-relayer-client/node_modules/@polymarket/builder-signing-sdk";

import { POLYGON_CHAIN_ID, RELAYER_URL } from "@/lib/constants";

function createSafeRelayClient(signer: ethers.Signer): RelayClient {
  const builderConfig = new BuilderConfig({
    remoteBuilderConfig: {
      url: typeof window !== "undefined" ? `${window.location.origin}/api/sign` : "/api/sign",
    },
  });
  return new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer as any,
    builderConfig,
    RelayerTxType.SAFE
  );
}

/** 提现 / wrap 等 Safe 批次前确保 proxy Safe 已部署（与 useTrading 下单路径一致） */
export async function ensureSafeDeployed(
  signer: ethers.Signer,
  proxyAddress: string
): Promise<void> {
  const relayClient = createSafeRelayClient(signer);
  const isDeployed = await relayClient.getDeployed(proxyAddress);
  if (isDeployed) return;

  const deployTx = await relayClient.deploy();
  await deployTx.wait();
}
