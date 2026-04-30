import type { QuoteRequest, QuoteResponse } from "@/types/bridge";
import {
  bridgeFetch,
  createRequestId,
  errorResponse,
  isPositiveIntegerString,
  readJsonBody,
  successResponse,
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
    "fromAmountBaseUnit",
    "fromChainId",
    "fromTokenAddress",
    "recipientAddress",
    "toChainId",
    "toTokenAddress",
  ]);
  if (requiredError) {
    return errorResponse(
      "VALIDATION_ERROR",
      requiredError,
      requestId,
      422
    );
  }

  const numericError = validateNumericStringFields(body, [
    "fromChainId",
    "toChainId",
  ]);
  if (numericError) {
    return errorResponse("VALIDATION_ERROR", numericError, requestId, 422);
  }

  if (!isPositiveIntegerString(body.fromAmountBaseUnit)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "fromAmountBaseUnit must be a positive integer string",
      requestId,
      422
    );
  }

  const fromAmountBaseUnit = body.fromAmountBaseUnit as string;
  const fromChainId = body.fromChainId as string;
  const fromTokenAddress = body.fromTokenAddress as string;
  const recipientAddress = body.recipientAddress as string;
  const toChainId = body.toChainId as string;
  const toTokenAddress = body.toTokenAddress as string;

  const payload: QuoteRequest = {
    fromAmountBaseUnit,
    fromChainId,
    fromTokenAddress,
    recipientAddress,
    toChainId,
    toTokenAddress,
  };

  const result = await bridgeFetch<QuoteResponse>("/quote", requestId, {
    method: "POST",
    body: JSON.stringify(payload),
  });

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
