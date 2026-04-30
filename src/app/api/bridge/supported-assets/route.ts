import type { SupportedAssetsResponse } from "@/types/bridge";
import {
  bridgeFetch,
  createRequestId,
  errorResponse,
  successResponse,
} from "../_utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const result = await bridgeFetch<SupportedAssetsResponse>(
    "/supported-assets",
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
