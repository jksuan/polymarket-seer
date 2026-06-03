import type { GeoblockOrderGateResult, GeoblockStatus } from "./types";

/** Whether trading (open or close) should be blocked per geoblock API `blocked`. */
export function evaluateGeoblockForOrder(status: GeoblockStatus): GeoblockOrderGateResult {
  if (status.blocked) {
    return {
      allowed: false,
      reason: "blocked",
      country: status.country,
      region: status.region,
    };
  }
  if (status.error) {
    return { allowed: false, reason: "check_failed" };
  }
  return { allowed: true };
}

/** @deprecated Use evaluateGeoblockForOrder */
export const evaluateGeoblockForNewOrder = evaluateGeoblockForOrder;

/** @deprecated Use evaluateGeoblockForOrder */
export const evaluateGeoblockForClosePosition = evaluateGeoblockForOrder;
