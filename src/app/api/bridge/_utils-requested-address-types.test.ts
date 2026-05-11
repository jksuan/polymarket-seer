import { describe, expect, it } from "vitest";
import {
  extractDepositResponseAddressTypeKeys,
  parseOptionalRequestedAddressTypes,
} from "./_utils";

describe("parseOptionalRequestedAddressTypes", () => {
  it("缺省时返回 undefined", () => {
    const r = parseOptionalRequestedAddressTypes({});
    expect(r).toEqual({ ok: true, value: undefined });
  });

  it("合法数组去重并保持顺序", () => {
    const r = parseOptionalRequestedAddressTypes({
      requestedAddressTypes: ["evm", "svm", "evm"],
    });
    expect(r).toEqual({ ok: true, value: ["evm", "svm"] });
  });

  it("非法成员返回错误", () => {
    const r = parseOptionalRequestedAddressTypes({
      requestedAddressTypes: ["evm", "sol"],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("evm, svm, btc, or tron");
  });

  it("空数组返回错误", () => {
    const r = parseOptionalRequestedAddressTypes({ requestedAddressTypes: [] });
    expect(r.ok).toBe(false);
  });
});

describe("extractDepositResponseAddressTypeKeys", () => {
  it("从 depositAddresses 提取类型键", () => {
    expect(
      extractDepositResponseAddressTypeKeys({
        depositAddresses: { evm: "0x1", svm: "So1", btc: "bc1q" },
      })
    ).toEqual(["btc", "evm", "svm"]);
  });

  it("兼容嵌套 address 字段", () => {
    expect(
      extractDepositResponseAddressTypeKeys({
        address: { tron: "T1", evm: "0x2" },
      })
    ).toEqual(["evm", "tron"]);
  });
});
