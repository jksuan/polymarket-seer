import { SignatureTypeV2 } from "@polymarket/clob-client-v2";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const clobClientCtor = vi.fn();

vi.mock("@polymarket/clob-client-v2", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@polymarket/clob-client-v2")>();
  return {
    ...actual,
    ClobClient: class MockClobClient {
      constructor(options: unknown) {
        clobClientCtor(options);
      }
    },
  };
});

vi.mock("@/lib/constants", () => ({
  CLOB_API_URL: "https://clob.polymarket.com",
}));

import { createClobClient, getPublicBuilderCode } from "@/lib/clobClientFactory";

describe("clobClientFactory", () => {
  const originalBuilderCode = process.env.NEXT_PUBLIC_POLY_BUILDER_CODE;

  beforeEach(() => {
    clobClientCtor.mockClear();
    delete process.env.NEXT_PUBLIC_POLY_BUILDER_CODE;
  });

  afterEach(() => {
    if (originalBuilderCode === undefined) {
      delete process.env.NEXT_PUBLIC_POLY_BUILDER_CODE;
    } else {
      process.env.NEXT_PUBLIC_POLY_BUILDER_CODE = originalBuilderCode;
    }
  });

  it("getPublicBuilderCode returns trimmed env value", () => {
    process.env.NEXT_PUBLIC_POLY_BUILDER_CODE = "  0xabc  ";
    expect(getPublicBuilderCode()).toBe("0xabc");
  });

  it("createClobClient passes Deposit Wallet defaults and builderConfig", () => {
    process.env.NEXT_PUBLIC_POLY_BUILDER_CODE = "0xbuilder";

    const signer = {
      getAddress: async () => "0xowner",
      _signTypedData: async () => "0xsig",
    };

    createClobClient({
      signer,
      creds: { key: "k", secret: "s", passphrase: "p" },
      funderAddress: "0xvault",
    });

    expect(clobClientCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "https://clob.polymarket.com",
        chain: 137,
        signer,
        creds: { key: "k", secret: "s", passphrase: "p" },
        funderAddress: "0xvault",
        signatureType: SignatureTypeV2.POLY_1271,
        builderConfig: { builderCode: "0xbuilder" },
      })
    );
  });
});
