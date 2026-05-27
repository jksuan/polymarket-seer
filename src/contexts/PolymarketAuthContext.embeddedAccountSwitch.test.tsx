import { render, waitFor, cleanup, act } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { SESSION_MODE_STORAGE_KEY } from "@/auth/sessionMode";
import { PolymarketAuthProvider, usePolymarketAuth } from "./PolymarketAuthContext";

const GOOGLE_EOA = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const EMAIL_EOA = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const mockLogin = vi.fn();
const mockLogout = vi.fn(async () => {
  privyState.authenticated = false;
  privyState.user = null;
  notifyPrivySubscribers();
});
const mockSetActiveWallet = vi.fn();
const mockCreateWallet = vi.fn(async () => {});

let loginOnComplete: ((args: { loginMethod: string }) => void) | undefined;
const privySubscribers = new Set<() => void>();
function notifyPrivySubscribers() {
  privySubscribers.forEach((listener) => listener());
}

let privyState: {
  authenticated: boolean;
  user: {
    id: string;
    email?: { address: string };
    google?: { email: string };
    wallet?: { address: string };
  } | null;
};

let walletState: {
  wallets: Array<{
    address: string;
    walletClientType: string;
    getEthereumProvider: ReturnType<typeof vi.fn>;
    switchChain: ReturnType<typeof vi.fn>;
  }>;
};

function makePrivyWallet(address: string) {
  return {
    address,
    walletClientType: "privy",
    getEthereumProvider: vi.fn(async () => ({
      request: vi.fn(async () => []),
    })),
    switchChain: vi.fn(async () => {}),
  };
}

vi.mock("@/i18n", async () => {
  const z = (await import("@/i18n/locales/zh")).default;
  return {
    useTranslation: () => ({ locale: "zh" as const, setLocale: vi.fn(), t: z }),
  };
});

vi.mock("@/lib/clearWalletConnectStorage", () => ({
  clearWalletConnectStorage: vi.fn(async () => {}),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    getCachedCreds: vi.fn(() => null),
    setCachedCreds: vi.fn(),
    clearCachedCredsForWallet: vi.fn(),
    clearCredsCache: vi.fn(),
  };
});

vi.mock("@/auth/resolveClobApiKeyCreds", () => ({
  resolveClobApiKeyCreds: vi.fn(async () => ({
    creds: null,
    hasCreds: false,
  })),
}));

vi.mock("@/auth/readUsdcBalanceDisplay", () => ({
  readUsdcBalanceDisplay: vi.fn(async () => ({
    displayBalance: "0.00",
    readOk: true,
  })),
}));

vi.mock("@polymarket/builder-relayer-client/dist/builder/derive", () => ({
  deriveSafe: vi.fn((address: string) => `0xsafe${address.slice(2, 10)}`),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => {
    const [, setTick] = useState(0);
    useEffect(() => {
      const listener = () => setTick((value) => value + 1);
      privySubscribers.add(listener);
      return () => {
        privySubscribers.delete(listener);
      };
    }, []);
    return {
      ready: true,
      authenticated: privyState.authenticated,
      user: privyState.user,
      logout: mockLogout,
    };
  },
  useLogin: (opts?: { onComplete?: (args: { loginMethod: string }) => void }) => {
    loginOnComplete = opts?.onComplete;
    return { login: mockLogin };
  },
  useWallets: () => {
    const [, setTick] = useState(0);
    useEffect(() => {
      const listener = () => setTick((value) => value + 1);
      privySubscribers.add(listener);
      return () => {
        privySubscribers.delete(listener);
      };
    }, []);
    return { wallets: walletState.wallets };
  },
  useCreateWallet: () => ({ createWallet: mockCreateWallet }),
  useActiveWallet: () => ({ wallet: undefined, setActiveWallet: mockSetActiveWallet }),
}));

function triggerLoginComplete(loginMethod: string) {
  loginOnComplete?.({ loginMethod });
}

function WalletProbe() {
  const { walletAddress, displayIdentifier } = usePolymarketAuth();
  return (
    <div>
      <span data-testid="wallet">{walletAddress || "empty"}</span>
      <span data-testid="identity">{displayIdentifier}</span>
    </div>
  );
}

function TestRoot({ children }: { children: ReactNode }) {
  return <PolymarketAuthProvider>{children}</PolymarketAuthProvider>;
}

describe("PolymarketAuthProvider embedded account switch", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockLogin.mockClear();
    mockLogout.mockClear();
    mockSetActiveWallet.mockClear();
    mockCreateWallet.mockClear();
    loginOnComplete = undefined;
    privySubscribers.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });

    privyState = {
      authenticated: true,
      user: {
        id: "google-user-id",
        google: { email: "myalaladog@gmail.com" },
        wallet: { address: GOOGLE_EOA },
      },
    };
    walletState = {
      wallets: [makePrivyWallet(GOOGLE_EOA)],
    };
    sessionStorage.setItem(SESSION_MODE_STORAGE_KEY, "embedded");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    sessionStorage.clear();
    cleanup();
  });

  it("Google 退出后用邮箱登录：wallets 先旧后新时最终 walletAddress 对齐新 EOA", async () => {
    render(
      <TestRoot>
        <WalletProbe />
      </TestRoot>
    );

    await waitFor(() => {
      expect(document.querySelector('[data-testid="wallet"]')?.textContent).toBe(GOOGLE_EOA);
    });

    await act(async () => {
      privyState.authenticated = false;
      privyState.user = null;
      notifyPrivySubscribers();
    });

    await act(async () => {
      privyState.authenticated = true;
      privyState.user = {
        id: "email-user-id",
        email: { address: "jksuan@163.com" },
        wallet: { address: EMAIL_EOA },
      };
      walletState.wallets = [makePrivyWallet(GOOGLE_EOA)];
      triggerLoginComplete("email");
      sessionStorage.setItem(SESSION_MODE_STORAGE_KEY, "embedded");
      notifyPrivySubscribers();
    });

    await waitFor(() => {
      expect(document.querySelector('[data-testid="identity"]')?.textContent).toContain("jksuan@163.com");
    });

    expect(mockCreateWallet).toHaveBeenCalled();

    const walletAfterLogin = document.querySelector('[data-testid="wallet"]')?.textContent;
    expect(walletAfterLogin === GOOGLE_EOA || walletAfterLogin === "empty").toBe(true);

    await act(async () => {
      walletState.wallets = [makePrivyWallet(EMAIL_EOA)];
      notifyPrivySubscribers();
    });

    await waitFor(
      () => {
        expect(document.querySelector('[data-testid="wallet"]')?.textContent).toBe(EMAIL_EOA);
      },
      { timeout: 15_000 }
    );
  });
});
