import { describe, expect, it } from "vitest";
import {
  formatPusdFromAtomic,
  parsePusdInputToAtomic,
  sanitizePusdAmountInput,
  validateWithdrawAmountAtomic,
} from "./pusdAmount";

describe("pusdAmount", () => {
  it("formatPusdFromAtomic 保留 6 位精度", () => {
    expect(formatPusdFromAtomic(5_998_061n)).toBe("5.998061");
  });

  it("parsePusdInputToAtomic 与 format 互逆", () => {
    expect(parsePusdInputToAtomic("5.998061")).toBe(5_998_061n);
  });

  it("sanitize 允许 6 位小数", () => {
    expect(sanitizePusdAmountInput("5.998061")).toBe("5.998061");
    expect(sanitizePusdAmountInput("5.9980611")).toBe("5.998061");
  });

  it("Max 金额 5.998061 不超过链上 5998061", () => {
    const max = 5_998_061n;
    const input = 5_998_061n;
    expect(validateWithdrawAmountAtomic(input, max, "zh")).toBeNull();
  });

  it("6.00 超过 5.998061 链上余额", () => {
    expect(validateWithdrawAmountAtomic(6_000_000n, 5_998_061n, "zh")).toMatch(/余额/);
  });
});
