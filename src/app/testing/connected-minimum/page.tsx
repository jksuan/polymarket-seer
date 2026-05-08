"use client";

import { useMemo, useState } from "react";
import { AmountStep } from "@/components/ui/deposit/connected/AmountStep";
import { getTransferChainMinUsd } from "@/components/ui/deposit/minimums";
import type { DepositAsset } from "@/components/ui/deposit/types";

const assets: DepositAsset[] = [
  {
    id: "1-eth",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "ETH",
    name: "Ether",
    tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    decimals: 18,
    minCheckoutUsd: 1.01,
    usdValue: 100,
  },
  {
    id: "137-pol",
    chainId: "137",
    chainName: "Polygon",
    symbol: "POL",
    name: "Polygon",
    tokenAddress: "0x0000000000000000000000000000000000001010",
    decimals: 18,
    minCheckoutUsd: 1.01,
    usdValue: 100,
  },
];

export default function ConnectedMinimumFixturePage() {
  const [selectedAssetId, setSelectedAssetId] = useState("1-eth");
  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) ?? assets[0],
    [selectedAssetId]
  );
  const minDepositUsd = useMemo(
    () => getTransferChainMinUsd(selectedAsset.chainName, selectedAsset.chainId, assets),
    [selectedAsset]
  );

  return (
    <main className="space-y-4 p-6 text-white">
      <h1 className="text-xl font-bold">Connected Minimum Fixture</h1>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSelectedAssetId("1-eth")}
          className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold"
        >
          选择 ETH
        </button>
        <button
          type="button"
          onClick={() => setSelectedAssetId("137-pol")}
          className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold"
        >
          选择 POL
        </button>
      </div>
      <AmountStep
        amountUsd="2"
        asset={selectedAsset}
        error=""
        isQuoting={false}
        locale="zh"
        minDepositUsd={minDepositUsd}
        onAmountBlur={() => {}}
        onAmountChange={() => {}}
        onContinue={() => {}}
        onPercent={() => {}}
      />
    </main>
  );
}
