import { getUserWalletByPrivyId } from "@/db/repositories/userWallets";
import {
  createRequestId,
  errorResponse,
  etherscanUnavailableResponse,
  successResponse,
} from "@/app/api/funds/_utils";
import { listProxyCollateralMovements } from "@/lib/funds/onchain/polygonTokenTransfers";
import { requireFundsApiContext } from "@/lib/funds/requestGuards";
import { isValidEvmAddress, normalizeEvmAddress } from "@/lib/funds/validation";

export const dynamic = "force-dynamic";

function readEtherscanApiKey(): string | undefined {
  return process.env.ETHERSCAN_API_KEY?.trim();
}

export async function GET(request: Request) {
  const requestId = createRequestId();
  const ctx = await requireFundsApiContext(request, requestId);
  if (!ctx.ok) return ctx.response;

  const apiKey = readEtherscanApiKey();
  if (!apiKey) {
    return etherscanUnavailableResponse(requestId);
  }

  const url = new URL(request.url);
  const proxyParam = url.searchParams.get("proxyAddress")?.trim() ?? "";
  const limitRaw = Number(url.searchParams.get("limit") ?? "100");
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 100;

  try {
    const wallet = await getUserWalletByPrivyId(ctx.privyUserId);
    if (!wallet) {
      return errorResponse(
        "BAD_REQUEST",
        "Register user wallet before listing movements",
        requestId,
        400
      );
    }

    const proxyAddress = proxyParam || wallet.proxyAddress;
    if (!isValidEvmAddress(proxyAddress)) {
      return errorResponse("BAD_REQUEST", "proxyAddress must be a valid EVM address", requestId, 422);
    }
    if (normalizeEvmAddress(proxyAddress) !== wallet.proxyAddress.toLowerCase()) {
      return errorResponse(
        "FORBIDDEN",
        "proxyAddress does not match the authenticated user",
        requestId,
        403
      );
    }

    const items = await listProxyCollateralMovements({ proxyAddress, apiKey });
    return successResponse({ items: items.slice(0, limit) }, requestId);
  } catch (error) {
    console.error(`[funds:${requestId}] list live movements failed:`, error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to list live funds movements",
      requestId,
      500,
      error instanceof Error ? error.message : String(error)
    );
  }
}
