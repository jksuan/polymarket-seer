import { NextResponse } from "next/server";
import type { FundsApiErrorCode, FundsApiErrorResponse, FundsApiSuccessResponse } from "@/types/funds";

type JsonRecord = Record<string, unknown>;

export function createRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `funds_${crypto.randomUUID()}`;
  }
  return `funds_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function successResponse<T>(data: T, requestId: string, init?: ResponseInit) {
  const body: FundsApiSuccessResponse<T> = {
    ok: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };
  return NextResponse.json(body, init);
}

export function errorResponse(
  code: FundsApiErrorCode,
  message: string,
  requestId: string,
  status: number,
  details?: unknown
) {
  const body: FundsApiErrorResponse = {
    ok: false,
    code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(details === undefined ? {} : { details }),
  };
  return NextResponse.json(body, { status });
}

export async function readJsonBody(request: Request): Promise<JsonRecord | null> {
  try {
    const data = await request.json();
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    return data as JsonRecord;
  } catch {
    return null;
  }
}

export function databaseUnavailableResponse(requestId: string) {
  return errorResponse(
    "SERVICE_UNAVAILABLE",
    "Database is not configured",
    requestId,
    503
  );
}

export function unauthorizedResponse(requestId: string) {
  return errorResponse(
    "UNAUTHORIZED",
    "Valid Privy access token required",
    requestId,
    401
  );
}
