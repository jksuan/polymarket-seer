import type {
  DlnApiErrorCode,
  DlnApiResponse,
  DlnError,
} from "@/types/dln";

export class DlnRequestError extends Error implements DlnError {
  code: DlnApiErrorCode;
  requestId?: string;
  details?: unknown;

  constructor(error: DlnError) {
    super(error.message);
    this.name = "DlnRequestError";
    this.code = error.code;
    this.requestId = error.requestId;
    this.details = error.details;
  }
}

export async function dlnRequest<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch (error) {
    throw new DlnRequestError({
      code: "UPSTREAM_ERROR",
      message: "deBridge request failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const payload = await parseDlnResponse<T>(response);

  if (!payload.ok) {
    throw new DlnRequestError({
      code: payload.code,
      message: payload.message,
      requestId: payload.requestId,
      details: payload.details,
    });
  }

  return payload.data;
}

async function parseDlnResponse<T>(
  response: Response
): Promise<DlnApiResponse<T>> {
  try {
    return (await response.json()) as DlnApiResponse<T>;
  } catch {
    return {
      ok: false,
      code: response.ok ? "INTERNAL_ERROR" : "UPSTREAM_ERROR",
      message: response.ok
        ? "deBridge response was not valid JSON"
        : `deBridge request returned ${response.status}`,
      requestId: "",
      timestamp: new Date().toISOString(),
    };
  }
}
