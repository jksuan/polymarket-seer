import { isDatabaseConfigured } from "@/db/client";
import {
  databaseUnavailableResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/app/api/funds/_utils";
import { isPrivyServerAuthConfigured, verifyPrivyRequest } from "@/lib/funds/privyAuth";
import { assertProxyOwnedByUser, getUserWalletByPrivyId } from "@/db/repositories/userWallets";

export async function requireFundsApiContext(request: Request, requestId: string) {
  if (!isDatabaseConfigured()) {
    return { ok: false as const, response: databaseUnavailableResponse(requestId) };
  }
  if (!isPrivyServerAuthConfigured()) {
    return {
      ok: false as const,
      response: errorResponse(
        "SERVICE_UNAVAILABLE",
        "Privy server auth is not configured (PRIVY_APP_SECRET)",
        requestId,
        503
      ),
    };
  }

  const user = await verifyPrivyRequest(request);
  if (!user) {
    return { ok: false as const, response: unauthorizedResponse(requestId) };
  }

  return { ok: true as const, privyUserId: user.privyUserId };
}

export async function requireWalletAndProxyMatch(
  privyUserId: string,
  proxyAddress: string,
  requestId: string
) {
  const wallet = await getUserWalletByPrivyId(privyUserId);
  if (!wallet) {
    return {
      ok: false as const,
      response: errorResponse(
        "BAD_REQUEST",
        "Register user wallet before this operation",
        requestId,
        400
      ),
    };
  }
  const owned = await assertProxyOwnedByUser(privyUserId, proxyAddress);
  if (!owned) {
    return {
      ok: false as const,
      response: errorResponse(
        "FORBIDDEN",
        "proxyAddress does not match the authenticated user",
        requestId,
        403
      ),
    };
  }
  return { ok: true as const, wallet };
}
