import type {
  BridgeApiErrorCode,
  BridgeApiResponse,
  BridgeError,
} from "@/types/bridge";

export class BridgeRequestError extends Error implements BridgeError {
  code: BridgeApiErrorCode;
  requestId?: string;
  details?: unknown;

  constructor(error: BridgeError) {
    super(error.message);
    this.name = "BridgeRequestError";
    this.code = error.code;
    this.requestId = error.requestId;
    this.details = error.details;
  }
}

export async function bridgeRequest<T>(
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
    throw new BridgeRequestError({
      code: "UPSTREAM_ERROR",
      message: "Bridge request failed",
      details: error instanceof Error ? error.message : String(error),
    });
  }

  const payload = await parseBridgeResponse<T>(response);

  if (!payload.ok) {
    throw new BridgeRequestError({
      code: payload.code,
      message: payload.message,
      requestId: payload.requestId,
      details: payload.details,
    });
  }

  return payload.data;
}

async function parseBridgeResponse<T>(
  response: Response
): Promise<BridgeApiResponse<T>> {
  try {
    return (await response.json()) as BridgeApiResponse<T>;
  } catch {
    return {
      ok: false,
      code: response.ok ? "INTERNAL_ERROR" : "UPSTREAM_ERROR",
      message: response.ok
        ? "Bridge response was not valid JSON"
        : `Bridge request returned ${response.status}`,
      requestId: "",
      timestamp: new Date().toISOString(),
    };
  }
}
