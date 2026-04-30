import type {
  CreateWithdrawRequest,
  CreateWithdrawResponse,
} from "@/types/bridge";
import {
  bridgeFetch,
  createRequestId,
  errorResponse,
  readJsonBody,
  successResponse,
  validateEvmAddressField,
  validateNumericStringFields,
  validateRequiredStringFields,
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

  const requiredError = validateRequiredStringFields(body, [
    "address",
    "toChainId",
    "toTokenAddress",
    "recipientAddr",
  ]);
  if (requiredError) {
    return errorResponse(
      "VALIDATION_ERROR",
      requiredError,
      requestId,
      422
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

  const numericError = validateNumericStringFields(body, ["toChainId"]);
  if (numericError) {
    return errorResponse("VALIDATION_ERROR", numericError, requestId, 422);
  }

  const address = body.address as string;
  const toChainId = body.toChainId as string;
  const toTokenAddress = body.toTokenAddress as string;
  const recipientAddr = body.recipientAddr as string;

  const payload: CreateWithdrawRequest = {
    address,
    toChainId,
    toTokenAddress,
    recipientAddr,
  };

  const result = await bridgeFetch<CreateWithdrawResponse>(
    "/withdraw",
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
