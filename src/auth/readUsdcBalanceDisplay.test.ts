import { describe, expect, it, vi } from "vitest";
import { readUsdcBalanceDisplay } from "./readUsdcBalanceDisplay";

const validCreds = { key: "k", secret: "s", passphrase: "p" };

describe("readUsdcBalanceDisplay", () => {
  it("有效 creds 时使用 CLOB sync 后的可交易余额", async () => {
    const result = await readUsdcBalanceDisplay({
      creds: validCreds,
      fetchTradableCollateralBalance: async () => ({ balanceAtomic: 3000000n, readOk: true }),
    });

    expect(result.readOk).toBe(true);
    expect(result.displayBalance).toBe("3.00");
  });

  it("无有效 creds 时展示 0.00", async () => {
    const fetchTradableCollateralBalance = vi.fn();

    const result = await readUsdcBalanceDisplay({
      creds: null,
      fetchTradableCollateralBalance,
    });

    expect(result.readOk).toBe(false);
    expect(result.displayBalance).toBe("0.00");
    expect(fetchTradableCollateralBalance).not.toHaveBeenCalled();
  });

  it("fetch 失败时返回 0.00", async () => {
    const result = await readUsdcBalanceDisplay({
      creds: validCreds,
      fetchTradableCollateralBalance: async () => {
        throw new Error("clob down");
      },
    });

    expect(result.readOk).toBe(false);
    expect(result.displayBalance).toBe("0.00");
  });

  it("wrap 后 CLOB 仍为 0 时展示 0.00", async () => {
    const result = await readUsdcBalanceDisplay({
      creds: validCreds,
      fetchTradableCollateralBalance: async () => ({ balanceAtomic: 0n, readOk: true }),
    });

    expect(result.readOk).toBe(true);
    expect(result.displayBalance).toBe("0.00");
  });
});
