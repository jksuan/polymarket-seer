/**
 * Polymarket geoblock API — https://docs.polymarket.com/api-reference/geoblock
 */
export type GeoblockApiResponse = {
  blocked: boolean;
  ip?: string;
  country?: string;
  region?: string;
};

export type GeoblockCheckErrorCode = "UPSTREAM_FAILED" | "INVALID_RESPONSE";

export type GeoblockStatus = {
  blocked: boolean;
  ip?: string;
  country?: string;
  region?: string;
  loading: boolean;
  error: GeoblockCheckErrorCode | null;
  checkedAt: number | null;
};

export type GeoblockOrderGateResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: "blocked" | "check_failed";
      country?: string;
      region?: string;
    };
