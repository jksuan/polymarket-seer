import { describe, expect, it } from "vitest";
import {
  hasMatchingEmbeddedWallet,
  isEmbeddedWalletUnavailableError,
  walletListFingerprint,
} from "./accountSwitchGuard";

describe("accountSwitchGuard embedded helpers", () => {
  it("walletListFingerprint 稳定排序拼接", () => {
    expect(
      walletListFingerprint([
        { walletClientType: "privy", address: "0xAbC" },
        { walletClientType: "metamask", address: "0xDef" },
      ])
    ).toBe("privy:0xabc|metamask:0xdef");
  });

  it("hasMatchingEmbeddedWallet 仅匹配 privy 且地址一致", () => {
    const wallets = [
      { walletClientType: "privy", address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      { walletClientType: "metamask", address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
    ];
    expect(
      hasMatchingEmbeddedWallet(wallets, "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
    ).toBe(true);
    expect(
      hasMatchingEmbeddedWallet(wallets, "0xcccccccccccccccccccccccccccccccccccccccc")
    ).toBe(false);
  });

  it("isEmbeddedWalletUnavailableError 识别 Privy 残留钱包报错", () => {
    expect(
      isEmbeddedWalletUnavailableError(new Error("No embedded or connected wallet found for address."))
    ).toBe(true);
    expect(isEmbeddedWalletUnavailableError(new Error("user rejected"))).toBe(false);
  });
});
