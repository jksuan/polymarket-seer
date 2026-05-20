import { describe, expect, it, vi } from "vitest";
import { disconnectExternalWallets } from "./disconnectExternalWallets";

describe("disconnectExternalWallets", () => {
  it("断开所有非 privy 钱包，忽略失败", async () => {
    const disconnectOk = vi.fn(async () => {});
    const disconnectFail = vi.fn(async () => {
      throw new Error("fail");
    });

    await disconnectExternalWallets([
      { walletClientType: "privy", disconnect: disconnectOk },
      { walletClientType: "metamask", disconnect: disconnectOk },
      { walletClientType: "wallet_connect", disconnect: disconnectFail },
    ]);

    expect(disconnectOk).toHaveBeenCalledTimes(1);
    expect(disconnectFail).toHaveBeenCalledTimes(1);
  });

  it("空数组或无 wallets 时不抛错", async () => {
    await expect(disconnectExternalWallets(undefined)).resolves.toBeUndefined();
    await expect(disconnectExternalWallets([])).resolves.toBeUndefined();
  });
});
