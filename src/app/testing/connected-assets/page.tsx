"use client";

import { AssetStep } from "@/components/ui/deposit/connected/AssetStep";
import type { DepositAsset } from "@/components/ui/deposit/types";

const assets: DepositAsset[] = [
  {
    id: "10-eth",
    chainId: "10",
    chainName: "Optimism",
    symbol: "ETH",
    name: "Ether",
    tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    decimals: 18,
    balance: "0.0167",
    usdValue: 38.23,
    isNative: true,
  },
  {
    id: "8453-eth",
    chainId: "8453",
    chainName: "Base",
    symbol: "ETH",
    name: "Ether",
    tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    decimals: 18,
    balance: "0.0100",
    usdValue: 20.12,
    isNative: true,
  },
  {
    id: "42161-eth",
    chainId: "42161",
    chainName: "Arbitrum",
    symbol: "ETH",
    name: "Ether",
    tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    decimals: 18,
    balance: "0.0001",
    usdValue: 2.13,
    isNative: true,
  },
];

export default function ConnectedAssetsFixturePage() {
  return (
    <main className="space-y-4 p-6 text-white">
      <h1 className="text-xl font-bold">Connected Assets Fixture</h1>
      <AssetStep assets={assets} assetsLoading={false} locale="zh" onSelect={() => {}} />
    </main>
  );
}
