import { render, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PolymarketAuthProvider, usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { SESSION_MODE_STORAGE_KEY } from "@/auth/sessionMode";

const mockLogin = vi.fn();
let isAuthenticated = true;
const mockLogout = vi.fn(async () => {
  isAuthenticated = false;
});

vi.mock("@/i18n", async () => {
  const z = (await import("@/i18n/locales/zh")).default;
  return {
    useTranslation: () => ({ locale: "zh" as const, setLocale: vi.fn(), t: z }),
  };
});

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: isAuthenticated,
    user: {
      wallet: { address: "0xcccccccccccccccccccccccccccccccccccccccc" },
      google: { email: "user@gmail.com" },
    },
    logout: mockLogout,
  }),
  useLogin: () => ({ login: mockLogin }),
  useWallets: () => ({
    wallets: [
      {
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        walletClientType: "metamask",
        getEthereumProvider: vi.fn(),
      },
      {
        address: "0xcccccccccccccccccccccccccccccccccccccccc",
        walletClientType: "privy",
        getEthereumProvider: vi.fn(),
      },
    ],
  }),
  useCreateWallet: () => ({ createWallet: vi.fn(async () => {}) }),
  useActiveWallet: () => ({ wallet: undefined, setActiveWallet: vi.fn() }),
}));

function SessionProbe() {
  const { sessionMode, isEvmSignerReady } = usePolymarketAuth();
  return (
    <div>
      <span data-testid="mode">{sessionMode ?? "null"}</span>
      <span data-testid="evm-ready">{String(isEvmSignerReady)}</span>
    </div>
  );
}

describe("PolymarketAuthProvider sessionMode", () => {
  beforeEach(() => {
    isAuthenticated = true;
    sessionStorage.clear();
    sessionStorage.setItem(SESSION_MODE_STORAGE_KEY, "embedded");
  });

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it("embedded 会话从 storage 恢复且优先 embedded 主钱包", async () => {
    render(
      <PolymarketAuthProvider>
        <SessionProbe />
      </PolymarketAuthProvider>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="mode"]')?.textContent).toBe("embedded");
      expect(document.querySelector('[data-testid="evm-ready"]')?.textContent).toBe("true");
    });
  });
});
