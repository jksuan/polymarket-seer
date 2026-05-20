import { describe, expect, it } from "vitest";
import { selectPrimaryWallet } from "./primaryWallet";

const metamask = {
  address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  walletClientType: "metamask",
} as const;
const phantom = {
  address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  walletClientType: "phantom",
} as const;
const embedded = {
  address: "0xcccccccccccccccccccccccccccccccccccccccc",
  walletClientType: "privy",
} as const;

describe("selectPrimaryWallet", () => {
  it("无 sticky 时仍优先第一个外链再 embedded", () => {
    expect(selectPrimaryWallet([embedded, metamask], null)).toEqual(metamask);
    expect(selectPrimaryWallet([embedded], null)).toEqual(embedded);
  });

  it("首选地址命中时直接返回（含 privy）", () => {
    expect(
      selectPrimaryWallet([metamask, phantom], phantom.address.toUpperCase())
    ).toEqual(phantom);
  });

  it("有 sticky 且首选对不上时只认同扩展，不跳 metamask", () => {
    const walletsOnlyMeta = [metamask];
    expect(
      selectPrimaryWallet(walletsOnlyMeta, "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", {
        stickyClientType: "phantom",
      })
    ).toBeUndefined();
  });

  it("有 sticky 且同扩展仍有另一条地址时返回该扩展下第一条", () => {
    const phantom2 = {
      address: "0xdddddddddddddddddddddddddddddddddddddddd",
      walletClientType: "phantom",
    };
    expect(
      selectPrimaryWallet([metamask, phantom2], null, { stickyClientType: "phantom" })
    ).toEqual(phantom2);
  });

  it("有 sticky 且首选对不上时不用 embedded", () => {
    expect(
      selectPrimaryWallet([embedded], "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", {
        stickyClientType: "phantom",
      })
    ).toBeUndefined();
  });

  it("preferEmbedded 时优先 embedded", () => {
    expect(
      selectPrimaryWallet([embedded, metamask], null, { preferEmbedded: true })
    ).toEqual(embedded);
  });

  it("preferEmbedded 且无 embedded 时不回退外链", () => {
    expect(selectPrimaryWallet([metamask], null, { preferEmbedded: true })).toBeUndefined();
  });
});
