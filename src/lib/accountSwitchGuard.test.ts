import { describe, expect, it } from "vitest";
import { isAccountDrift, normalizeAddress } from "./accountSwitchGuard";

describe("accountSwitchGuard", () => {
  it("normalizeAddress 应统一小写", () => {
    expect(normalizeAddress("0xAbC")).toBe("0xabc");
  });

  it("session 与当前地址不一致时判定为漂移", () => {
    expect(
      isAccountDrift(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      )
    ).toBe(true);
  });

  it("地址一致或缺失时不判定为漂移", () => {
    expect(
      isAccountDrift(
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
      )
    ).toBe(false);
    expect(isAccountDrift("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", null)).toBe(false);
  });
});
