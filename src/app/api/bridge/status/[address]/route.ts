import type { BridgeStatusResponse } from "@/types/bridge";
import {
  bridgeFetch,
  createRequestId,
  errorResponse,
  isNonEmptyString,
  successResponse,
} from "../../_utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const requestId = createRequestId();
  const { address } = await params;
  const decodedAddress = decodeURIComponent(address ?? "").trim();

  if (!isNonEmptyString(decodedAddress) || decodedAddress.length < 8) {
    return errorResponse(
      "VALIDATION_ERROR",
      "address path parameter is invalid",
      requestId,
      422
    );
  }

  const result = await bridgeFetch<BridgeStatusResponse>(
    `/status/${encodeURIComponent(decodedAddress)}`,
    requestId
  );

  if (!result.ok) {
    return errorResponse(
      result.code,
      result.message,
      requestId,
      result.status,
      result.details
    );
  }

  return successResponse(result.data, requestId);
}
