import { upsertWithdrawBridgeDestination } from "@/db/repositories/withdrawBridgeDestinations";
import {
  createRequestId,
  errorResponse,
  readJsonBody,
  successResponse,
} from "@/app/api/funds/_utils";
import { requireFundsApiContext, requireWalletAndProxyMatch } from "@/lib/funds/requestGuards";
import { parseWithdrawDestinationBody } from "@/lib/funds/validation";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const requestId = createRequestId();
  const ctx = await requireFundsApiContext(request, requestId);
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse("BAD_REQUEST", "Request body must be a JSON object", requestId, 400);
  }

  const parsed = parseWithdrawDestinationBody(body);
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
    const result = await upsertWithdrawBridgeDestination(ctx.privyUserId, parsed.value);
    return successResponse({ saved: true, id: result.id }, requestId);
  } catch (error) {
    console.error(`[funds:${requestId}] upsert withdraw destination failed:`, error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to save withdraw bridge destination",
      requestId,
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
