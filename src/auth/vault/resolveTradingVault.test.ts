import { SignatureTypeV2 } from "@polymarket/clob-client-v2";
import { describe, expect, it, vi, beforeEach } from "vitest";

const deriveDepositWalletAddress = vi.fn();

vi.mock("./relayClientFactory", () => ({
  createTradingRelayClient: vi.fn(() => ({
    deriveDepositWalletAddress,
  })),
}));

import { resolveTradingVault } from "./resolveTradingVault";

const mockSigner = {} as import("ethers").Signer;
const DERIVED = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CACHED_MATCH = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

describe("resolveTradingVault", () => {
  beforeEach(() => {
    deriveDepositWalletAddress.mockReset();
    deriveDepositWalletAddress.mockResolvedValue(DERIVED);
  });

  it("uses cached vault address when it matches derived deposit wallet", async () => {
    const vault = await resolveTradingVault(mockSigner, CACHED_MATCH);

    expect(vault).toEqual({
      kind: "deposit",
      address: CACHED_MATCH,
      signatureType: SignatureTypeV2.POLY_1271,
    });
  });

  it("derives deposit wallet when cache missing or stale (e.g. old Safe)", async () => {
    const staleSafe = "0x2222222222222222222222222222222222222222";
    const vault = await resolveTradingVault(mockSigner, staleSafe);

    expect(vault).toEqual({
      kind: "deposit",
      address: DERIVED,
      signatureType: SignatureTypeV2.POLY_1271,
    });
  });

  it("derives deposit wallet when cache missing", async () => {
    const vault = await resolveTradingVault(mockSigner);

    expect(vault.kind).toBe("deposit");
    expect(vault.address).toBe(DERIVED);
  });
});
