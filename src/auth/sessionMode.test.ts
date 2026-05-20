import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  SESSION_MODE_STORAGE_KEY,
  clearStoredSessionMode,
  inferSessionModeFromUser,
  loginMethodToSessionMode,
  preferEmbeddedPrimaryWallet,
  readStoredSessionMode,
  shouldMonitorExternalAccountDrift,
  writeStoredSessionMode,
} from "./sessionMode";

describe("sessionMode", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it("loginMethod siwe → external，其余 → embedded", () => {
    expect(loginMethodToSessionMode("siwe")).toBe("external");
    expect(loginMethodToSessionMode("google")).toBe("embedded");
    expect(loginMethodToSessionMode("email")).toBe("embedded");
    expect(loginMethodToSessionMode(null)).toBeNull();
  });

  it("从 user 推断 embedded", () => {
    expect(inferSessionModeFromUser({ google: { email: "a@b.com" } })).toBe("embedded");
    expect(inferSessionModeFromUser({ wallet: { address: "0x1" } })).toBeNull();
  });

  it("sessionStorage 读写与清除", () => {
    writeStoredSessionMode("embedded");
    expect(readStoredSessionMode()).toBe("embedded");
    clearStoredSessionMode();
    expect(readStoredSessionMode()).toBeNull();
    expect(sessionStorage.getItem(SESSION_MODE_STORAGE_KEY)).toBeNull();
  });

  it("preferEmbeddedPrimaryWallet 仅 embedded 为 true", () => {
    expect(preferEmbeddedPrimaryWallet("embedded")).toBe(true);
    expect(preferEmbeddedPrimaryWallet("external")).toBe(false);
    expect(preferEmbeddedPrimaryWallet(null)).toBe(false);
  });

  it("shouldMonitorExternalAccountDrift 仅 external 为 true", () => {
    expect(shouldMonitorExternalAccountDrift("external")).toBe(true);
    expect(shouldMonitorExternalAccountDrift("embedded")).toBe(false);
    expect(shouldMonitorExternalAccountDrift(null)).toBe(false);
  });
});
