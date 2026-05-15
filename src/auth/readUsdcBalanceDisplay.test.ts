import { describe, expect, it, vi } from "vitest";
import { readUsdcBalanceDisplay } from "./readUsdcBalanceDisplay";

const validCreds = { key: "k", secret: "s", passphrase: "p" };

describe("readUsdcBalanceDisplay", () => {
  it("有效 creds 且 CLOB 返回余额时优先使用 CLOB", async () => {
    const fetchProxyUsdcBalance = vi.fn();

    const result = await readUsdcBalanceDisplay({
      creds: validCreds,
      fetchClobCollateralBalance: async () => ({ balance: "3000000" }),
      fetchProxyUsdcBalance,
      switchChainForFallback: vi.fn(),
    });

    expect(result.readOk).toBe(true);
    expect(result.displayBalance).toBe("3.00");
    expect(fetchProxyUsdcBalance).not.toHaveBeenCalled();
  });

  it("无有效 creds 或 CLOB 失败时读取 proxy 上 USDC.e", async () => {
    const result = await readUsdcBalanceDisplay({
      creds: null,
      fetchClobCollateralBalance: async () => null,
      fetchProxyUsdcBalance: async () => "2500000",
      switchChainForFallback: vi.fn(),
    });

    expect(result.readOk).toBe(true);
    expect(result.displayBalance).toBe("2.50");
  });

  it("CLOB 与链上均失败时返回 0.00", async () => {
    const result = await readUsdcBalanceDisplay({
      creds: validCreds,
      fetchClobCollateralBalance: async () => {
        throw new Error("clob down");
      },
      fetchProxyUsdcBalance: async () => {
        throw new Error("rpc down");
      },
      switchChainForFallback: vi.fn(),
    });

    expect(result.readOk).toBe(false);
    expect(result.displayBalance).toBe("0.00");
  });
});
