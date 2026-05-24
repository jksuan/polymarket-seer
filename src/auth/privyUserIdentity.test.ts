import { describe, expect, it } from "vitest";

import {
  hasEmbeddedLinkedIdentity,
  resolveAuthDisplayIdentity,
  shouldOfferConnectedWalletFunds,
} from "./privyUserIdentity";

describe("privyUserIdentity", () => {
  it("hasEmbeddedLinkedIdentity 覆盖 email / OAuth 社交", () => {
    expect(hasEmbeddedLinkedIdentity({ google: { email: "a@b.com" } })).toBe(true);
    expect(hasEmbeddedLinkedIdentity({ github: { username: "octo" } })).toBe(true);
    expect(hasEmbeddedLinkedIdentity({ telegram: { username: "user" } })).toBe(true);
    expect(hasEmbeddedLinkedIdentity({ wallet: { address: "0x1" } })).toBe(false);
  });

  it("embedded 会话 GitHub 展示 @username 而非钱包地址", () => {
    const result = resolveAuthDisplayIdentity(
      { github: { username: "octocat" } },
      { sessionMode: "embedded", walletAddress: "0xD2e5271823722720187A59b6e415098b0a2585" }
    );
    expect(result.identifier).toBe("@octocat");
  });

  it("external 会话优先展示外链地址", () => {
    const result = resolveAuthDisplayIdentity(
      { google: { email: "a@b.com" } },
      { sessionMode: "external", walletAddress: "0xD2e5271823722720187A59b6e415098b0a2585" }
    );
    expect(result.identifier).toBe("0xD2e5...2585");
  });

  it("shouldOfferConnectedWalletFunds 仅 external 为 true", () => {
    expect(
      shouldOfferConnectedWalletFunds("external", "0xD2e5271823722720187A59b6e415098b0a2585")
    ).toBe(true);
    expect(
      shouldOfferConnectedWalletFunds("embedded", "0xD2e5271823722720187A59b6e415098b0a2585")
    ).toBe(false);
    expect(shouldOfferConnectedWalletFunds("embedded", "")).toBe(false);
    expect(shouldOfferConnectedWalletFunds(null, "0xabc")).toBe(false);
  });
});
