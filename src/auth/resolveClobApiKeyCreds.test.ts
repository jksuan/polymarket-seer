import { describe, expect, it, vi } from "vitest";
import { resolveClobApiKeyCreds } from "./resolveClobApiKeyCreds";

const validCreds = {
  key: "k",
  secret: "s",
  passphrase: "p",
};

describe("resolveClobApiKeyCreds", () => {
  it("缓存有效时直接返回且不调用 derive", async () => {
    const deriveApiKey = vi.fn();
    const createApiKey = vi.fn();
    const setCachedCreds = vi.fn();

    const result = await resolveClobApiKeyCreds({
      walletAddress: "0xaaaa",
      getCachedCreds: () => validCreds,
      clearCachedCredsForWallet: vi.fn(),
      setCachedCreds,
      switchChain: vi.fn(),
      clobClient: { deriveApiKey, createApiKey },
      hasAttemptedDerive: false,
      markDeriveAttempted: vi.fn(),
    });

    expect(result.creds).toEqual(validCreds);
    expect(result.hasCreds).toBe(true);
    expect(deriveApiKey).not.toHaveBeenCalled();
    expect(createApiKey).not.toHaveBeenCalled();
    expect(setCachedCreds).not.toHaveBeenCalled();
  });

  it("derive 返回空壳时改走 create 并写入缓存", async () => {
    const deriveApiKey = vi.fn().mockResolvedValue({
      key: undefined,
      secret: undefined,
      passphrase: undefined,
    });
    const createApiKey = vi.fn().mockResolvedValue(validCreds);
    const setCachedCreds = vi.fn();

    const result = await resolveClobApiKeyCreds({
      walletAddress: "0xbbbb",
      getCachedCreds: () => null,
      clearCachedCredsForWallet: vi.fn(),
      setCachedCreds,
      switchChain: vi.fn(),
      clobClient: { deriveApiKey, createApiKey },
      hasAttemptedDerive: false,
      markDeriveAttempted: vi.fn(),
    });

    expect(deriveApiKey).toHaveBeenCalledTimes(1);
    expect(createApiKey).toHaveBeenCalledTimes(1);
    expect(setCachedCreds).toHaveBeenCalledWith("0xbbbb", validCreds);
    expect(result.creds).toEqual(validCreds);
    expect(result.hasCreds).toBe(true);
  });

  it("已尝试过 derive 且无有效缓存时不再请求", async () => {
    const deriveApiKey = vi.fn();
    const createApiKey = vi.fn();

    const result = await resolveClobApiKeyCreds({
      walletAddress: "0xcccc",
      getCachedCreds: () => null,
      clearCachedCredsForWallet: vi.fn(),
      setCachedCreds: vi.fn(),
      switchChain: vi.fn(),
      clobClient: { deriveApiKey, createApiKey },
      hasAttemptedDerive: true,
      markDeriveAttempted: vi.fn(),
    });

    expect(result.creds).toBeNull();
    expect(result.hasCreds).toBe(false);
    expect(deriveApiKey).not.toHaveBeenCalled();
    expect(createApiKey).not.toHaveBeenCalled();
  });
});
