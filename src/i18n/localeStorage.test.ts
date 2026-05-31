import { describe, expect, it } from "vitest";

import { parseLocale } from "./localeStorage";

describe("localeStorage", () => {
  it("parseLocale 仅接受 zh/en", () => {
    expect(parseLocale("zh")).toBe("zh");
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("fr")).toBe("en");
    expect(parseLocale(null)).toBe("en");
  });
});
