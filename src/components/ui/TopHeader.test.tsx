import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import zh from "@/i18n/locales/zh";
import { TopHeader } from "./TopHeader";

vi.mock("@/components/ui/SettingsDrawer", () => ({
  SettingsDrawer: () => null,
}));
vi.mock("@/components/ui/DepositDrawer", () => ({
  DepositDrawer: () => null,
}));
vi.mock("@/components/ui/LanguageDrawer", () => ({
  LanguageDrawer: () => null,
}));

vi.mock("@/contexts/PolymarketAuthContext", () => ({
  usePolymarketAuth: vi.fn(),
}));

vi.mock("@/i18n", async () => {
  const z = (await import("@/i18n/locales/zh")).default;
  return {
    useTranslation: () => ({ locale: "zh" as const, setLocale: vi.fn(), t: z }),
  };
});

describe("TopHeader", () => {
  it("已登录且 EVM 主钱包不可解析时展示不可用提示", async () => {
    const { usePolymarketAuth } = await import("@/contexts/PolymarketAuthContext");
    vi.mocked(usePolymarketAuth).mockReturnValue({
      login: vi.fn(),
      authenticated: true,
      handleLogout: vi.fn(),
      proxyAddress: "0x1",
      displayIdentifier: "0xabc",
      usdcBalance: "0",
      fetchBalance: vi.fn(),
      isInitialBalanceLoading: false,
      isEvmSignerReady: false,
      sessionMode: null,
      primaryWalletSelectOptions: { stickyClientType: null, preferEmbedded: false },
    } as unknown as ReturnType<typeof usePolymarketAuth>);

    render(<TopHeader />);

    expect(screen.getByText(zh.header.evmSignerUnavailableTitle)).toBeInTheDocument();
  });

  it("未登录且账户漂移时展示重登提示", async () => {
    const { usePolymarketAuth } = await import("@/contexts/PolymarketAuthContext");
    vi.mocked(usePolymarketAuth).mockReturnValue({
      login: vi.fn(),
      authenticated: false,
      handleLogout: vi.fn(),
      proxyAddress: null,
      displayIdentifier: "",
      usdcBalance: "0",
      fetchBalance: vi.fn(),
      isInitialBalanceLoading: false,
      isEvmSignerReady: false,
      sessionEpoch: 0,
      accountDriftRequiresRelogin: true,
      clearAccountDriftPrompt: vi.fn(),
    } as unknown as ReturnType<typeof usePolymarketAuth>);

    render(<TopHeader />);

    expect(screen.getByText(zh.header.accountDriftReloginTitle)).toBeInTheDocument();
  });
});
