import { isDatabaseConfigured } from "@/db/client";
import {
  databaseUnavailableResponse,
  errorResponse,
  unauthorizedResponse,
} from "@/app/api/funds/_utils";
import { isPrivyServerAuthConfigured, verifyPrivyRequest } from "@/lib/funds/privyAuth";

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
