import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { I18nContext } from "@/i18n";
import zh from "@/i18n/locales/zh";
import { ConfirmStep } from "./ConfirmStep";
import type { ExecutionSnapshot } from "../types";

function makeSnapshot(): ExecutionSnapshot {
  return {
    executionEngine: "evm",
    kind: "direct-transfer",
    asset: {
      id: "1-usdc",
      chainId: "1",
      chainName: "Ethereum",
      symbol: "USDC",
      name: "USD Coin",
      tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      decimals: 6,
    },
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
    expiresAtMs: Date.now() + 30_000,
  };
}

describe("ConfirmStep", () => {
  it("错误态展示回退到 Transfer 按钮并触发回调", () => {
    const onFallbackToTransfer = vi.fn();
    render(
      <I18nContext.Provider value={{ locale: "zh", setLocale: vi.fn(), t: zh }}>
        <ConfirmStep
          cancelTxHash=""
          depositBridgeComplete={false}
          dlnStatus={undefined}
          error="some execute error"
          executionRiskWarning=""
          hasSubmittedTx={false}
          hasUnconfirmedRiskWarning={false}
          isCancellingOrder={false}
          isExecuting={false}
          isQuoting={false}
          onCancelOrder={vi.fn()}
          onConfirm={vi.fn()}
          onFallbackToTransfer={onFallbackToTransfer}
          quoteWarning=""
          snapshot={makeSnapshot()}
          walletLabel="Wallet"
        />
      </I18nContext.Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: "切换至转账通道" }));
    expect(onFallbackToTransfer).toHaveBeenCalledTimes(1);
  });
});
