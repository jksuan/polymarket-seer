import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DepositAsset } from "../types";
import { TransferStep } from "./TransferStep";

const assets: DepositAsset[] = [
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

const chainOptions = [{ chainId: "1", chainName: "Ethereum" }];

describe("TransferStep", () => {
  it("状态仅显示在右侧标签并按流程替换", () => {
    const view = render(
      <TransferStep
        assets={assets}
        chainOptions={chainOptions}
        copied={false}
        error=""
        isCreating={false}
        locale="zh"
        onAssetChange={vi.fn()}
        onChainChange={vi.fn()}
        onCopy={vi.fn()}
        onCreate={vi.fn()}
        selectedAssetId={assets[0].id}
        selectedChainId={chainOptions[0].chainId}
        statusCode="PROCESSING"
        statusText="PENDING"
        transferAddress="0x1111111111111111111111111111111111111111"
      />
    );

    const statusTitle = within(view.container).getByText("状态");
    const statusCard = statusTitle.closest("div.rounded-2xl");
    expect(statusCard).toBeTruthy();
    if (!(statusCard instanceof HTMLElement)) return;
    expect(within(statusCard).getByText("处理中")).toBeInTheDocument();
    expect(within(statusCard).queryByText("正在进行路由和兑换")).not.toBeInTheDocument();
    expect(within(statusCard).queryByText("已提交到目标链")).not.toBeInTheDocument();
  });

  it("点击复制地址会回调当前地址", () => {
    const onCopy = vi.fn();

    const view = render(
      <TransferStep
        assets={assets}
        chainOptions={chainOptions}
        copied={false}
        error=""
        isCreating={false}
        locale="zh"
        onAssetChange={vi.fn()}
        onChainChange={vi.fn()}
        onCopy={onCopy}
        onCreate={vi.fn()}
        selectedAssetId={assets[0].id}
        selectedChainId={chainOptions[0].chainId}
        statusText="PENDING"
        transferAddress="0x1111111111111111111111111111111111111111"
      />
    );

    fireEvent.click(within(view.container).getByRole("button", { name: "复制地址" }));

    expect(onCopy).toHaveBeenCalledWith("0x1111111111111111111111111111111111111111");
  });

  it("有错误且可重试时显示重试检测按钮并触发回调", () => {
    const onRetryPolling = vi.fn();

    render(
      <TransferStep
        assets={assets}
        chainOptions={chainOptions}
        copied={false}
        error="polling failed"
        isCreating={false}
        locale="zh"
        onAssetChange={vi.fn()}
        onChainChange={vi.fn()}
        onCopy={vi.fn()}
        onCreate={vi.fn()}
        onRetryPolling={onRetryPolling}
        selectedAssetId={assets[0].id}
        selectedChainId={chainOptions[0].chainId}
        statusText="PENDING"
        transferAddress="0x1111111111111111111111111111111111111111"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "重试检测" }));

    expect(onRetryPolling).toHaveBeenCalledTimes(1);
  });
});
