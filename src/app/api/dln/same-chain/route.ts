import type { DlnSameChainSwapResponse } from "@/types/dln";
import {
  buildQueryString,
  createRequestId,
  dlnFetch,
  errorResponse,
  isNonEmptyString,
  isPositiveIntegerString,
  readEnvAffiliate,
  readJsonBody,
  successResponse,
  validateNumericStringFields,
  validateRequiredStringFields,
} from "../_utils";

export const dynamic = "force-dynamic";

const REQUIRED_FIELDS = [
  "chainId",
  "tokenIn",
  "tokenInAmount",
  "tokenOut",
  "tokenOutRecipient",
];

const NUMERIC_FIELDS = ["chainId"];

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

  const requiredError = validateRequiredStringFields(body, REQUIRED_FIELDS);
  if (requiredError) {
    return errorResponse("VALIDATION_ERROR", requiredError, requestId, 422);
  }

  const numericError = validateNumericStringFields(body, NUMERIC_FIELDS);
  if (numericError) {
    return errorResponse("VALIDATION_ERROR", numericError, requestId, 422);
  }

  if (!isPositiveIntegerString(body.tokenInAmount)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "tokenInAmount must be a positive integer string",
      requestId,
      422
    );
  }

  const env = readEnvAffiliate();

  const slippage = isNonEmptyString(body.slippage)
    ? (body.slippage as string)
    : "auto";

  const tokenOutAmount = isNonEmptyString(body.tokenOutAmount)
    ? (body.tokenOutAmount as string)
    : undefined;

  const senderAddress = isNonEmptyString(body.senderAddress)
    ? (body.senderAddress as string)
    : (body.tokenOutRecipient as string);

  const affiliateFeePercent =
    typeof body.affiliateFeePercent === "number"
      ? body.affiliateFeePercent
      : env.affiliateFeePercent;

  const affiliateFeeRecipient = isNonEmptyString(body.affiliateFeeRecipient)
    ? (body.affiliateFeeRecipient as string)
    : env.affiliateFeeRecipient;

  const referralCode =
    typeof body.referralCode === "string" || typeof body.referralCode === "number"
      ? body.referralCode
      : env.referralCode;

  const srcChainPriorityLevel =
    body.srcChainPriorityLevel === "aggressive" ? "aggressive" : undefined;

  const query = buildQueryString({
    chainId: body.chainId as string,
    tokenIn: body.tokenIn as string,
    tokenInAmount: body.tokenInAmount as string,
    tokenOut: body.tokenOut as string,
    tokenOutRecipient: body.tokenOutRecipient as string,
    tokenOutAmount,
    slippage,
    senderAddress,
    srcChainPriorityLevel,
    affiliateFeePercent:
      affiliateFeePercent !== undefined && affiliateFeePercent > 0
        ? affiliateFeePercent
        : undefined,
    affiliateFeeRecipient:
      affiliateFeePercent !== undefined && affiliateFeePercent > 0
        ? affiliateFeeRecipient
        : undefined,
    referralCode,
  });

  const result = await dlnFetch<DlnSameChainSwapResponse>(
    `/v1.0/chain/transaction${query}`,
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
