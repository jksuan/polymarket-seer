import { describe, expect, it } from "vitest";
import { parseUserWalletBody } from "./validation";

describe("funds validation", () => {
  it("parseUserWalletBody accepts valid addresses", () => {
    const result = parseUserWalletBody({
      signerAddress: "0x1111111111111111111111111111111111111111",
      proxyAddress: "0x2222222222222222222222222222222222222222",
      sessionMode: "embedded",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.signerAddress).toBe(
        "0x1111111111111111111111111111111111111111"
      );
    }
  });
});
