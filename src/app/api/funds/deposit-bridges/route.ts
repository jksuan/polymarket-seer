import { upsertUserDepositBridges } from "@/db/repositories/userDepositBridges";
import {
  createRequestId,
  errorResponse,
  readJsonBody,
  successResponse,
} from "@/app/api/funds/_utils";
import { requireFundsApiContext, requireWalletAndProxyMatch } from "@/lib/funds/requestGuards";
import { parseDepositBridgesBody } from "@/lib/funds/validation";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const requestId = createRequestId();
  const ctx = await requireFundsApiContext(request, requestId);
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse("BAD_REQUEST", "Request body must be a JSON object", requestId, 400);
  }

  const parsed = parseDepositBridgesBody(body);
  if (!parsed.ok) {
    return errorResponse("BAD_REQUEST", parsed.error, requestId, 422);
  }

  const walletCheck = await requireWalletAndProxyMatch(
    ctx.privyUserId,
    parsed.value.proxyAddress,
    requestId
  );
  if (!walletCheck.ok) return walletCheck.response;

  try {
    await upsertUserDepositBridges(ctx.privyUserId, parsed.value);
    return successResponse({ saved: true }, requestId);
  } catch (error) {
    console.error(`[funds:${requestId}] upsert deposit bridges failed:`, error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to save deposit bridge addresses",
      requestId,
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
