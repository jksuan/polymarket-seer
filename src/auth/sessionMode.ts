/** 本会话登录路线：外链 SIWE 或 Privy embedded（社交/邮箱） */
export type AuthSessionMode = "external" | "embedded";

export const SESSION_MODE_STORAGE_KEY = "polymarket-seer:session-mode";

type PrivyUserLike = {
  email?: { address?: string | null } | null;
  google?: { email?: string | null } | null;
  twitter?: { username?: string | null; subject?: string | null } | null;
};

/** Privy useLogin.onComplete 的 loginMethod → 业务 sessionMode */
export function loginMethodToSessionMode(loginMethod: string | null | undefined): AuthSessionMode | null {
  if (!loginMethod) return null;
  if (loginMethod === "siwe") return "external";
  return "embedded";
}

export function inferSessionModeFromUser(user: unknown): AuthSessionMode | null {
  const identity = user as PrivyUserLike | null | undefined;
  if (
    identity?.email?.address ||
    identity?.google?.email ||
    identity?.twitter?.username ||
    identity?.twitter?.subject
  ) {
    return "embedded";
  }
  return null;
}

export function readStoredSessionMode(): AuthSessionMode | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_MODE_STORAGE_KEY);
    if (raw === "external" || raw === "embedded") return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredSessionMode(mode: AuthSessionMode): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_MODE_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function clearStoredSessionMode(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_MODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function preferEmbeddedPrimaryWallet(mode: AuthSessionMode | null): boolean {
  return mode === "embedded";
}
