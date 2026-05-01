import type { DlnQuoteResponse } from "@/types/dln";
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
  "srcChainId",
  "srcChainTokenIn",
  "srcChainTokenInAmount",
  "dstChainId",
  "dstChainTokenOut",
  "dstChainTokenOutRecipient",
  "srcChainOrderAuthorityAddress",
  "dstChainOrderAuthorityAddress",
];

const NUMERIC_FIELDS = ["srcChainId", "dstChainId"];

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

  if (!isPositiveIntegerString(body.srcChainTokenInAmount)) {
    return errorResponse(
      "VALIDATION_ERROR",
      "srcChainTokenInAmount must be a positive integer string",
      requestId,
      422
    );
  }

  const env = readEnvAffiliate();

  const dstChainTokenOutAmount = isNonEmptyString(body.dstChainTokenOutAmount)
    ? (body.dstChainTokenOutAmount as string)
    : "auto";

  const senderAddress = isNonEmptyString(body.senderAddress)
    ? (body.senderAddress as string)
    : (body.srcChainOrderAuthorityAddress as string);

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

  const prependOperatingExpenses =
    typeof body.prependOperatingExpenses === "boolean"
      ? body.prependOperatingExpenses
      : true;

  const query = buildQueryString({
    srcChainId: body.srcChainId as string,
    srcChainTokenIn: body.srcChainTokenIn as string,
    srcChainTokenInAmount: body.srcChainTokenInAmount as string,
    dstChainId: body.dstChainId as string,
    dstChainTokenOut: body.dstChainTokenOut as string,
    dstChainTokenOutAmount,
    dstChainTokenOutRecipient: body.dstChainTokenOutRecipient as string,
    srcChainOrderAuthorityAddress: body.srcChainOrderAuthorityAddress as string,
    dstChainOrderAuthorityAddress: body.dstChainOrderAuthorityAddress as string,
    senderAddress,
    prependOperatingExpenses,
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

  const result = await dlnFetch<DlnQuoteResponse>(
    `/v1.0/dln/order/create-tx${query}`,
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
