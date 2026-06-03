import { describe, expect, it } from "vitest";

import { evaluateGeoblockForOrder } from "./orderGate";
import type { GeoblockStatus } from "./types";

function status(partial: Partial<GeoblockStatus>): GeoblockStatus {
  return {
    blocked: false,
    loading: false,
    error: null,
    checkedAt: Date.now(),
    ...partial,
  };
}

describe("evaluateGeoblockForOrder", () => {
  it("blocked 时拒绝交易（含 JP/SG 等）", () => {
    expect(evaluateGeoblockForOrder(status({ blocked: true, country: "SG" }))).toEqual({
      allowed: false,
      reason: "blocked",
      country: "SG",
      region: undefined,
    });
  });

  it("未受限时允许交易", () => {
    expect(evaluateGeoblockForOrder(status({ blocked: false, country: "HK" }))).toEqual({
      allowed: true,
    });
  });

  it("上游失败时 fail-closed", () => {
    expect(evaluateGeoblockForOrder(status({ blocked: false, error: "UPSTREAM_FAILED" }))).toEqual({
      allowed: false,
      reason: "check_failed",
    });
  });
});
