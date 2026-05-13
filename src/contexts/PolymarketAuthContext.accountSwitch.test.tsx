import { render, screen, fireEvent, act, waitFor, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { PolymarketAuthProvider, usePolymarketAuth } from "./PolymarketAuthContext";

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
};

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
    user: { wallet: { address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } },
    login: mockLogin,
    logout: mockLogout,
  }),
  useWallets: () => ({ wallets: [mockWallet] }),
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
  useActiveWallet: () => ({ wallet: undefined, setActiveWallet: mockSetActiveWallet }),
}));

function GuardStateProbe() {
  const { isAccountSwitchBlocked } = usePolymarketAuth();
  return <div data-testid="guard-state">{isAccountSwitchBlocked ? "blocked" : "clear"}</div>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("PolymarketAuthProvider account switch guard", () => {
  beforeEach(() => {
    isAuthenticated = true;
    mockLogin.mockClear();
    mockLogout.mockClear();
    mockSetActiveWallet.mockClear();
    mockCreateWallet.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it("账户漂移后阻断；取消后等待切回；切回后自动解除阻断", async () => {
    render(
      <PolymarketAuthProvider>
        <GuardStateProbe />
      </PolymarketAuthProvider>
    );

    expect(screen.getByTestId("guard-state")).toHaveTextContent("clear");
    await waitFor(() => {
      expect(mockWallet.getEthereumProvider).toHaveBeenCalled();
    });

    await act(async () => {
      mockProvider.emitAccountsChanged(["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]);
      await sleep(350);
    });

    expect(await screen.findByText("检测到账户已变更")).toBeInTheDocument();
    expect(screen.getByTestId("guard-state")).toHaveTextContent("blocked");

    fireEvent.click(screen.getByRole("button", { name: "取消切换，继续原账户" }));
    expect(screen.getByText("请在钱包中切回原账户后继续。切回成功后将自动恢复页面操作。")).toBeInTheDocument();
    expect(mockLogout).not.toHaveBeenCalled();

    await act(async () => {
      mockProvider.emitAccountsChanged(["0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]);
      await sleep(350);
    });

    expect(screen.queryByText("检测到账户已变更")).not.toBeInTheDocument();
    expect(screen.getByTestId("guard-state")).toHaveTextContent("clear");
  });

  it("点击登录新账户后可自动触发 login，无需手动二次点击", async () => {
    render(
      <PolymarketAuthProvider>
        <GuardStateProbe />
      </PolymarketAuthProvider>
    );

    await waitFor(() => {
      expect(mockWallet.getEthereumProvider).toHaveBeenCalled();
    });

    await act(async () => {
      mockProvider.emitAccountsChanged(["0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"]);
      await sleep(350);
    });

    fireEvent.click(screen.getByRole("button", { name: "登录新账户" }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
  });
});
