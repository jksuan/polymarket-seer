import { describe, expect, it } from "vitest";

import { isClobOrderSuccess, parseClobOrderError } from "./clobOrderResponse";

describe("clobOrderResponse", () => {
  it("parseClobOrderError prefers errorMsg then error", () => {
    expect(parseClobOrderError({ errorMsg: "order_version_mismatch" })).toBe(
      "order_version_mismatch"
    );
    expect(parseClobOrderError({ error: "legacy" })).toBe("legacy");
  });

  it("isClobOrderSuccess checks success flag", () => {
    expect(isClobOrderSuccess({ success: true, orderID: "1" })).toBe(true);
    expect(isClobOrderSuccess({ success: false })).toBe(false);
  });
});
