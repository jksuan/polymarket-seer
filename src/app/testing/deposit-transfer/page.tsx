"use client";

import { useState } from "react";
import { TransferStep } from "@/components/ui/deposit/transfer/TransferStep";
import type { DepositAsset } from "@/components/ui/deposit/types";

const mockAssets: DepositAsset[] = [
  {
    id: "1-usdc",
    chainId: "1",
    chainName: "Ethereum",
    symbol: "USDC",
    name: "USD Coin",
    tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    decimals: 6,
    minCheckoutUsd: 10,
  },
  {
    id: "137-usdc",
    chainId: "137",
    chainName: "Polygon",
    symbol: "USDC",
    name: "USD Coin",
    tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    decimals: 6,
    minCheckoutUsd: 3,
  },
];

export default function DepositTransferTestPage() {
  const [entered, setEntered] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(mockAssets[0].id);
  const [selectedChainId, setSelectedChainId] = useState(mockAssets[0].chainId);
  const [copied, setCopied] = useState(false);

  return (
    <main className="space-y-4 p-6 text-white">
      <h1 className="text-xl font-bold">Deposit Transfer E2E Fixture</h1>
      {!entered ? (
        <button
          type="button"
          onClick={() => setEntered(true)}
          className="rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold"
        >
          进入转账步骤
        </button>
      ) : null}

      {entered ? (
        <TransferStep
          assets={mockAssets}
          chainOptions={[
            { chainId: "1", chainName: "Ethereum" },
            { chainId: "137", chainName: "Polygon" },
          ]}
          copied={copied}
          error=""
          isCreating={false}
          locale="zh"
          onAssetChange={setSelectedAssetId}
          onChainChange={setSelectedChainId}
          onCopy={() => {
            setCopied(true);
          }}
          onCreate={() => {}}
          selectedAssetId={selectedAssetId}
          selectedChainId={selectedChainId}
          statusText="PENDING"
          transferAddress="0x1111111111111111111111111111111111111111"
        />
      ) : null}
    </main>
  );
}
