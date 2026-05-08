"use client";

import { useState } from "react";
import { ConfirmStep } from "@/components/ui/deposit/confirm/ConfirmStep";
import { TransferStep } from "@/components/ui/deposit/transfer/TransferStep";
import type { DepositAsset, ExecutionSnapshot } from "@/components/ui/deposit/types";

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
];

function makeSnapshot(): ExecutionSnapshot {
  return {
    executionEngine: "evm",
    kind: "direct-transfer",
    asset: mockAssets[0],
    amountUsd: 10,
    sourceAmountBaseUnit: "10000000",
    sendBaseUnit: "10000000",
    sendAmountFloat: 10,
    sendDisplay: "10 USDC",
    sendUsd: 10,
    receiveBaseUnit: "10000000",
    receiveDecimals: 6,
    receiveDisplay: "10.0000",
    receiveSymbol: "pUSD",
    receiveUsd: 10,
    recipientAddress: "0x1111111111111111111111111111111111111111",
    tx: { to: "0x1111111111111111111111111111111111111111", data: "0x", value: "0" },
    quotedAtMs: Date.now(),
    expiresAtMs: Date.now() + 30000,
  };
}

export default function ConnectedFallbackTestPage() {
  const [step, setStep] = useState<"confirm" | "transfer">("confirm");
  const [copied, setCopied] = useState(false);

  return (
    <main className="space-y-4 p-6 text-white">
      <h1 className="text-xl font-bold">Connected Fallback Fixture</h1>
      {step === "confirm" ? (
        <ConfirmStep
          cancelTxHash=""
          depositBridgeComplete={false}
          dlnStatus={undefined}
          error="mock execute error"
          executionRiskWarning=""
          hasSubmittedTx={false}
          hasUnconfirmedRiskWarning={false}
          isCancellingOrder={false}
          isExecuting={false}
          isQuoting={false}
          locale="zh"
          onCancelOrder={() => {}}
          onConfirm={() => {}}
          onFallbackToTransfer={() => setStep("transfer")}
          quoteWarning=""
          snapshot={makeSnapshot()}
          walletLabel="Wallet"
        />
      ) : (
        <TransferStep
          assets={mockAssets}
          chainOptions={[{ chainId: "1", chainName: "Ethereum" }]}
          copied={copied}
          error=""
          isCreating={false}
          locale="zh"
          onAssetChange={() => {}}
          onChainChange={() => {}}
          onCopy={() => setCopied(true)}
          onCreate={() => {}}
          selectedAssetId={mockAssets[0].id}
          selectedChainId="1"
          statusText="PENDING"
          transferAddress="0x1111111111111111111111111111111111111111"
        />
      )}
    </main>
  );
}
