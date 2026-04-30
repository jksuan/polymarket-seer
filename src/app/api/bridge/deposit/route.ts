import type { CreateDepositRequest, CreateDepositResponse } from "@/types/bridge";
import {
  bridgeFetch,
  createRequestId,
  errorResponse,
  readJsonBody,
  successResponse,
  validateEvmAddressField,
} from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const body = await readJsonBody(request);

  if (!body) {
    return errorResponse(
      "BAD_REQUEST",
      "Request body must be a JSON object",
      requestId,
      400
    );
  }

  const addressError = validateEvmAddressField(body, "address");
  if (addressError) {
    return errorResponse(
      "VALIDATION_ERROR",
      addressError,
      requestId,
      422
    );
  }

  const address = body.address as string;
  const payload: CreateDepositRequest = {
    address,
  };

  const result = await bridgeFetch<CreateDepositResponse>(
    "/deposit",
    requestId,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
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
