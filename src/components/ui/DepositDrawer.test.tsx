import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DepositDrawer } from "./DepositDrawer";

const createDepositAddressMock = vi.fn();
let mockPrivyUser: unknown = null;
let mockWallets: Array<{ address: string; walletClientType?: string }> = [];
const mockSupportedAssetsData = {
  supportedAssets: [
    {
      chainId: "1",
      chainName: "Ethereum",
      minCheckoutUsd: 10,
      token: {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        decimals: 6,
      },
    },
    {
      chainId: "solana",
      chainName: "Solana",
      minCheckoutUsd: 10,
      token: {
        symbol: "USDC",
        name: "USD Coin",
        address: "11111111111111111111111111111111",
        decimals: 6,
      },
    },
  ],
};

vi.mock("@/hooks/useBridge", () => ({
  createDepositAddress: (...args: unknown[]) => createDepositAddressMock(...args),
  useBridgeStatus: () => ({
    data: { transactions: [] },
    mutate: vi.fn(),
  }),
  useSupportedAssets: () => ({
    data: mockSupportedAssetsData,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useDln", () => ({
  getDlnCancelTx: vi.fn(),
  useDlnOrderStatus: () => ({ status: "" }),
}));

vi.mock("@/components/ui/deposit/assets", async () => {
  const actual = await vi.importActual<typeof import("./deposit/assets")>(
    "./deposit/assets"
  );
  return {
    ...actual,
    readAssetBalance: async (asset: { id: string }) => [asset.id, "100"] as const,
    estimateUsdValue: async () => 100,
  };
});

vi.mock("@/hooks/useLockBodyScroll", () => ({
  useLockBodyScroll: vi.fn(),
}));

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: mockPrivyUser }),
  useWallets: () => ({ wallets: mockWallets }),
}));

vi.mock("@/i18n", async () => {
  const zh = (await import("@/i18n/locales/zh")).default;
  return {
    useTranslation: () => ({ locale: "zh" as const, setLocale: vi.fn(), t: zh }),
  };
});

vi.mock("@/contexts/PolymarketAuthContext", () => ({
  usePolymarketAuth: () => ({
    stickyExternalWalletClientType: null as string | null,
    primaryWalletSelectOptions: { stickyClientType: null, preferEmbedded: false },
    sessionMode: null,
    isEvmSignerReady: true,
    sessionEpoch: 1,
  }),
}));

describe("DepositDrawer transfer flow", () => {
  beforeEach(() => {
    createDepositAddressMock.mockReset();
    mockPrivyUser = null;
    mockWallets = [];
  });

  afterEach(() => {
    cleanup();
  });

  it("进入 Transfer Crypto 后自动创建地址并展示结果", async () => {
    createDepositAddressMock.mockResolvedValue({
      address: {
        evm: "0x1111111111111111111111111111111111111111",
      },
    });

    render(
      <DepositDrawer
        balanceUsd="0"
        isOpen
        onClose={vi.fn()}
        proxyAddress="0x2222222222222222222222222222222222222222"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /链上转入/ }));

    await waitFor(() => {
      expect(createDepositAddressMock).toHaveBeenCalledTimes(1);
    });

    expect(createDepositAddressMock).toHaveBeenCalledWith(
      expect.objectContaining({
        address: "0x2222222222222222222222222222222222222222",
        requestedAddressTypes: ["evm", "svm"],
      })
    );

    expect(
      await screen.findByText("0x1111111111111111111111111111111111111111")
    ).toBeInTheDocument();
  });

  it("自动创建地址失败时展示失败提示", async () => {
    createDepositAddressMock.mockRejectedValue(new Error("boom"));

    render(
      <DepositDrawer
        balanceUsd="0"
        isOpen
        onClose={vi.fn()}
        proxyAddress="0x2222222222222222222222222222222222222222"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /链上转入/ }));

    await waitFor(() => {
      expect(createDepositAddressMock).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText("生成失败，请重试")).toBeInTheDocument();
  });

  it("切换到 Solana 链后展示 SVM 地址", async () => {
    createDepositAddressMock.mockResolvedValue({
      address: {
        evm: "0x1111111111111111111111111111111111111111",
        svm: "So11111111111111111111111111111111111111112",
      },
    });

    render(
      <DepositDrawer
        balanceUsd="0"
        isOpen
        onClose={vi.fn()}
        proxyAddress="0x2222222222222222222222222222222222222222"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /链上转入/ }));
    await screen.findByText(/0x1111111111111111111111111111111111111111/);

    fireEvent.click(screen.getAllByRole("button", { name: /Ethereum/ })[0]);
    fireEvent.click((await screen.findAllByRole("button", { name: /Solana/ }))[0]);

    expect(
      await screen.findByText("So11111111111111111111111111111111111111112")
    ).toBeInTheDocument();
  });

  it("切换到无 SVM 地址的链时展示地址类型错误", async () => {
    createDepositAddressMock.mockResolvedValue({
      address: {
        evm: "0x1111111111111111111111111111111111111111",
      },
    });

    render(
      <DepositDrawer
        balanceUsd="0"
        isOpen
        onClose={vi.fn()}
        proxyAddress="0x2222222222222222222222222222222222222222"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /链上转入/ }));
    await screen.findByText(/0x1111111111111111111111111111111111111111/);

    fireEvent.click(screen.getAllByRole("button", { name: /Ethereum/ })[0]);
    fireEvent.click((await screen.findAllByRole("button", { name: /Solana/ }))[0]);

    expect(
      await screen.findByText("当前 Solana 入金地址暂不可用，请稍后重试或切换 EVM 网络。")
    ).toBeInTheDocument();
  });

  it("Connected 路径可从首页进入资产页并继续到金额页", async () => {
    mockWallets = [
      {
        address: "0x3333333333333333333333333333333333333333",
        walletClientType: "metamask",
      },
    ];

    render(
      <DepositDrawer
        balanceUsd="0"
        isOpen
        onClose={vi.fn()}
        proxyAddress="0x2222222222222222222222222222222222222222"
      />
    );

    const walletButton = await screen.findByRole("button", { name: /钱包/ });
    await waitFor(() => {
      expect(walletButton).not.toBeDisabled();
    });
    fireEvent.click(walletButton);

    const usdcButton = await screen.findByRole("button", { name: /USDC/ });
    fireEvent.click(usdcButton);
    expect(await screen.findByRole("button", { name: "继续" })).toBeInTheDocument();
  });
});
