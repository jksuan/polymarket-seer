import { upsertUserWallet } from "@/db/repositories/userWallets";
import {
  createRequestId,
  errorResponse,
  readJsonBody,
  successResponse,
} from "@/app/api/funds/_utils";
import { requireFundsApiContext } from "@/lib/funds/requestGuards";
import { parseUserWalletBody } from "@/lib/funds/validation";

export const dynamic = "force-dynamic";

export async function PUT(request: Request) {
  const requestId = createRequestId();
  const ctx = await requireFundsApiContext(request, requestId);
  if (!ctx.ok) return ctx.response;

  const body = await readJsonBody(request);
  if (!body) {
    return errorResponse("BAD_REQUEST", "Request body must be a JSON object", requestId, 400);
  }

  const parsed = parseUserWalletBody(body);
  if (!parsed.ok) {
    return errorResponse("BAD_REQUEST", parsed.error, requestId, 422);
  }

  try {
    await upsertUserWallet(ctx.privyUserId, parsed.value);
    return successResponse({ saved: true }, requestId);
  } catch (error) {
    console.error(`[funds:${requestId}] upsert wallet failed:`, error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to save user wallet",
      requestId,
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
