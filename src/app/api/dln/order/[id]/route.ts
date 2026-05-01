import type { DlnOrderStatusResponse } from "@/types/dln";
import {
  createRequestId,
  dlnFetch,
  errorResponse,
  isNonEmptyString,
  successResponse,
} from "../../_utils";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = createRequestId();
  const { id } = await params;
  const decoded = decodeURIComponent(id ?? "").trim();

  if (!isNonEmptyString(decoded) || decoded.length < 8) {
    return errorResponse(
      "VALIDATION_ERROR",
      "id path parameter is invalid",
      requestId,
      422
    );
  }

  const result = await dlnFetch<DlnOrderStatusResponse>(
    `/v1.0/dln/order/${encodeURIComponent(decoded)}/status`,
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
