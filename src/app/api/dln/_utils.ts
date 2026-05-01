import type { DlnApiErrorCode } from "@/types/dln";
import {
  createRequestId,
  errorResponse,
  isNonEmptyString,
  isNumericString,
  isPositiveIntegerString,
  readJsonBody,
  successResponse,
  validateNumericStringFields,
  validateRequiredStringFields,
} from "../bridge/_utils";

export const DLN_API_BASE_URL = "https://dln.debridge.finance";
export const DLN_REQUEST_TIMEOUT_MS = 20_000;

export {
  createRequestId,
  errorResponse,
  isNonEmptyString,
  isNumericString,
  isPositiveIntegerString,
  readJsonBody,
  successResponse,
  validateNumericStringFields,
  validateRequiredStringFields,
};

type QueryValue = string | number | boolean | null | undefined;

export function buildQueryString(params: Record<string, QueryValue>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const str = String(value);
    if (str.length === 0) continue;
    usp.set(key, str);
  }
  const query = usp.toString();
  return query ? `?${query}` : "";
}

export function readEnvAffiliate(): {
  affiliateFeePercent?: number;
  affiliateFeeRecipient?: string;
  referralCode?: string;
} {
  const percentRaw = process.env.DEBRIDGE_AFFILIATE_PERCENT;
  const percent = percentRaw !== undefined ? Number(percentRaw) : NaN;
  const recipient = process.env.DEBRIDGE_AFFILIATE_RECIPIENT;
  const referralCode = process.env.DEBRIDGE_REFERRAL_CODE;

  return {
    affiliateFeePercent: Number.isFinite(percent) && percent > 0 ? percent : undefined,
    affiliateFeeRecipient:
      typeof recipient === "string" && recipient.length > 0 ? recipient : undefined,
    referralCode:
      typeof referralCode === "string" && referralCode.length > 0 ? referralCode : undefined,
  };
}

export async function dlnFetch<T>(
  path: string,
  requestId: string,
  init?: RequestInit
): Promise<
  | { ok: true; data: T; status: number }
  | {
      ok: false;
      code: DlnApiErrorCode;
      message: string;
      status: number;
      details?: unknown;
    }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DLN_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${DLN_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
      signal: controller.signal,
    });

    const text = await response.text();
    const data = parseJson(text);

    if (!response.ok) {
      return {
        ok: false,
        code: response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR",
        message: `deBridge DLN returned ${response.status}`,
        status: response.status === 429 ? 429 : 502,
        details: data ?? text,
      };
    }

    return { ok: true, data: data as T, status: response.status };
  } catch (error) {
    if (isAbortError(error)) {
      return {
        ok: false,
        code: "UPSTREAM_TIMEOUT",
        message: "deBridge DLN request timed out",
        status: 504,
      };
    }

    console.error(`[dln:${requestId}] DLN request failed:`, error);
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      message: "deBridge DLN request failed",
      status: 502,
      details: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
