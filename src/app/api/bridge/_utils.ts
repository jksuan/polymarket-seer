import { NextResponse } from "next/server";
import type {
  BridgeAddressType,
  BridgeApiErrorCode,
  BridgeApiErrorResponse,
  BridgeApiSuccessResponse,
  CreateDepositResponse,
} from "@/types/bridge";

export const BRIDGE_API_BASE_URL = "https://bridge.polymarket.com";
export const BRIDGE_REQUEST_TIMEOUT_MS = 15_000;

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const INTEGER_STRING_REGEX = /^[0-9]+$/;

type JsonRecord = Record<string, unknown>;

const BRIDGE_REQUESTED_ADDRESS_TYPES = new Set<string>(["evm", "svm", "btc", "tron"]);

/**
 * 解析可选的 requestedAddressTypes；缺省为 undefined。非法则返回错误信息。
 */
export function parseOptionalRequestedAddressTypes(body: JsonRecord):
  | { ok: true; value: BridgeAddressType[] | undefined }
  | { ok: false; error: string } {
  const raw = body.requestedAddressTypes;
  if (raw === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(raw)) {
    return { ok: false, error: "requestedAddressTypes must be an array" };
  }
  if (raw.length === 0) {
    return { ok: false, error: "requestedAddressTypes must not be empty when provided" };
  }
  const seen = new Set<string>();
  const out: BridgeAddressType[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || !BRIDGE_REQUESTED_ADDRESS_TYPES.has(item)) {
      return {
        ok: false,
        error: "requestedAddressTypes must only contain evm, svm, btc, or tron",
      };
    }
    if (!seen.has(item)) {
      seen.add(item);
      out.push(item as BridgeAddressType);
    }
  }
  return { ok: true, value: out };
}

/** 联调日志用：仅返回响应里出现的地址类型键，不包含具体地址。 */
export function extractDepositResponseAddressTypeKeys(
  data: CreateDepositResponse
): string[] {
  const record = data as Record<string, unknown>;
  const nested = record.address ?? record.depositAddresses;
  if (!nested || typeof nested !== "object" || Array.isArray(nested)) return [];
  const keys: string[] = [];
  for (const k of Object.keys(nested)) {
    if (BRIDGE_REQUESTED_ADDRESS_TYPES.has(k)) keys.push(k);
  }
  return keys.sort();
}

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `req_${crypto.randomUUID()}`;
  }

  return `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/** Bridge 上游请求头；配置 POLY_BUILDER_CODE 时附带 X-Builder-Code（开发者码）。 */
export function buildBridgeUpstreamHeaders(
  init?: HeadersInit
): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const builderCode = process.env.POLY_BUILDER_CODE?.trim();
  if (builderCode) {
    headers["X-Builder-Code"] = builderCode;
  }

  if (init) {
    const extra = new Headers(init);
    extra.forEach((value, key) => {
      headers[key] = value;
    });
  }

  return headers;
}

export function successResponse<T>(
  data: T,
  requestId: string,
  init?: ResponseInit
) {
  const body: BridgeApiSuccessResponse<T> = {
    ok: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, init);
}

export function errorResponse(
  code: BridgeApiErrorCode,
  message: string,
  requestId: string,
  status: number,
  details?: unknown
) {
  const body: BridgeApiErrorResponse = {
    ok: false,
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details === undefined ? {} : { details }),
  };

  return NextResponse.json(body, { status });
}

export function isEvmAddress(value: unknown): value is string {
  return typeof value === "string" && EVM_ADDRESS_REGEX.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isPositiveIntegerString(value: unknown): value is string {
  return (
    typeof value === "string" &&
    INTEGER_STRING_REGEX.test(value) &&
    /[1-9]/.test(value)
  );
}

export function isNumericString(value: unknown): value is string {
  return typeof value === "string" && INTEGER_STRING_REGEX.test(value);
}

export function validateEvmAddressField(
  body: JsonRecord,
  field: string
): string | null {
  return isEvmAddress(body[field])
    ? null
    : `${field} must be a valid EVM address`;
}

export function validateRequiredStringFields(
  body: JsonRecord,
  fields: string[]
): string | null {
  const missingField = fields.find((field) => !isNonEmptyString(body[field]));
  return missingField ? `${missingField} is required` : null;
}

export function validateNumericStringFields(
  body: JsonRecord,
  fields: string[]
): string | null {
  const invalidField = fields.find((field) => !isNumericString(body[field]));
  return invalidField ? `${invalidField} must be a numeric string` : null;
}

export async function readJsonBody(request: Request): Promise<JsonRecord | null> {
  try {
    const body: unknown = await request.json();
    return isPlainObject(body) ? body : null;
  } catch {
    return null;
  }
}

export async function bridgeFetch<T>(
  path: string,
  requestId: string,
  init?: RequestInit
): Promise<
  | { ok: true; data: T; status: number }
  | {
      ok: false;
      code: BridgeApiErrorCode;
      message: string;
      status: number;
      details?: unknown;
    }
> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BRIDGE_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BRIDGE_API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...buildBridgeUpstreamHeaders(init?.headers),
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
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
        message: `Bridge API returned ${response.status}`,
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
        message: "Bridge API request timed out",
        status: 504,
      };
    }

    console.error(`[bridge:${requestId}] Bridge API request failed:`, error);
    return {
      ok: false,
      code: "UPSTREAM_ERROR",
      message: "Bridge API request failed",
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

function isPlainObject(value: unknown): value is JsonRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
