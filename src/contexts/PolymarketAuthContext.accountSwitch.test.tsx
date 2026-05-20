import { render, act, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SESSION_MODE_STORAGE_KEY } from "@/auth/sessionMode";
import { PolymarketAuthProvider } from "./PolymarketAuthContext";

const mockLogin = vi.fn();
let isAuthenticated = true;
const mockLogout = vi.fn(async () => {
  isAuthenticated = false;
});
const mockSetActiveWallet = vi.fn();
const mockCreateWallet = vi.fn(async () => {});

type AccountsChangedHandler = (accounts: string[]) => void;

class MockEthereumProvider {
  private handlers = new Set<AccountsChangedHandler>();
  private accounts: string[];

  constructor(initialAccounts: string[]) {
    this.accounts = initialAccounts;
  }

  on(event: string, handler: AccountsChangedHandler) {
    if (event === "accountsChanged") {
      this.handlers.add(handler);
    }
  }

  removeListener(event: string, handler: AccountsChangedHandler) {
    if (event === "accountsChanged") {
      this.handlers.delete(handler);
    }
  }

  async request({ method }: { method: string }) {
    if (method === "eth_accounts") return this.accounts;
    return [];
  }

  emitAccountsChanged(accounts: string[]) {
    this.accounts = accounts;
    this.handlers.forEach((h) => h(accounts));
  }
}

const mockProvider = new MockEthereumProvider(["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);

const mockWallet = {
  address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  walletClientType: "metamask",
  getEthereumProvider: vi.fn(async () => mockProvider),
  disconnect: vi.fn(async () => {}),
};

vi.mock("@/i18n", async () => {
  const z = (await import("@/i18n/locales/zh")).default;
  return {
    useTranslation: () => ({ locale: "zh" as const, setLocale: vi.fn(), t: z }),
  };
});

vi.mock("@/lib/clearWalletConnectStorage", () => ({
  clearWalletConnectStorage: vi.fn(async () => {}),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({
    ready: true,
    authenticated: isAuthenticated,
    user: { wallet: { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
    logout: mockLogout,
  }),
  useLogin: () => ({ login: mockLogin }),
  useWallets: () => ({ wallets: [mockWallet] }),
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
  useActiveWallet: () => ({ wallet: undefined, setActiveWallet: mockSetActiveWallet }),
}));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("PolymarketAuthProvider account switch guard", () => {
  beforeEach(() => {
    isAuthenticated = true;
    sessionStorage.setItem(SESSION_MODE_STORAGE_KEY, "external");
    mockLogin.mockClear();
    mockLogout.mockClear();
    mockSetActiveWallet.mockClear();
    mockCreateWallet.mockClear();
    mockWallet.disconnect.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    cleanup();
  });

  it("external 会话账户漂移后仅登出，不自动 login（ADR-0005）", async () => {
    render(<PolymarketAuthProvider>{null}</PolymarketAuthProvider>);

    await waitFor(() => {
      expect(mockWallet.getEthereumProvider).toHaveBeenCalled();
    });

    await act(async () => {
      mockProvider.emitAccountsChanged(["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]);
      await sleep(350);
    });

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockLogin).not.toHaveBeenCalled();
    });
  });
});
