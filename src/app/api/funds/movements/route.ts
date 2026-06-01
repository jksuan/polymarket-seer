import {
  insertFundsMovement,
  listFundsMovementsForUser,
} from "@/db/repositories/fundsMovements";
import {
  createRequestId,
  errorResponse,
  readJsonBody,
  successResponse,
} from "@/app/api/funds/_utils";
import { requireFundsApiContext, requireWalletAndProxyMatch } from "@/lib/funds/requestGuards";
import { parseRecordMovementBody } from "@/lib/funds/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const ctx = await requireFundsApiContext(request, requestId);
  if (!ctx.ok) return ctx.response;

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 100;

  try {
    const items = await listFundsMovementsForUser(ctx.privyUserId, limit);
    return successResponse({ items }, requestId);
  } catch (error) {
    console.error(`[funds:${requestId}] list movements failed:`, error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to list funds movements",
      requestId,
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const ctx = await requireFundsApiContext(request, requestId);
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse("BAD_REQUEST", "Request body must be a JSON object", requestId, 400);
  }

  const parsed = parseRecordMovementBody(body);
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
    const result = await insertFundsMovement(ctx.privyUserId, parsed.value);
    return successResponse(
      {
        inserted: result.inserted,
        movement: result.movement,
      },
      requestId,
      { status: result.inserted ? 201 : 200 }
    );
  } catch (error) {
    console.error(`[funds:${requestId}] record movement failed:`, error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to record funds movement",
      requestId,
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
