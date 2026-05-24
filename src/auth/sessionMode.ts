import { hasEmbeddedLinkedIdentity } from "./privyUserIdentity";

/** 本会话登录路线：外链 SIWE 或 Privy embedded（社交/邮箱） */
export type AuthSessionMode = "external" | "embedded";

export const SESSION_MODE_STORAGE_KEY = "polymarket-seer:session-mode";

/** Privy useLogin.onComplete 的 loginMethod → 业务 sessionMode */
export function loginMethodToSessionMode(loginMethod: string | null | undefined): AuthSessionMode | null {
  if (!loginMethod) return null;
  if (loginMethod === "siwe") return "external";
  return "embedded";
}

export function inferSessionModeFromUser(user: unknown): AuthSessionMode | null {
  if (hasEmbeddedLinkedIdentity(user)) return "embedded";
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

export function shouldMonitorExternalAccountDrift(mode: AuthSessionMode | null): boolean {
  return mode === "external";
}
