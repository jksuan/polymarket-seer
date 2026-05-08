import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DepositAsset } from "../types";
import { AmountStep } from "./AmountStep";

const baseAsset: DepositAsset = {
  id: "1-usdc",
  chainId: "1",
  chainName: "Ethereum",
  symbol: "USDC",
  name: "USD Coin",
  tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  decimals: 6,
  minCheckoutUsd: 10,
  usdValue: 100,
};

function renderAmountStep(overrides?: Partial<ComponentProps<typeof AmountStep>>) {
  const props: ComponentProps<typeof AmountStep> = {
    amountUsd: "10",
    asset: baseAsset,
    error: "",
    isQuoting: false,
    locale: "zh",
    onAmountBlur: vi.fn(),
    onAmountChange: vi.fn(),
    onContinue: vi.fn(),
    onPercent: vi.fn(),
    ...overrides,
  };
  render(<AmountStep {...props} />);
  return props;
}

describe("AmountStep", () => {
  afterEach(() => {
    cleanup();
  });

  it("金额低于最小值时展示提示并禁用继续", () => {
    renderAmountStep({ amountUsd: "5" });

    expect(screen.getByText("最低充值金额$10.05")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续" })).toBeDisabled();
  });

  it("金额超过余额上限时展示余额不足并禁用继续", () => {
    renderAmountStep({ amountUsd: "96" });

    expect(screen.getByText("钱包余额不足")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "继续" })).toBeDisabled();
  });

  it("点击继续时触发回调", () => {
    const { onContinue } = renderAmountStep({ amountUsd: "20" });

    fireEvent.click(screen.getByRole("button", { name: "继续" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
