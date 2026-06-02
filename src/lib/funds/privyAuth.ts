import { PrivyClient } from "@privy-io/server-auth";

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim();
  const appSecret = process.env.PRIVY_APP_SECRET?.trim();
  if (!appId || !appSecret) return null;
  if (!privyClient) {
    privyClient = new PrivyClient(appId, appSecret);
  }
  return privyClient;
}

export function isPrivyServerAuthConfigured(): boolean {
  return Boolean(getPrivyClient());
}

export function extractBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export type VerifiedPrivyUser = {
  privyUserId: string;
};

export async function verifyPrivyRequest(
  request: Request
): Promise<VerifiedPrivyUser | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  const client = getPrivyClient();
  if (!client) return null;

  try {
    const claims = await client.verifyAuthToken(token);
    const userId = claims.userId?.trim();
    if (!userId) return null;
    return { privyUserId: userId };
  } catch {
    return null;
  }
}
