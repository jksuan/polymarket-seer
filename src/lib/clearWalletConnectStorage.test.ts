import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { clearWalletConnectStorage } from "./clearWalletConnectStorage";

describe("clearWalletConnectStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("移除 WalletConnect 相关 localStorage / sessionStorage 键", async () => {
    localStorage.setItem("wc@2:core:0.3//keychain", "x");
    localStorage.setItem("unrelated", "keep");
    sessionStorage.setItem("walletconnect", "y");

    await clearWalletConnectStorage();

    expect(localStorage.getItem("wc@2:core:0.3//keychain")).toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("keep");
    expect(sessionStorage.getItem("walletconnect")).toBeNull();
  });

  it("尝试删除 WalletConnect IndexedDB", async () => {
    const deleteDatabase = vi.fn((_name: string) => {
      const request = {
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        onblocked: null as (() => void) | null,
      };
      queueMicrotask(() => request.onsuccess?.());
      return request;
    });
    vi.stubGlobal("indexedDB", { deleteDatabase });

    await clearWalletConnectStorage();

    expect(deleteDatabase).toHaveBeenCalledWith("WALLET_CONNECT_V2_INDEXED_DB");
  });
});
