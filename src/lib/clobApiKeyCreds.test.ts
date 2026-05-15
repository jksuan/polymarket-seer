import { describe, expect, it } from "vitest";
import { isValidApiKeyCreds } from "./clobApiKeyCreds";

describe("isValidApiKeyCreds", () => {
  it("key、secret、passphrase 均为非空字符串时有效", () => {
    expect(
      isValidApiKeyCreds({
        key: "abc",
        secret: "def",
        passphrase: "ghi",
      })
    ).toBe(true);
  });

  it("derive 400 时 SDK 映射出的空壳对象无效", () => {
    expect(
      isValidApiKeyCreds({
        key: undefined,
        secret: undefined,
        passphrase: undefined,
      })
    ).toBe(false);
  });

  it("空对象或缺字段无效", () => {
    expect(isValidApiKeyCreds({})).toBe(false);
    expect(isValidApiKeyCreds({ key: "only-key" })).toBe(false);
    expect(isValidApiKeyCreds(null)).toBe(false);
  });
});
