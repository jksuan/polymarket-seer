import { describe, expect, it, afterEach } from "vitest";
import {
  isMobileUserAgent,
  isMobileWalletInAppBrowser,
  resolvePrivyWalletList,
} from "./privyWalletList";

describe("privyWalletList", () => {
  const originalUa = navigator.userAgent;
  const windowWithEthereum = window as Window & { ethereum?: unknown };

  afterEach(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: originalUa,
      configurable: true,
    });
    delete windowWithEthereum.ethereum;
  });

  it("识别移动端 UA", () => {
    expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe(true);
    expect(isMobileUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(false);
  });

  it("MetaMask IAB 仅暴露 metamask", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
      configurable: true,
    });
    windowWithEthereum.ethereum = {};

    expect(isMobileWalletInAppBrowser()).toBe(true);
    expect(resolvePrivyWalletList()).toEqual(["metamask"]);
  });

  it("桌面返回完整 walletList", () => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      configurable: true,
    });

    expect(resolvePrivyWalletList()).toEqual([
      "metamask",
      "coinbase_wallet",
      "detected_ethereum_wallets",
      "wallet_connect_qr",
    ]);
  });
});
