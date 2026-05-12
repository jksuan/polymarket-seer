import { describe, expect, it } from "vitest";
import { shouldSyncPrivyActiveWallet } from "./privyActiveWalletSync";

describe("shouldSyncPrivyActiveWallet", () => {
  it("无 desired 则不同步", () => {
    expect(shouldSyncPrivyActiveWallet("0x1", undefined)).toBe(false);
    expect(shouldSyncPrivyActiveWallet("0x1", null)).toBe(false);
  });

  it("Privy 尚无 active 且存在 desired 时需同步", () => {
    expect(shouldSyncPrivyActiveWallet(undefined, { address: "0xaaa" })).toBe(true);
    expect(shouldSyncPrivyActiveWallet(null, { address: "0xaaa" })).toBe(true);
  });

  it("地址一致（大小写无关）则不同步", () => {
    expect(shouldSyncPrivyActiveWallet("0xAbCd", { address: "0xabcd" })).toBe(false);
  });

  it("地址不一致则需同步", () => {
    expect(shouldSyncPrivyActiveWallet("0x1", { address: "0x2" })).toBe(true);
  });
});
