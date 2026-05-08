import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AssetStep } from "./AssetStep";
import type { DepositAsset } from "../types";

describe("AssetStep", () => {
  it("Connected 资产列表中的代币图标都显示链角标", () => {
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
        id: "42161-eth",
        chainId: "42161",
        chainName: "Arbitrum",
        symbol: "ETH",
        name: "Ether",
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        decimals: 18,
        balance: "0.00001",
        usdValue: 2.13,
        isNative: true,
      },
    ];

    render(
      <AssetStep
        assets={assets}
        assetsLoading={false}
        locale="zh"
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Chain 10")).toBeInTheDocument();
    expect(screen.getByLabelText("Chain 42161")).toBeInTheDocument();
  });
});
