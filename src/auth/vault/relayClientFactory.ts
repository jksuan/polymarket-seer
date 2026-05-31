import { ethers } from "ethers";
import { RelayClient, RelayerTxType } from "@polymarket/builder-relayer-client";
import { BuilderConfig } from "@polymarket/builder-signing-sdk";

import { POLYGON_CHAIN_ID, RELAYER_URL } from "@/lib/constants";

function createBuilderConfig(): BuilderConfig {
  const signUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/sign` : "/api/sign";
  return new BuilderConfig({
    remoteBuilderConfig: { url: signUrl },
  });
}

/** 创建 Polymarket Builder Relayer 客户端（Safe / Deposit Wallet 共用） */
export function createTradingRelayClient(signer: ethers.Signer): RelayClient {
  return new RelayClient(
    RELAYER_URL,
    POLYGON_CHAIN_ID,
    signer as never,
    createBuilderConfig(),
    RelayerTxType.SAFE
  );
}
