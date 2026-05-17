import { describe, expect, it } from "vitest";
import { MIN_WITHDRAW_USD } from "./constants";
import { resolveRecipientAddressType } from "./recipientAddressType";
import {
  isValidBtcRecipient,
  isValidEvmRecipient,
  isValidSvmRecipient,
  isValidTronRecipient,
  isValidWithdrawRecipient,
  validateWithdrawAmountUsd,
  validateWithdrawRecipient,
} from "./validation";

describe("resolveRecipientAddressType", () => {
  it("maps known non-evm chains", () => {
    expect(resolveRecipientAddressType("1151111081099710", "Solana")).toBe("svm");
    expect(resolveRecipientAddressType("8253038", "Bitcoin")).toBe("btc");
    expect(resolveRecipientAddressType("728126428", "Tron")).toBe("tron");
    expect(resolveRecipientAddressType("137", "Polygon")).toBe("evm");
  });
});

describe("withdraw recipient validators", () => {
  const evm = "0x4EB15202AAe85EA5924fA40bCED6b4Fd0533F8C1";
  const svm = "CrvTBvzryYxBHbWu2TiQpcqD5M7Le7iBKzVmEj3f36Jb";
  const btc = "bc1q8eau83qffxcj8ht4hsjdza3lha9r3egfqysj3g";
  const tron = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

  it("validates EVM", () => {
    expect(isValidEvmRecipient(evm)).toBe(true);
    expect(isValidEvmRecipient(svm)).toBe(false);
  });

  it("validates Solana", () => {
    expect(isValidSvmRecipient(svm)).toBe(true);
    expect(isValidSvmRecipient(evm)).toBe(false);
  });

  it("validates Bitcoin", () => {
    expect(isValidBtcRecipient(btc)).toBe(true);
    expect(isValidBtcRecipient(evm)).toBe(false);
  });

  it("validates Tron", () => {
    expect(isValidTronRecipient(tron)).toBe(true);
    expect(isValidTronRecipient(evm)).toBe(false);
  });

  it("routes by address type", () => {
    expect(isValidWithdrawRecipient(evm, "evm")).toBe(true);
    expect(isValidWithdrawRecipient(svm, "svm")).toBe(true);
    expect(isValidWithdrawRecipient(btc, "btc")).toBe(true);
    expect(isValidWithdrawRecipient(tron, "tron")).toBe(true);
    expect(isValidWithdrawRecipient(evm, "svm")).toBe(false);
  });

  it("returns localized errors", () => {
    expect(validateWithdrawRecipient("bad", "svm", "en")).toMatch(/Solana/i);
    expect(validateWithdrawRecipient("bad", "btc", "zh")).toMatch(/Bitcoin/);
  });
});

describe("validateWithdrawAmountUsd", () => {
  it("rejects below minimum", () => {
    const msg = validateWithdrawAmountUsd(MIN_WITHDRAW_USD - 0.01, 10, "en");
    expect(msg).toContain("$3.00");
  });

  it("accepts at minimum", () => {
    expect(validateWithdrawAmountUsd(MIN_WITHDRAW_USD, 10, "en")).toBeNull();
  });

  it("rejects above balance", () => {
    expect(validateWithdrawAmountUsd(5, 4, "en")).toMatch(/balance/i);
  });
});
