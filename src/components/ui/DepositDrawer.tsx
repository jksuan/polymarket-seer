import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Loader2,
  QrCode,
  Store,
  Wallet,
  X,
} from "lucide-react";
import QRCode from "react-qr-code";
import { ethers } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createDepositAddress,
  getBridgeQuote,
  useBridgeStatus,
  useSupportedAssets,
} from "@/hooks/useBridge";
import {
  getDlnQuote,
  getDlnSameChainSwap,
  useDlnOrderStatus,
} from "@/hooks/useDln";
import { ADDRESSES, ERC20_ABI, POLYGON_CHAIN_ID } from "@/lib/constants";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { shortenAddress } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type {
  BridgeAddressType,
  CreateDepositResponse,
  QuoteResponse,
} from "@/types/bridge";
import type { DlnTx } from "@/types/dln";

interface DepositDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proxyAddress: string;
  balanceUsd?: string;
  onBalanceRefresh?: () => void;
}

type FlowStep = "home" | "asset" | "amount" | "confirm" | "transfer";

type DepositAsset = {
  id: string;
  chainId: string;
  chainName: string;
  symbol: string;
  name: string;
  tokenAddress: string;
  iconUrl?: string;
  decimals: number;
  minCheckoutUsd?: number;
  balance?: string;
  usdValue?: number;
  isNative?: boolean;
};

type DepositAddressMap = Partial<Record<BridgeAddressType, string>>;
type ExecutionKind = "idle" | "direct" | "same-chain" | "cross-chain";
type ExecutionTx = DlnTx & {
  allowanceTarget?: string;
};
type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
const POLYGON_USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const ADDRESS_TYPES: BridgeAddressType[] = ["evm", "svm", "btc", "tvm"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ERC20_EXECUTION_ABI = [
  ...ERC20_ABI,
  "function allowance(address owner, address spender) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
];
const NATIVE_TOKEN_ADDRESSES = new Set([
  ZERO_ADDRESS.toLowerCase(),
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "0x0000000000000000000000000000000000001010",
]);
const PUBLIC_RPC_URLS: Record<string, string> = {
  "1": "https://ethereum.publicnode.com",
  "10": "https://optimism-rpc.publicnode.com",
  "56": "https://bsc-rpc.publicnode.com",
  "137": "https://polygon-bor-rpc.publicnode.com",
  "8453": "https://base-rpc.publicnode.com",
  "42161": "https://arbitrum-one-rpc.publicnode.com",
};
const TOKEN_ICON_URLS: Record<string, string> = {
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  POL: "https://assets.coingecko.com/coins/images/32440/small/polygon.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  USDC: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  "USDC.E": "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
  PUSD: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
};

function DrawerContent({
  balanceUsd = "0.00",
  isOpen,
  onClose,
  proxyAddress,
  onBalanceRefresh,
}: DepositDrawerProps) {
  const { locale } = useTranslation();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { data: supportedAssets, isLoading: assetsLoading } = useSupportedAssets();
  const [step, setStep] = useState<FlowStep>("home");
  const [selectedAsset, setSelectedAsset] = useState<DepositAsset | null>(null);
  const [amountUsd, setAmountUsd] = useState("3");
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quotedSendAmount, setQuotedSendAmount] = useState("");
  const [sourceAmountBaseUnit, setSourceAmountBaseUnit] = useState("");
  const [quoteError, setQuoteError] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [executionKind, setExecutionKind] = useState<ExecutionKind>("idle");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [executionTxHash, setExecutionTxHash] = useState("");
  const [dlnOrderId, setDlnOrderId] = useState("");
  const [depositResponse, setDepositResponse] = useState<CreateDepositResponse | null>(null);
  const [transferAddress, setTransferAddress] = useState("");
  const [isCreatingTransferAddress, setIsCreatingTransferAddress] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [copied, setCopied] = useState(false);
  const [assetBalances, setAssetBalances] = useState<Record<string, string>>({});
  const [assetUsdValues, setAssetUsdValues] = useState<Record<string, number>>({});
  const [hasRefreshedBalance, setHasRefreshedBalance] = useState(false);

  const activeWallet = useMemo(
    () => selectPrimaryWallet(wallets, user?.wallet?.address),
    [wallets, user?.wallet?.address]
  );
  const walletAddress = activeWallet?.address ?? "";
  const walletLabel = walletAddress ? `Wallet (${shortenAddress(walletAddress, 4, 4)})` : "Wallet";
  const depositAssets = useMemo(
    () => normalizeSupportedAssets(supportedAssets),
    [supportedAssets]
  );
  const assetsWithBalances = useMemo(
    () => depositAssets.map((asset) => ({
      ...asset,
      balance: assetBalances[asset.id],
      usdValue: assetUsdValues[asset.id] ?? 0,
    })),
    [assetBalances, assetUsdValues, depositAssets]
  );
  const totalWalletUsd = useMemo(
    () => assetsWithBalances.reduce((sum, asset) => sum + (asset.usdValue ?? 0), 0),
    [assetsWithBalances]
  );
  const amountNumber = Number(amountUsd || 0);
  const selectedUsdValue = selectedAsset ? assetUsdValues[selectedAsset.id] : undefined;
  const estimatedSendAmount = selectedAsset
    ? quotedSendAmount || getPreQuoteSendLabel(amountNumber, selectedAsset)
    : "-";
  const estimatedReceive = quote?.estToTokenBaseUnit
    ? Number(ethers.utils.formatUnits(quote.estToTokenBaseUnit, 6)).toFixed(4)
    : amountNumber > 0
      ? amountNumber.toFixed(4)
      : "0.0000";

  const transferStatus = useBridgeStatus(transferAddress, Boolean(transferAddress && isOpen));
  const dlnStatus = useDlnOrderStatus(dlnOrderId, Boolean(dlnOrderId && isOpen));

  useEffect(() => {
    if (!isOpen) return;
    setStep("home");
    setSelectedAsset(null);
    setQuote(null);
    setQuotedSendAmount("");
    setSourceAmountBaseUnit("");
    setQuoteError("");
    setExecutionKind("idle");
    setIsExecuting(false);
    setExecutionError("");
    setExecutionTxHash("");
    setDlnOrderId("");
    setTransferError("");
    setCopied(false);
  }, [isOpen]);

  useEffect(() => {
    if (transferStatus.latestStatus === "COMPLETED" && !hasRefreshedBalance) {
      setHasRefreshedBalance(true);
      onBalanceRefresh?.();
    }
  }, [hasRefreshedBalance, onBalanceRefresh, transferStatus.latestStatus]);

  useEffect(() => {
    if (!isOpen || !activeWallet || depositAssets.length === 0) return;

    let cancelled = false;

    async function loadBalances() {
      try {
        const balances = await Promise.all(
          depositAssets.map((asset) => readAssetBalance(asset, walletAddress))
        );
        const balanceMap = Object.fromEntries(balances);
        const usdValues = await Promise.all(
          depositAssets.map(async (asset) => {
            const balance = balanceMap[asset.id] ?? "0";
            return [asset.id, await estimateUsdValue(asset, balance, proxyAddress)] as const;
          })
        );

        if (!cancelled) {
          setAssetBalances(balanceMap);
          setAssetUsdValues(Object.fromEntries(usdValues));
        }
      } catch {
        if (!cancelled) {
          setAssetBalances({});
          setAssetUsdValues({});
        }
      }
    }

    loadBalances();
    return () => {
      cancelled = true;
    };
  }, [activeWallet, depositAssets, isOpen, proxyAddress, walletAddress]);

  const handleCopy = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const handleSelectAsset = (asset: DepositAsset) => {
    setSelectedAsset(asset);
    setQuote(null);
    setQuotedSendAmount("");
    setSourceAmountBaseUnit("");
    setQuoteError("");
    setExecutionKind("idle");
    setExecutionError("");
    setExecutionTxHash("");
    setDlnOrderId("");
    setStep("amount");
  };

  const handlePercent = (percent: number) => {
    if (!selectedAsset) return;
    const value = Number(selectedUsdValue || 0);
    if (!Number.isFinite(value) || value <= 0) return;
    setAmountUsd((value * percent).toFixed(2));
  };

  const handleQuote = useCallback(async () => {
    if (!selectedAsset || !proxyAddress || amountNumber <= 0) return;
    setIsQuoting(true);
    setQuoteError("");

    try {
      const fromAmountBaseUnit = await estimateBaseUnitForUsd({
        amountUsd: amountNumber,
        asset: selectedAsset,
        proxyAddress,
      });
      const result = await getBridgeQuote({
        fromAmountBaseUnit,
        fromChainId: selectedAsset.chainId,
        fromTokenAddress: selectedAsset.tokenAddress,
        recipientAddress: proxyAddress,
        toChainId: String(POLYGON_CHAIN_ID),
        toTokenAddress: PUSD_ADDRESS,
      });
      setSourceAmountBaseUnit(fromAmountBaseUnit);
      setQuotedSendAmount(`${formatCompactBalance(ethers.utils.formatUnits(fromAmountBaseUnit, selectedAsset.decimals))} ${selectedAsset.symbol}`);
      setQuote(result);
      setStep("confirm");
    } catch (error) {
      setQuoteError(
        error instanceof Error
          ? error.message
          : locale === "zh"
            ? "获取报价失败，请稍后重试。"
            : "Failed to get a quote. Please try again."
      );
    } finally {
      setIsQuoting(false);
    }
  }, [amountNumber, locale, proxyAddress, selectedAsset]);

  const handleConfirmOrder = useCallback(async () => {
    if (!selectedAsset || !activeWallet || !walletAddress || !sourceAmountBaseUnit) {
      setExecutionError(locale === "zh" ? "钱包或报价尚未就绪，请返回重试。" : "Wallet or quote is not ready. Please go back and retry.");
      return;
    }

    setIsExecuting(true);
    setExecutionError("");
    setExecutionTxHash("");
    setDlnOrderId("");
    setHasRefreshedBalance(false);

    try {
      const depositAddress = await ensureEvmDepositAddress({
        existingAddress: transferAddress,
        onAddress: setTransferAddress,
        onResponse: setDepositResponse,
        proxyAddress,
      });
      const ethereumProvider = await getWalletEthereumProvider(activeWallet);
      await switchEvmChain(ethereumProvider, selectedAsset.chainId);

      if (isDirectPolygonStableDeposit(selectedAsset)) {
        setExecutionKind("direct");
        const txHash = await sendDirectErc20Transfer({
          amountBaseUnit: sourceAmountBaseUnit,
          provider: ethereumProvider,
          recipient: depositAddress,
          tokenAddress: selectedAsset.tokenAddress,
        });
        setExecutionTxHash(txHash);
        return;
      }

      if (selectedAsset.chainId === String(POLYGON_CHAIN_ID)) {
        setExecutionKind("same-chain");
        const swap = await getDlnSameChainSwap({
          chainId: selectedAsset.chainId,
          tokenIn: toDlnTokenAddress(selectedAsset),
          tokenInAmount: sourceAmountBaseUnit,
          tokenOut: POLYGON_USDC_ADDRESS,
          tokenOutRecipient: depositAddress,
          senderAddress: walletAddress,
          slippage: "auto",
        });
        await approveDlnIfNeeded({
          amountBaseUnit: sourceAmountBaseUnit,
          asset: selectedAsset,
          owner: walletAddress,
          provider: ethereumProvider,
          tx: swap.tx,
        });
        const txHash = await sendPreparedEvmTx(ethereumProvider, swap.tx);
        setExecutionTxHash(txHash);
        return;
      }

      setExecutionKind("cross-chain");
      const dlnQuote = await getDlnQuote({
        srcChainId: selectedAsset.chainId,
        srcChainTokenIn: toDlnTokenAddress(selectedAsset),
        srcChainTokenInAmount: sourceAmountBaseUnit,
        dstChainId: String(POLYGON_CHAIN_ID),
        dstChainTokenOut: POLYGON_USDC_ADDRESS,
        dstChainTokenOutAmount: "auto",
        dstChainTokenOutRecipient: depositAddress,
        srcChainOrderAuthorityAddress: walletAddress,
        dstChainOrderAuthorityAddress: walletAddress,
        senderAddress: walletAddress,
        prependOperatingExpenses: true,
      });
      setDlnOrderId(dlnQuote.orderId);
      await approveDlnIfNeeded({
        amountBaseUnit: sourceAmountBaseUnit,
        asset: selectedAsset,
        owner: walletAddress,
        provider: ethereumProvider,
        tx: dlnQuote.tx,
      });
      const txHash = await sendPreparedEvmTx(ethereumProvider, dlnQuote.tx);
      setExecutionTxHash(txHash);
    } catch (error) {
      setExecutionError(
        error instanceof Error
          ? error.message
          : locale === "zh"
            ? "确认订单失败，请稍后重试。"
            : "Failed to confirm order. Please try again."
      );
      setExecutionKind("idle");
    } finally {
      setIsExecuting(false);
    }
  }, [
    activeWallet,
    locale,
    proxyAddress,
    selectedAsset,
    sourceAmountBaseUnit,
    transferAddress,
    walletAddress,
  ]);

  const handleCreateTransferAddress = async () => {
    if (!proxyAddress) {
      setTransferError(locale === "zh" ? "Polymarket 钱包尚未就绪。" : "Polymarket wallet is not ready.");
      return;
    }

    setIsCreatingTransferAddress(true);
    setTransferError("");
    setHasRefreshedBalance(false);

    try {
      const response = await createDepositAddress({ address: proxyAddress });
      const address = extractDepositAddress(response, "evm") || extractAnyDepositAddress(response);
      setDepositResponse(response);
      setTransferAddress(address);

      if (!address) {
        setTransferError(locale === "zh" ? "未找到可用充值地址。" : "No deposit address returned.");
      }
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : locale === "zh"
            ? "创建转账地址失败。"
            : "Failed to create transfer address."
      );
    } finally {
      setIsCreatingTransferAddress(false);
    }
  };

  const goBack = () => {
    if (step === "home") return;
    if (step === "asset" || step === "transfer") setStep("home");
    if (step === "amount") setStep("asset");
    if (step === "confirm") setStep("amount");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[90vh] w-full max-w-[448px] flex-col rounded-t-3xl border-t border-white/10 mx-auto"
            style={{
              background: "linear-gradient(180deg, #151922 0%, #0d1118 100%)",
              boxShadow: "0 -20px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div className="w-full flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pb-7 overflow-y-auto">
              <div className="relative mb-6 flex items-center justify-center">
                {step !== "home" && (
                  <button
                    onClick={goBack}
                    className="absolute left-0 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}
                <div className="text-center">
                  <h2 className="text-xl font-black text-white">
                    {locale === "zh" ? "充值" : "Deposit"}
                  </h2>
                  <p className="text-xs text-white/40">
                    Polymarket {locale === "zh" ? "余额" : "Balance"}: ${Number(balanceUsd || 0).toFixed(2)}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="absolute right-0 flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {step === "home" && (
                <HomeStep
                  locale={locale}
                  walletLabel={walletLabel}
                  walletUsd={totalWalletUsd}
                  onWallet={() => setStep("asset")}
                  onTransfer={() => setStep("transfer")}
                />
              )}

              {step === "asset" && (
                <AssetStep
                  assets={assetsWithBalances}
                  assetsLoading={assetsLoading}
                  locale={locale}
                  onSelect={handleSelectAsset}
                />
              )}

              {step === "amount" && selectedAsset && (
                <AmountStep
                  amountUsd={amountUsd}
                  asset={selectedAsset}
                  error={quoteError}
                  estimatedSendAmount={estimatedSendAmount}
                  estimatedReceive={estimatedReceive}
                  isQuoting={isQuoting}
                  locale={locale}
                  onAmountChange={setAmountUsd}
                  onContinue={handleQuote}
                  onPercent={handlePercent}
                />
              )}

              {step === "confirm" && selectedAsset && (
                <ConfirmStep
                  amountUsd={amountUsd}
                  dlnStatus={dlnStatus.status}
                  error={executionError}
                  executionKind={executionKind}
                  executionStatusText={getExecutionStatusText({
                    bridgeStatus: transferStatus.latestStatus,
                    dlnStatus: dlnStatus.status,
                    executionKind,
                    isExecuting,
                    locale,
                    txHash: executionTxHash,
                  })}
                  executionTxHash={executionTxHash}
                  estimatedReceive={estimatedReceive}
                  estimatedSendAmount={estimatedSendAmount}
                  isExecuting={isExecuting}
                  isQuoting={isQuoting}
                  locale={locale}
                  onConfirm={handleConfirmOrder}
                  quote={quote}
                  walletLabel={walletLabel}
                />
              )}

              {step === "transfer" && (
                <TransferStep
                  copied={copied}
                  depositResponse={depositResponse}
                  error={transferError}
                  isCreating={isCreatingTransferAddress}
                  locale={locale}
                  onCopy={handleCopy}
                  onCreate={handleCreateTransferAddress}
                  statusText={getStatusText(locale, transferStatus.latestStatus)}
                  transferAddress={transferAddress}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function HomeStep({
  locale,
  walletLabel,
  walletUsd,
  onWallet,
  onTransfer,
}: {
  locale: string;
  walletLabel: string;
  walletUsd: number;
  onWallet: () => void;
  onTransfer: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/20 p-1">
        <div className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-3 text-sm font-black text-white">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">₿</span>
          Use Crypto
        </div>
        <div className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white/30">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">$</span>
          Use Cash
        </div>
      </div>

      <section>
        <p className="mb-2 text-sm font-bold text-white/45">Connected</p>
        <button
          onClick={onWallet}
          className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <Wallet className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">{walletLabel}</p>
              <p className="text-xs text-white/40">${walletUsd.toFixed(2)} • Instant</p>
            </div>
          </div>
          <ArrowRight className="text-white/30" size={18} />
        </button>
      </section>

      <section>
        <p className="mb-2 text-sm font-bold text-white/45">Other options</p>
        <button
          onClick={onTransfer}
          className="mb-2 flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all active:scale-[0.98] hover:bg-white/[0.06]"
        >
          <div className="flex items-center gap-3">
            <QrCode className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">Transfer Crypto</p>
              <p className="text-xs text-white/40">No limit • Instant</p>
            </div>
          </div>
          <span className="text-xs text-white/30">EVM • SOL • BTC</span>
        </button>
        <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-50">
          <div className="flex items-center gap-3">
            <Store className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">Connect Exchange</p>
              <p className="text-xs text-white/40">{locale === "zh" ? "暂不支持" : "Not supported yet"}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AssetStep({
  assets,
  assetsLoading,
  locale,
  onSelect,
}: {
  assets: DepositAsset[];
  assetsLoading: boolean;
  locale: string;
  onSelect: (asset: DepositAsset) => void;
}) {
  const displayAssets = sortVisibleAssets(assets).slice(0, 8);

  return (
    <div className="space-y-2">
      {assetsLoading && (
        <div className="flex items-center justify-center py-12 text-white/40">
          <Loader2 className="mr-2 animate-spin" size={18} />
          {locale === "zh" ? "正在加载资产..." : "Loading assets..."}
        </div>
      )}

      {!assetsLoading && displayAssets.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
          {locale === "zh" ? "暂无可用资产列表，请稍后重试。" : "No supported assets found. Please try again later."}
        </div>
      )}

      {displayAssets.map((asset) => {
        const balance = Number(asset.balance || 0);
        const usdValue = asset.usdValue ?? 0;
        const isLow = usdValue > 0 && usdValue < (asset.minCheckoutUsd ?? 1);
        return (
          <button
            key={asset.id}
            onClick={() => onSelect(asset)}
            className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.98] ${
              balance > 0
                ? "border-white/30 bg-white/[0.04] hover:bg-white/[0.07]"
                : "border-transparent bg-transparent opacity-55"
            }`}
          >
            <div className="flex items-center gap-3">
              <TokenIcon iconUrl={asset.iconUrl} symbol={asset.symbol} />
              <div>
                <p className="text-base font-black text-white">{asset.symbol}</p>
                <p className="text-xs text-white/40">
                  {formatCompactBalance(asset.balance)} {asset.symbol}
                </p>
              </div>
            </div>
            <div className="text-right">
              {isLow && <p className="text-xs text-white/25">Low Balance</p>}
              <p className="text-sm font-black text-white/80">${(asset.usdValue ?? 0).toFixed(2)}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function AmountStep({
  amountUsd,
  asset,
  error,
  estimatedSendAmount,
  estimatedReceive,
  isQuoting,
  locale,
  onAmountChange,
  onContinue,
  onPercent,
}: {
  amountUsd: string;
  asset: DepositAsset;
  error: string;
  estimatedSendAmount: string;
  estimatedReceive: string;
  isQuoting: boolean;
  locale: string;
  onAmountChange: (value: string) => void;
  onContinue: () => void;
  onPercent: (percent: number) => void;
}) {
  return (
    <div className="flex min-h-[520px] flex-col justify-between">
      <div>
        <div className="mt-16 flex justify-center">
          <div className="flex items-center text-6xl font-black text-white">
            <span>$</span>
            <input
              value={amountUsd}
              onChange={(event) => onAmountChange(event.target.value.replace(/[^\d.]/g, ""))}
              className="w-[180px] bg-transparent text-center outline-none"
              inputMode="decimal"
            />
          </div>
        </div>
        <div className="mt-10 flex justify-center gap-3">
          {[0.25, 0.5, 0.75, 1].map((percent) => (
            <button
              key={percent}
              onClick={() => onPercent(percent)}
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-black text-white active:scale-95"
            >
              {percent === 1 ? "Max" : `${Math.round(percent * 100)}%`}
            </button>
          ))}
        </div>
        {error && (
          <div className="mt-6 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-3 text-xs text-[#ffcad4]">
            {error}
          </div>
        )}
      </div>

      <div>
        <div className="mx-auto mb-9 flex w-fit items-center gap-4 rounded-full bg-white/10 px-4 py-3">
          <TokenIcon iconUrl={asset.iconUrl} symbol={asset.symbol} />
          <div>
            <p className="text-[10px] text-white/35">You send</p>
            <p className="text-xs font-black text-white">{estimatedSendAmount}</p>
          </div>
          <ArrowRight className="text-white/35" size={18} />
          <TokenIcon symbol="pUSD" />
          <div>
            <p className="text-[10px] text-white/35">You receive</p>
            <p className="text-xs font-black text-white">{estimatedReceive} pUSD</p>
          </div>
        </div>
        <button
          onClick={onContinue}
          disabled={isQuoting || Number(amountUsd || 0) <= 0}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#159bff] text-base font-black text-white active:scale-[0.98] disabled:opacity-50"
        >
          {isQuoting ? <Loader2 className="animate-spin" size={18} /> : locale === "zh" ? "继续" : "Continue"}
        </button>
      </div>
    </div>
  );
}

function ConfirmStep({
  amountUsd,
  dlnStatus,
  error,
  executionKind,
  executionStatusText,
  executionTxHash,
  estimatedReceive,
  estimatedSendAmount,
  isExecuting,
  isQuoting,
  locale,
  onConfirm,
  quote,
  walletLabel,
}: {
  amountUsd: string;
  dlnStatus?: string;
  error: string;
  executionKind: ExecutionKind;
  executionStatusText: string;
  executionTxHash: string;
  estimatedReceive: string;
  estimatedSendAmount: string;
  isExecuting: boolean;
  isQuoting: boolean;
  locale: string;
  onConfirm: () => void;
  quote: QuoteResponse | null;
  walletLabel: string;
}) {
  const fee = quote?.estFeeBreakdown;
  const hasSubmitted = Boolean(executionTxHash || dlnStatus);
  const buttonText = isExecuting
    ? locale === "zh" ? "等待钱包确认..." : "Waiting for wallet..."
    : hasSubmitted
      ? locale === "zh" ? "已提交" : "Submitted"
      : "Confirm Order";

  return (
    <div className="space-y-5">
      <div className="py-5 text-center text-6xl font-black text-white">
        ${Number(amountUsd || 0).toFixed(2)}
      </div>

      <InfoBox
        rows={[
          ["Source", walletLabel],
          ["Destination", "Polymarket Wallet"],
          ["Execution", getExecutionKindText(locale, executionKind)],
          ["Estimated time", formatMs(quote?.estCheckoutTimeMs)],
        ]}
      />

      <InfoBox
        rows={[
          ["You send", estimatedSendAmount],
          ["You receive", `${estimatedReceive} pUSD`],
        ]}
      />

      <div>
        <p className="mb-3 text-sm font-bold text-white/35">Transaction breakdown</p>
        <InfoBox
          rows={[
            ["Network cost", formatUsd(fee?.gasUsd)],
            ["Price impact", formatPercent(fee?.swapImpact)],
            ["Max slippage", fee?.maxSlippage === undefined ? "Auto" : `Auto • ${formatPercent(fee.maxSlippage)}`],
          ]}
        />
      </div>

      <div className="rounded-2xl bg-white/8 p-3 text-xs leading-relaxed text-white/60">
        {locale === "zh"
          ? "确认后会通过 deBridge 生成并提交预填交易，资金将发送到 Polymarket 的 EVM 充值地址并自动入账为 pUSD。钱包弹窗中的最终 gas 与发送金额为准。"
          : "Confirming creates a prefilled deBridge transaction to the Polymarket EVM deposit address. Final gas and sent amount are shown in your wallet."}
      </div>

      {(hasSubmitted || isExecuting) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/40">{locale === "zh" ? "执行状态" : "Execution status"}</span>
            <span className="font-black text-white">{executionStatusText}</span>
          </div>
          {executionTxHash && (
            <p className="mt-2 break-all font-mono text-[11px] text-white/35">
              {executionTxHash}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="flex gap-3 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#ff6b6b]" size={18} />
          <p className="text-xs leading-relaxed text-[#ffcad4]/80">{error}</p>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={isQuoting || isExecuting || hasSubmitted}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#159bff] text-base font-black text-white active:scale-[0.98] disabled:opacity-50"
      >
        {isExecuting ? <Loader2 className="animate-spin" size={18} /> : buttonText}
      </button>

      {hasSubmitted && (
        <div className="text-center text-xs text-white/35">
          {locale === "zh"
            ? "交易提交后请等待 deBridge 完成兑换，再等待 Polymarket 检测入账。"
            : "After submission, wait for deBridge fulfillment and Polymarket deposit detection."}
        </div>
      )}
    </div>
  );
}

function TransferStep({
  copied,
  depositResponse,
  error,
  isCreating,
  locale,
  onCopy,
  onCreate,
  statusText,
  transferAddress,
}: {
  copied: boolean;
  depositResponse: CreateDepositResponse | null;
  error: string;
  isCreating: boolean;
  locale: string;
  onCopy: (value: string) => void;
  onCreate: () => void;
  statusText: string;
  transferAddress: string;
}) {
  const note = typeof depositResponse?.note === "string" ? depositResponse.note : "";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-sm font-black text-white">Transfer Crypto</p>
        <p className="mt-1 text-xs leading-relaxed text-white/45">
          {locale === "zh"
            ? "这是 Polymarket 的备用手动转账路径：生成地址后，从外部钱包或交易所转入支持资产。"
            : "This is the fallback transfer flow: generate a deposit address, then send supported assets from another wallet or exchange."}
        </p>
        <button
          onClick={onCreate}
          disabled={isCreating}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ADFF2F] text-sm font-black text-[#0D0518] active:scale-[0.98] disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
          {transferAddress
            ? locale === "zh" ? "刷新地址" : "Refresh Address"
            : locale === "zh" ? "生成转账地址" : "Create Transfer Address"}
        </button>
      </div>

      {error && (
        <div className="flex gap-3 rounded-2xl border border-[#ff6b6b]/20 bg-[#ff6b6b]/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-[#ff6b6b]" size={18} />
          <p className="text-xs leading-relaxed text-[#ffcad4]/80">{error}</p>
        </div>
      )}

      {transferAddress && (
        <>
          <div className="flex flex-col items-center rounded-3xl border border-white/5 bg-white/5 p-6">
            <div className="mb-5 rounded-2xl bg-white p-3">
              <QRCode value={transferAddress} size={160} viewBox="0 0 160 160" />
            </div>
            <button
              onClick={() => onCopy(transferAddress)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-black/40 p-3 active:scale-[0.98]"
            >
              <span className="mr-3 break-all text-left font-mono text-[11px] text-white">
                {transferAddress}
              </span>
              {copied ? <CheckCircle2 className="text-green-400" size={18} /> : <Copy className="text-white/60" size={18} />}
            </button>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">{locale === "zh" ? "状态" : "Status"}</p>
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase text-white/60">
                {statusText}
              </span>
            </div>
            {note && <p className="mt-2 text-xs text-white/45">{note}</p>}
          </div>
        </>
      )}
    </div>
  );
}

function InfoBox({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      {rows.map(([label, value], index) => (
        <div
          key={label}
          className={`flex items-center justify-between px-4 py-3 text-sm ${
            index > 0 ? "border-t border-white/5" : ""
          }`}
        >
          <span className="text-white/40">{label}</span>
          <span className="font-black text-white">{value}</span>
        </div>
      ))}
    </div>
  );
}

function TokenIcon({ iconUrl, symbol }: { iconUrl?: string; symbol: string }) {
  const label = symbol.slice(0, 1).toUpperCase();
  const fallbackUrl = TOKEN_ICON_URLS[symbol.toUpperCase()];
  const imageUrl = iconUrl || fallbackUrl;

  if (imageUrl) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 shadow-[0_0_16px_rgba(99,125,255,0.25)]">
        <span
          aria-label={symbol}
          className="h-8 w-8 rounded-full bg-cover bg-center"
          role="img"
          style={{ backgroundImage: `url(${imageUrl})` }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#637dff] to-[#9c4dff] text-sm font-black text-white shadow-[0_0_16px_rgba(99,125,255,0.3)]">
      {label}
    </div>
  );
}

async function ensureEvmDepositAddress({
  existingAddress,
  onAddress,
  onResponse,
  proxyAddress,
}: {
  existingAddress: string;
  onAddress: (address: string) => void;
  onResponse: (response: CreateDepositResponse) => void;
  proxyAddress: string;
}): Promise<string> {
  if (ethers.utils.isAddress(existingAddress)) return existingAddress;
  if (!proxyAddress) throw new Error("Polymarket wallet is not ready.");

  const response = await createDepositAddress({ address: proxyAddress });
  const address = extractDepositAddress(response, "evm");
  onResponse(response);
  onAddress(address);

  if (!ethers.utils.isAddress(address)) {
    throw new Error("No valid EVM deposit address returned.");
  }

  return address;
}

async function getWalletEthereumProvider(wallet: unknown): Promise<Eip1193Provider> {
  const maybeWallet = wallet as {
    getEthereumProvider?: () => Promise<Eip1193Provider>;
  };

  if (!maybeWallet.getEthereumProvider) {
    throw new Error("Selected wallet does not expose an Ethereum provider.");
  }

  return maybeWallet.getEthereumProvider();
}

async function switchEvmChain(provider: Eip1193Provider, chainId: string) {
  const targetChainId = `0x${Number(chainId).toString(16)}`;
  const currentChainId = await provider.request({ method: "eth_chainId" });
  if (typeof currentChainId === "string" && currentChainId.toLowerCase() === targetChainId) {
    return;
  }

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainId }],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Please switch your wallet to chain ${chainId}. ${message}`);
  }
}

async function sendDirectErc20Transfer({
  amountBaseUnit,
  provider,
  recipient,
  tokenAddress,
}: {
  amountBaseUnit: string;
  provider: Eip1193Provider;
  recipient: string;
  tokenAddress: string;
}): Promise<string> {
  const signer = getEthersSigner(provider);
  const token = new ethers.Contract(tokenAddress, ERC20_EXECUTION_ABI, signer);
  const tx = await token.transfer(recipient, amountBaseUnit);
  const receipt = await tx.wait();
  return receipt.transactionHash ?? tx.hash;
}

async function approveDlnIfNeeded({
  amountBaseUnit,
  asset,
  owner,
  provider,
  tx,
}: {
  amountBaseUnit: string;
  asset: DepositAsset;
  owner: string;
  provider: Eip1193Provider;
  tx: ExecutionTx;
}) {
  if (asset.isNative) return;
  if (!ethers.utils.isAddress(asset.tokenAddress)) return;

  const spender = tx.allowanceTarget || tx.to;
  if (!ethers.utils.isAddress(spender)) {
    throw new Error("deBridge transaction did not include a valid spender.");
  }

  const signer = getEthersSigner(provider);
  const token = new ethers.Contract(asset.tokenAddress, ERC20_EXECUTION_ABI, signer);
  const allowance = await token.allowance(owner, spender);
  const amount = ethers.BigNumber.from(amountBaseUnit);
  if (allowance.gte(amount)) return;

  const approval = await token.approve(spender, amount);
  await approval.wait();
}

async function sendPreparedEvmTx(
  provider: Eip1193Provider,
  tx: ExecutionTx
): Promise<string> {
  const signer = getEthersSigner(provider);
  const response = await signer.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: ethers.BigNumber.from(tx.value || "0"),
  });
  const receipt = await response.wait();
  return receipt.transactionHash ?? response.hash;
}

function getEthersSigner(provider: Eip1193Provider) {
  return new ethers.providers.Web3Provider(
    provider as ethers.providers.ExternalProvider
  ).getSigner();
}

function isDirectPolygonStableDeposit(asset: DepositAsset): boolean {
  const address = asset.tokenAddress.toLowerCase();
  return (
    asset.chainId === String(POLYGON_CHAIN_ID) &&
    isStableLike(asset.symbol) &&
    (address === POLYGON_USDC_ADDRESS.toLowerCase() ||
      address === ADDRESSES.USDCe.toLowerCase())
  );
}

function toDlnTokenAddress(asset: DepositAsset): string {
  return asset.isNative ? ZERO_ADDRESS : asset.tokenAddress;
}

export function DepositDrawer(props: DepositDrawerProps) {
  if (typeof document === "undefined") return null;

  return createPortal(<DrawerContent {...props} />, document.body);
}

function normalizeSupportedAssets(data: unknown): DepositAsset[] {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const rawAssets = Array.isArray(record.supportedAssets)
    ? record.supportedAssets
    : Array.isArray(record.assets)
      ? record.assets
      : [];

  const normalized = rawAssets
    .map((item) => normalizeSupportedAsset(item as Record<string, unknown>))
    .filter((asset): asset is DepositAsset => Boolean(asset));

  if (normalized.length > 0) return sortPreferredAssets(normalized);

  return sortPreferredAssets([
    {
      id: "137-pol",
      chainId: String(POLYGON_CHAIN_ID),
      chainName: "Polygon",
      symbol: "POL",
      name: "Polygon",
      tokenAddress: ZERO_ADDRESS,
      iconUrl: TOKEN_ICON_URLS.POL,
      decimals: 18,
      isNative: true,
    },
    {
      id: "137-usdce",
      chainId: String(POLYGON_CHAIN_ID),
      chainName: "Polygon",
      symbol: "USDC.e",
      name: "Bridged USDC",
      tokenAddress: ADDRESSES.USDCe,
      iconUrl: TOKEN_ICON_URLS["USDC.E"],
      decimals: 6,
    },
  ]);
}

function normalizeSupportedAsset(item: Record<string, unknown>): DepositAsset | null {
  const token = item.token && typeof item.token === "object"
    ? item.token as Record<string, unknown>
    : item;
  const chainId = String(item.chainId ?? item.chain_id ?? "");
  const tokenAddress = String(token.address ?? token.tokenAddress ?? token.contractAddress ?? "");
  const symbol = String(token.symbol ?? "");
  const decimals = Number(token.decimals ?? 18);
  const iconUrl = getTokenIconUrl(item, token, symbol);

  if (!chainId || !tokenAddress || !symbol) return null;

  return {
    id: `${chainId}-${tokenAddress.toLowerCase()}-${symbol}`,
    chainId,
    chainName: String(item.chainName ?? item.network ?? `Chain ${chainId}`),
    symbol,
    name: String(token.name ?? symbol),
    tokenAddress,
    iconUrl,
    decimals: Number.isFinite(decimals) ? decimals : 18,
    minCheckoutUsd: toNumber(item.minCheckoutUsd),
    isNative: NATIVE_TOKEN_ADDRESSES.has(tokenAddress.toLowerCase()) || isNativeSymbol(symbol, chainId),
  };
}

function sortPreferredAssets(assets: DepositAsset[]): DepositAsset[] {
  const priority = ["ETH", "POL", "USDC.E", "USDC", "PUSD"];
  return [...assets].sort((a, b) => {
    const ap = priority.indexOf(a.symbol.toUpperCase());
    const bp = priority.indexOf(b.symbol.toUpperCase());
    return (ap === -1 ? 99 : ap) - (bp === -1 ? 99 : bp);
  });
}

function sortVisibleAssets(assets: DepositAsset[]): DepositAsset[] {
  const visibleAssets = assets
    .filter((asset) => isSupportedReadableChain(asset.chainId))
    .filter((asset) => Number(asset.balance || 0) > 0 || (asset.usdValue ?? 0) > 0.005);

  return dedupeAssetsBySymbol(visibleAssets)
    .sort((a, b) => {
      const aValue = a.usdValue ?? 0;
      const bValue = b.usdValue ?? 0;
      if (bValue !== aValue) return bValue - aValue;
      return sortPreferredAssets([a, b])[0].id === a.id ? -1 : 1;
    });
}

function dedupeAssetsBySymbol(assets: DepositAsset[]): DepositAsset[] {
  const bySymbol = new Map<string, DepositAsset>();

  for (const asset of assets) {
    const key = asset.symbol.toUpperCase();
    const existing = bySymbol.get(key);
    if (!existing || (asset.usdValue ?? 0) > (existing.usdValue ?? 0)) {
      bySymbol.set(key, asset);
    }
  }

  return [...bySymbol.values()];
}

async function readAssetBalance(
  asset: DepositAsset,
  walletAddress: string
): Promise<readonly [string, string]> {
  const rpcUrl = PUBLIC_RPC_URLS[asset.chainId];
  if (!rpcUrl || !walletAddress) return [asset.id, "0"] as const;

  try {
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    if (asset.isNative) {
      const balance = await provider.getBalance(walletAddress);
      return [asset.id, ethers.utils.formatUnits(balance, asset.decimals)] as const;
    }

    if (!ethers.utils.isAddress(asset.tokenAddress)) {
      return [asset.id, "0"] as const;
    }

    const contract = new ethers.Contract(asset.tokenAddress, ERC20_ABI, provider);
    const balance = await contract.balanceOf(walletAddress);
    return [asset.id, ethers.utils.formatUnits(balance, asset.decimals)] as const;
  } catch {
    return [asset.id, "0"] as const;
  }
}

function amountNumberToBaseUnit(amountUsd: number, decimals: number): string {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return "0";
  return ethers.utils.parseUnits(amountUsd.toFixed(Math.min(decimals, 6)), decimals).toString();
}

async function estimateBaseUnitForUsd({
  amountUsd,
  asset,
  proxyAddress,
}: {
  amountUsd: number;
  asset: DepositAsset;
  proxyAddress: string;
}): Promise<string> {
  if (isStableLike(asset.symbol)) {
    return amountNumberToBaseUnit(amountUsd, asset.decimals);
  }

  const oneTokenBaseUnit = ethers.utils.parseUnits("1", asset.decimals).toString();
  const unitQuote = await getBridgeQuote({
    fromAmountBaseUnit: oneTokenBaseUnit,
    fromChainId: asset.chainId,
    fromTokenAddress: asset.tokenAddress,
    recipientAddress: proxyAddress,
    toChainId: String(POLYGON_CHAIN_ID),
    toTokenAddress: PUSD_ADDRESS,
  });
  const unitUsd = unitQuote.estInputUsd || unitQuote.estOutputUsd || 0;
  if (!unitUsd) {
    return amountNumberToBaseUnit(amountUsd, asset.decimals);
  }

  return ethers.utils.parseUnits((amountUsd / unitUsd).toFixed(Math.min(asset.decimals, 8)), asset.decimals).toString();
}

function getPreQuoteSendLabel(amountUsd: number, asset: DepositAsset): string {
  if (isStableLike(asset.symbol)) return formatTokenAmount(amountUsd, asset.symbol);
  return `~$${amountUsd.toFixed(2)} ${asset.symbol}`;
}

function isStableLike(symbol: string): boolean {
  const normalized = symbol.toUpperCase();
  return normalized.includes("USDC") || normalized.includes("USDT") || normalized.includes("DAI") || normalized.includes("PUSD");
}

async function estimateUsdValue(
  asset: DepositAsset,
  balance?: string,
  proxyAddress?: string
): Promise<number> {
  const value = Number(balance || 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (isStableLike(asset.symbol)) return value;
  if (!proxyAddress) return 0;

  try {
    const oneTokenBaseUnit = ethers.utils.parseUnits("1", asset.decimals).toString();
    const quote = await getBridgeQuote({
      fromAmountBaseUnit: oneTokenBaseUnit,
      fromChainId: asset.chainId,
      fromTokenAddress: asset.tokenAddress,
      recipientAddress: proxyAddress,
      toChainId: String(POLYGON_CHAIN_ID),
      toTokenAddress: PUSD_ADDRESS,
    });
    const unitUsd = quote.estInputUsd || quote.estOutputUsd || 0;
    return unitUsd * value;
  } catch {
    return 0;
  }
}

function isSupportedReadableChain(chainId: string): boolean {
  return Boolean(PUBLIC_RPC_URLS[chainId]);
}

function isNativeSymbol(symbol: string, chainId: string): boolean {
  const normalized = symbol.toUpperCase();
  return (
    (chainId === "1" && normalized === "ETH") ||
    (chainId === String(POLYGON_CHAIN_ID) && normalized === "POL") ||
    (chainId === String(POLYGON_CHAIN_ID) && normalized === "MATIC") ||
    (chainId === "10" && normalized === "ETH") ||
    (chainId === "8453" && normalized === "ETH") ||
    (chainId === "42161" && normalized === "ETH") ||
    (chainId === "56" && normalized === "BNB")
  );
}

function getTokenIconUrl(
  item: Record<string, unknown>,
  token: Record<string, unknown>,
  symbol: string
): string | undefined {
  const candidates = [
    token.logoURI,
    token.logoUri,
    token.logoUrl,
    token.icon,
    token.image,
    item.logoURI,
    item.logoUri,
    item.logoUrl,
    item.icon,
    item.image,
  ];

  const fromApi = candidates.find(
    (value): value is string => typeof value === "string" && value.startsWith("http")
  );
  return fromApi || TOKEN_ICON_URLS[symbol.toUpperCase()];
}

function formatCompactBalance(balance?: string): string {
  const value = Number(balance || 0);
  if (!Number.isFinite(value)) return "0";
  if (value === 0) return "0";
  if (value < 0.0001) return "<0.0001";
  return value.toFixed(value < 1 ? 4 : 3);
}

function formatTokenAmount(amountUsd: number, symbol: string): string {
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return `0 ${symbol}`;
  return `${amountUsd.toFixed(symbol.toUpperCase().includes("USDC") ? 2 : 5)} ${symbol}`;
}

function formatUsd(value?: number): string {
  return value === undefined ? "-" : `$${value.toFixed(2)}`;
}

function formatPercent(value?: number): string {
  return value === undefined ? "-" : `${value.toFixed(2)}%`;
}

function formatMs(value?: number): string {
  if (!value) return "< 1 min";
  const minutes = Math.max(1, Math.ceil(value / 60_000));
  return minutes <= 1 ? "< 1 min" : `${minutes} min`;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function extractDepositAddress(
  response: CreateDepositResponse,
  addressType: BridgeAddressType
): string {
  const record = response as Record<string, unknown>;
  const nested = record.address ?? record.depositAddresses ?? record.addresses;

  if (nested && typeof nested === "object") {
    const address = (nested as DepositAddressMap)[addressType];
    if (typeof address === "string") return address;
  }

  const direct = record[addressType] ?? record[`${addressType}Address`];
  return typeof direct === "string" ? direct : "";
}

function extractAnyDepositAddress(response: CreateDepositResponse): string {
  for (const addressType of ADDRESS_TYPES) {
    const address = extractDepositAddress(response, addressType);
    if (address) return address;
  }
  return "";
}

function getStatusText(locale: string, status?: string): string {
  const zh = locale === "zh";
  switch (status) {
    case "DEPOSIT_DETECTED":
      return zh ? "已检测" : "Detected";
    case "PROCESSING":
      return zh ? "处理中" : "Processing";
    case "ORIGIN_TX_CONFIRMED":
      return zh ? "源链已确认" : "Origin Confirmed";
    case "SUBMITTED":
      return zh ? "已提交" : "Submitted";
    case "COMPLETED":
      return zh ? "已到账" : "Completed";
    case "FAILED":
      return zh ? "失败" : "Failed";
    default:
      return zh ? "等待转账" : "Waiting";
  }
}

function getExecutionKindText(locale: string, kind: ExecutionKind): string {
  const zh = locale === "zh";
  switch (kind) {
    case "direct":
      return zh ? "Polygon 稳定币直转" : "Polygon stablecoin transfer";
    case "same-chain":
      return zh ? "deBridge 同链兑换" : "deBridge same-chain swap";
    case "cross-chain":
      return zh ? "deBridge 跨链兑换" : "deBridge cross-chain swap";
    default:
      return zh ? "连接钱包充值" : "Connected wallet deposit";
  }
}

function getExecutionStatusText({
  bridgeStatus,
  dlnStatus,
  executionKind,
  isExecuting,
  locale,
  txHash,
}: {
  bridgeStatus?: string;
  dlnStatus?: string;
  executionKind: ExecutionKind;
  isExecuting: boolean;
  locale: string;
  txHash: string;
}): string {
  const zh = locale === "zh";
  if (isExecuting) return zh ? "等待钱包确认" : "Waiting for wallet";
  if (bridgeStatus === "COMPLETED") return zh ? "已入账" : "Deposited";
  if (bridgeStatus) return getStatusText(locale, bridgeStatus);
  if (dlnStatus === "ClaimedUnlock") return zh ? "兑换完成，等待入账" : "Swap fulfilled, waiting deposit";
  if (dlnStatus) return getDlnStatusText(locale, dlnStatus);
  if (txHash && executionKind === "direct") return zh ? "转账已提交" : "Transfer submitted";
  if (txHash) return zh ? "订单已提交" : "Order submitted";
  return zh ? "等待确认" : "Ready";
}

function getDlnStatusText(locale: string, status?: string): string {
  const zh = locale === "zh";
  switch (status) {
    case "Created":
      return zh ? "订单已创建" : "Order created";
    case "Fulfilled":
      return zh ? "目标链已兑付" : "Fulfilled";
    case "SentUnlock":
      return zh ? "解锁中" : "Unlock sent";
    case "ClaimedUnlock":
      return zh ? "已完成" : "Completed";
    case "SentOrderCancel":
      return zh ? "取消中" : "Cancel sent";
    case "OrderCancelled":
    case "ClaimedOrderCancel":
      return zh ? "已取消" : "Cancelled";
    default:
      return zh ? "处理中" : "Processing";
  }
}
