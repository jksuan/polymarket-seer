import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  getDlnCancelTx,
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
} from "@/types/bridge";
import type {
  DlnQuoteResponse,
  DlnSameChainSwapResponse,
  DlnTx,
} from "@/types/dln";

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
type ExecutionSnapshot = {
  kind: Exclude<ExecutionKind, "idle">;
  asset: DepositAsset;
  amountUsd: number;
  sourceAmountBaseUnit: string;
  sendBaseUnit: string;
  sendAmountFloat: number;
  sendDisplay: string;
  sendUsd?: number;
  receiveBaseUnit: string;
  receiveDecimals: number;
  receiveDisplay: string;
  receiveUsd?: number;
  networkCostUsd?: number;
  routeCostUsd?: number;
  priceImpact?: number;
  slippage?: number;
  estCheckoutTimeMs?: number;
  recipientAddress: string;
  tx: ExecutionTx;
  approveSpender?: string;
  fixedFeeDisplay?: string;
  fixedFeeUsd?: number;
  walletTotalDisplay?: string;
  walletTotalUsd?: number;
  orderId?: string;
  quotedAtMs: number;
  expiresAtMs: number;
};

const PUSD_ADDRESS = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
const POLYGON_USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const ADDRESS_TYPES: BridgeAddressType[] = ["evm", "svm", "btc", "tvm"];
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const QUOTE_STALE_THRESHOLD_MS = 45_000;
const QUOTE_PRICE_CHANGE_THRESHOLD = 0.01;
const CONNECTED_LOW_BALANCE_USD = 1;
const SUPPORTED_DLN_EVM_CHAIN_IDS = new Set(["1", "10", "56", "137", "8453", "42161"]);
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
  const [snapshot, setSnapshot] = useState<ExecutionSnapshot | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoteWarning, setQuoteWarning] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [executionKind, setExecutionKind] = useState<ExecutionKind>("idle");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [executionTxHash, setExecutionTxHash] = useState("");
  const [submittedOrderId, setSubmittedOrderId] = useState("");
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancelTxHash, setCancelTxHash] = useState("");
  const [depositResponse, setDepositResponse] = useState<CreateDepositResponse | null>(null);
  const [transferAddress, setTransferAddress] = useState("");
  const [isCreatingTransferAddress, setIsCreatingTransferAddress] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [copied, setCopied] = useState(false);
  const [assetBalances, setAssetBalances] = useState<Record<string, string>>({});
  const [assetUsdValues, setAssetUsdValues] = useState<Record<string, number>>({});
  const [hasRefreshedBalance, setHasRefreshedBalance] = useState(false);
  const quoteRequestRef = useRef(0);
  const isExecutingRef = useRef(false);

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
  const previewSendDisplay = selectedAsset
    ? getPreQuoteSendLabel(amountNumber, selectedAsset)
    : "-";
  const previewReceiveDisplay = amountNumber > 0 ? amountNumber.toFixed(4) : "0.0000";
  const hasSubmittedTx = Boolean(executionTxHash || submittedOrderId);

  const transferStatus = useBridgeStatus(transferAddress, Boolean(transferAddress && isOpen));
  const dlnStatus = useDlnOrderStatus(submittedOrderId, Boolean(submittedOrderId && isOpen));

  useEffect(() => {
    if (!isOpen) return;
    quoteRequestRef.current += 1;
    setStep("home");
    setSelectedAsset(null);
    setSnapshot(null);
    setQuoteError("");
    setQuoteWarning("");
    setExecutionKind("idle");
    setIsExecuting(false);
    isExecutingRef.current = false;
    setExecutionError("");
    setExecutionTxHash("");
    setSubmittedOrderId("");
    setIsCancellingOrder(false);
    setCancelTxHash("");
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

  useEffect(() => {
    if (step !== "confirm" || !snapshot || isExecuting || hasSubmittedTx) {
      return;
    }

    const remain = snapshot.expiresAtMs - Date.now();
    const delay = Math.max(1_000, remain);

    const timeout = window.setTimeout(async () => {
      if (isExecutingRef.current) return;
      const requestId = ++quoteRequestRef.current;
      try {
        const depositAddress = await ensureEvmDepositAddress({
          existingAddress: transferAddress,
          onAddress: setTransferAddress,
          onResponse: setDepositResponse,
          proxyAddress,
        });
        const next = await buildExecutionSnapshot({
          amountUsd: snapshot.amountUsd,
          asset: snapshot.asset,
          depositAddress,
          proxyAddress,
          walletAddress,
        });
        if (quoteRequestRef.current !== requestId) return;
        if (isExecutingRef.current) return;
        const priceChanged = isQuotePriceChanged(snapshot, next);
        setSnapshot(next);
        if (priceChanged) {
          setQuoteWarning(locale === "zh"
            ? "报价已自动刷新，请确认当前价格后再提交。"
            : "Quote refreshed automatically. Please review the current price before submitting.");
        }
      } catch {
        if (quoteRequestRef.current === requestId) {
          setQuoteWarning(locale === "zh"
            ? "报价可能已过期，提交时会再次刷新。"
            : "Quote may be stale. It will refresh again before submission.");
        }
      }
    }, delay);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasSubmittedTx, isExecuting, locale, proxyAddress, snapshot, step, transferAddress, walletAddress]);

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
    quoteRequestRef.current += 1;
    setSelectedAsset(asset);
    setSnapshot(null);
    setQuoteError("");
    setQuoteWarning("");
    setExecutionKind("idle");
    setExecutionError("");
    setExecutionTxHash("");
    setSubmittedOrderId("");
    setCancelTxHash("");
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
    const requestId = ++quoteRequestRef.current;
    setIsQuoting(true);
    setQuoteError("");
    setQuoteWarning("");

    try {
      const validationError = validateDepositSelection({
        amountUsd: amountNumber,
        asset: selectedAsset,
        locale,
      });
      if (validationError) {
        if (quoteRequestRef.current !== requestId) return;
        setQuoteError(validationError);
        return;
      }

      const depositAddress = await ensureEvmDepositAddress({
        existingAddress: transferAddress,
        onAddress: setTransferAddress,
        onResponse: setDepositResponse,
        proxyAddress,
      });
      const next = await buildExecutionSnapshot({
        amountUsd: amountNumber,
        asset: selectedAsset,
        depositAddress,
        proxyAddress,
        walletAddress,
      });
      if (quoteRequestRef.current !== requestId) return;
      setSnapshot(next);
      setStep("confirm");
    } catch (error) {
      if (quoteRequestRef.current !== requestId) return;
      setQuoteError(formatExecutionError(error, locale, "quote"));
    } finally {
      if (quoteRequestRef.current === requestId) {
        setIsQuoting(false);
      }
    }
  }, [amountNumber, locale, proxyAddress, selectedAsset, transferAddress, walletAddress]);

  const handleConfirmOrder = useCallback(async () => {
    if (!selectedAsset || !activeWallet || !walletAddress || !snapshot) {
      setExecutionError(locale === "zh" ? "钱包或报价尚未就绪，请返回重试。" : "Wallet or quote is not ready. Please go back and retry.");
      return;
    }

    isExecutingRef.current = true;
    quoteRequestRef.current += 1;
    setIsExecuting(true);
    setExecutionError("");
    setQuoteWarning("");
    setExecutionTxHash("");
    setSubmittedOrderId("");
    setCancelTxHash("");
    setHasRefreshedBalance(false);

    try {
      const validationError = validateDepositSelection({
        amountUsd: snapshot.amountUsd,
        asset: snapshot.asset,
        locale,
      });
      if (validationError) {
        setExecutionError(validationError);
        return;
      }

      let activeSnapshot = snapshot;
      const isStale = Date.now() >= activeSnapshot.expiresAtMs;
      if (isStale) {
        const requestId = ++quoteRequestRef.current;
        const depositAddress = await ensureEvmDepositAddress({
          existingAddress: transferAddress,
          onAddress: setTransferAddress,
          onResponse: setDepositResponse,
          proxyAddress,
        });
        const refreshed = await buildExecutionSnapshot({
          amountUsd: activeSnapshot.amountUsd,
          asset: activeSnapshot.asset,
          depositAddress,
          proxyAddress,
          walletAddress,
        });
        if (quoteRequestRef.current !== requestId) {
          setExecutionError(locale === "zh"
            ? "报价正在刷新，请稍后再试。"
            : "Quote is still refreshing. Please retry shortly.");
          return;
        }
        const priceChanged = isQuotePriceChanged(activeSnapshot, refreshed);
        setSnapshot(refreshed);
        activeSnapshot = refreshed;
        if (priceChanged) {
          setQuoteWarning(locale === "zh"
            ? "报价已更新且价格变化超过 1%，请确认新价格后再次提交。"
            : "Quote updated by more than 1%. Please review the new quote and confirm again.");
          return;
        }
      }

      const ethereumProvider = await getWalletEthereumProvider(activeWallet);
      await switchEvmChain(ethereumProvider, activeSnapshot.asset.chainId);

      setExecutionKind(activeSnapshot.kind);

      if (activeSnapshot.kind !== "direct" && activeSnapshot.approveSpender && !activeSnapshot.asset.isNative) {
        await approveErc20IfNeeded({
          amountBaseUnit: activeSnapshot.sourceAmountBaseUnit,
          asset: activeSnapshot.asset,
          owner: walletAddress,
          provider: ethereumProvider,
          spender: activeSnapshot.approveSpender,
        });
      }

      // #region agent log
      debugDlnDeposit("H1,H2,H4,H5", "pre wallet send", {
        amountUsd: activeSnapshot.amountUsd,
        asset: {
          symbol: activeSnapshot.asset.symbol,
          chainId: activeSnapshot.asset.chainId,
          isNative: activeSnapshot.asset.isNative,
        },
        kind: activeSnapshot.kind,
        sourceAmountBaseUnit: activeSnapshot.sourceAmountBaseUnit,
        sendDisplay: activeSnapshot.sendDisplay,
        fixedFeeDisplay: activeSnapshot.fixedFeeDisplay,
        walletTotalDisplay: activeSnapshot.walletTotalDisplay,
        txValueBaseUnit: activeSnapshot.tx.value,
        txValueDisplay: formatTxValueForDebug(activeSnapshot.tx.value, activeSnapshot.asset),
        txDataSelector: activeSnapshot.tx.data?.slice(0, 10),
      });
      // #endregion

      const txHash = await sendPreparedEvmTx(ethereumProvider, activeSnapshot.tx);
      setExecutionTxHash(txHash);
      if (activeSnapshot.orderId) {
        setSubmittedOrderId(activeSnapshot.orderId);
      }
    } catch (error) {
      setExecutionError(formatExecutionError(error, locale, "execute"));
      setExecutionKind("idle");
    } finally {
      isExecutingRef.current = false;
      setIsExecuting(false);
    }
  }, [
    activeWallet,
    locale,
    proxyAddress,
    selectedAsset,
    snapshot,
    transferAddress,
    walletAddress,
  ]);

  const handleCancelDlnOrder = useCallback(async () => {
    if (!submittedOrderId || !activeWallet) return;
    setIsCancellingOrder(true);
    setExecutionError("");

    try {
      const cancelTx = await getDlnCancelTx(submittedOrderId);
      const ethereumProvider = await getWalletEthereumProvider(activeWallet);
      await switchEvmChain(ethereumProvider, String(cancelTx.chainId));
      const txHash = await sendPreparedEvmTx(ethereumProvider, cancelTx);
      setCancelTxHash(txHash);
    } catch (error) {
      setExecutionError(formatExecutionError(error, locale, "cancel"));
    } finally {
      setIsCancellingOrder(false);
    }
  }, [activeWallet, locale, submittedOrderId]);

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
                  estimatedSendAmount={previewSendDisplay}
                  estimatedReceive={previewReceiveDisplay}
                  isQuoting={isQuoting}
                  locale={locale}
                  onAmountChange={setAmountUsd}
                  onContinue={handleQuote}
                  onPercent={handlePercent}
                />
              )}

              {step === "confirm" && selectedAsset && snapshot && (
                <ConfirmStep
                  cancelTxHash={cancelTxHash}
                  dlnStatus={dlnStatus.status}
                  error={executionError}
                  executionStatusText={getExecutionStatusText({
                    bridgeStatus: transferStatus.latestStatus,
                    dlnStatus: dlnStatus.status,
                    executionKind,
                    isExecuting,
                    locale,
                    txHash: executionTxHash,
                  })}
                  executionTxHash={executionTxHash}
                  hasSubmittedTx={hasSubmittedTx}
                  isExecuting={isExecuting}
                  isQuoting={isQuoting}
                  isCancellingOrder={isCancellingOrder}
                  locale={locale}
                  onCancelOrder={handleCancelDlnOrder}
                  onConfirm={handleConfirmOrder}
                  quoteWarning={quoteWarning}
                  snapshot={snapshot}
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
              <p className="text-xs text-white/40">
                ${walletUsd.toFixed(2)} • {locale === "zh" ? "按实时路由校验" : "Route-checked"}
              </p>
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
              <p className="text-xs text-white/40">
                {locale === "zh" ? "最低金额按支持资产表" : "Minimums from supported assets"}
              </p>
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
        const isLow = usdValue > 0 && usdValue < CONNECTED_LOW_BALANCE_USD;
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
  cancelTxHash,
  dlnStatus,
  error,
  executionStatusText,
  executionTxHash,
  hasSubmittedTx,
  isCancellingOrder,
  isExecuting,
  isQuoting,
  locale,
  onCancelOrder,
  onConfirm,
  quoteWarning,
  snapshot,
  walletLabel,
}: {
  cancelTxHash: string;
  dlnStatus?: string;
  error: string;
  executionStatusText: string;
  executionTxHash: string;
  hasSubmittedTx: boolean;
  isCancellingOrder: boolean;
  isExecuting: boolean;
  isQuoting: boolean;
  locale: string;
  onCancelOrder: () => void;
  onConfirm: () => void;
  quoteWarning: string;
  snapshot: ExecutionSnapshot;
  walletLabel: string;
}) {
  const canCancel = Boolean(
    dlnStatus &&
    !["ClaimedUnlock", "OrderCancelled", "ClaimedOrderCancel"].includes(dlnStatus)
  );
  const buttonText = isExecuting
    ? locale === "zh" ? "等待钱包确认..." : "Waiting for wallet..."
    : hasSubmittedTx
      ? locale === "zh" ? "已提交" : "Submitted"
      : locale === "zh" ? "确认订单" : "Confirm Order";

  const slippageText =
    snapshot.slippage === undefined
      ? "Auto"
      : `Auto • ${formatPercent(snapshot.slippage)}`;

  const sendUsdText = snapshot.sendUsd !== undefined
    ? ` ≈ ${formatUsd(snapshot.sendUsd)}`
    : "";
  const receiveUsdText = snapshot.receiveUsd !== undefined
    ? ` ≈ ${formatUsd(snapshot.receiveUsd)}`
    : "";

  const fixedFeeText = snapshot.fixedFeeDisplay
    ? `${snapshot.fixedFeeDisplay}${snapshot.fixedFeeUsd === undefined ? "" : ` ≈ ${formatUsd(snapshot.fixedFeeUsd)}`}`
    : "-";
  const walletTotalText = snapshot.walletTotalDisplay
    ? `${snapshot.walletTotalDisplay}${snapshot.walletTotalUsd === undefined ? "" : ` ≈ ${formatUsd(snapshot.walletTotalUsd)}`}`
    : "-";
  const youSendText = snapshot.fixedFeeDisplay ? walletTotalText : `${snapshot.sendDisplay}${sendUsdText}`;
  const walletPromptText = snapshot.asset.isNative
    ? (locale === "zh"
        ? `You send 包含下方的 deBridge fixed fee，钱包弹窗可能显示 ${walletTotalText}。`
        : `You send includes the deBridge fixed fee below. Your wallet may prompt ${walletTotalText}.`)
    : snapshot.kind === "direct"
      ? (locale === "zh"
          ? `钱包将弹出一笔 ${snapshot.sendDisplay}${sendUsdText} 的 ERC20 转账，与上方"You send"完全一致。`
          : `Your wallet will prompt for an ERC20 transfer of ${snapshot.sendDisplay}${sendUsdText}, matching "You send" exactly.`)
      : (locale === "zh"
          ? `You send 包含下方的 deBridge fixed fee，钱包弹窗可能显示 ${walletTotalText}。`
          : `You send includes the deBridge fixed fee below. Your wallet may prompt ${walletTotalText}.`);

  return (
    <div className="space-y-5">
      <div className="py-5 text-center text-6xl font-black text-white">
        ${snapshot.amountUsd.toFixed(2)}
      </div>

      <InfoBox
        rows={[
          ["Source", walletLabel],
          ["Destination", "Polymarket Wallet"],
          ["Execution", getExecutionKindText(locale, snapshot.kind)],
          ["Estimated time", formatMs(snapshot.estCheckoutTimeMs)],
        ]}
      />

      <InfoBox
        rows={[
          ["You send", youSendText],
          ["You receive", `${snapshot.receiveDisplay} pUSD${receiveUsdText}`],
        ]}
      />

      <div className="rounded-2xl bg-white/8 p-3 text-xs leading-relaxed text-white/60">
        {walletPromptText}
      </div>

      <div>
        <p className="mb-3 text-sm font-bold text-white/35">Transaction breakdown</p>
        <InfoBox
          rows={[
            ["Network cost", formatUsd(snapshot.networkCostUsd)],
            ["deBridge fixed fee", fixedFeeText],
            ["Route cost", formatUsd(snapshot.routeCostUsd)],
            ["Price impact", formatPercent(snapshot.priceImpact)],
            ["Max slippage", slippageText],
            ["Wallet total", walletTotalText],
            ["Quote refresh", locale === "zh" ? `每 ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s 自动刷新` : `Auto every ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s`],
          ]}
        />
      </div>

      {quoteWarning && (
        <div className="rounded-2xl border border-[#ffd166]/20 bg-[#ffd166]/10 p-4 text-xs leading-relaxed text-[#ffe6a6]">
          {quoteWarning}
        </div>
      )}

      {(hasSubmittedTx || isExecuting) && (
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
          {cancelTxHash && (
            <p className="mt-2 break-all font-mono text-[11px] text-[#ADFF2F]/70">
              {locale === "zh" ? "退款交易：" : "Refund tx:"} {cancelTxHash}
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
        disabled={isQuoting || isExecuting || hasSubmittedTx}
        className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#159bff] text-base font-black text-white active:scale-[0.98] disabled:opacity-50"
      >
        {isExecuting ? <Loader2 className="animate-spin" size={18} /> : buttonText}
      </button>

      {hasSubmittedTx && (
        <div className="text-center text-xs text-white/35">
          {locale === "zh"
            ? "交易提交后请等待 deBridge 完成兑换，再等待 Polymarket 检测入账。"
            : "After submission, wait for deBridge fulfillment and Polymarket deposit detection."}
        </div>
      )}

      {canCancel && (
        <button
          onClick={onCancelOrder}
          disabled={isCancellingOrder || Boolean(cancelTxHash)}
          className="flex h-12 w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-black text-white/70 active:scale-[0.98] disabled:opacity-50"
        >
          {isCancellingOrder
            ? <Loader2 className="animate-spin" size={16} />
            : cancelTxHash
              ? locale === "zh" ? "退款交易已提交" : "Refund submitted"
              : locale === "zh" ? "取消订单并退款" : "Cancel order and refund"}
        </button>
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
            ? "这是 Polymarket 的备用手动转账路径：生成地址后，从外部钱包或交易所转入支持资产。最低金额严格遵循 supported-assets。"
            : "This is the fallback transfer flow for wallets or exchanges. Minimums strictly follow supported-assets."}
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

function buildErc20TransferTx(
  tokenAddress: string,
  recipient: string,
  amountBaseUnit: string
): ExecutionTx {
  const iface = new ethers.utils.Interface(ERC20_EXECUTION_ABI);
  const data = iface.encodeFunctionData("transfer", [recipient, amountBaseUnit]);
  return { to: tokenAddress, data, value: "0" };
}

async function approveErc20IfNeeded({
  amountBaseUnit,
  asset,
  owner,
  provider,
  spender,
}: {
  amountBaseUnit: string;
  asset: DepositAsset;
  owner: string;
  provider: Eip1193Provider;
  spender: string;
}) {
  if (asset.isNative) return;
  if (!ethers.utils.isAddress(asset.tokenAddress)) return;
  if (!ethers.utils.isAddress(spender)) {
    throw new Error("deBridge transaction did not include a valid spender.");
  }

  const signer = getEthersSigner(provider);
  const token = new ethers.Contract(asset.tokenAddress, ERC20_EXECUTION_ABI, signer);
  const allowance = await token.allowance(owner, spender);
  const amount = ethers.BigNumber.from(amountBaseUnit);
  if (allowance.gte(amount)) return;

  // #region agent log
  debugDlnDeposit("H3", "approval transaction requested", {
    asset: { symbol: asset.symbol, chainId: asset.chainId, isNative: asset.isNative },
    amountBaseUnit,
    spenderPresent: Boolean(spender),
  });
  // #endregion

  const approval = await token.approve(spender, amount);
  await approval.wait();
}

async function sendPreparedEvmTx(
  provider: Eip1193Provider,
  tx: ExecutionTx
): Promise<string> {
  const valueBn = ethers.BigNumber.from(tx.value || "0");
  const valueHex = ethers.utils.hexlify(valueBn);

  // #region agent log
  debugDlnDeposit("H5", "sendTransaction params", {
    txValueBaseUnit: tx.value || "0",
    valueHex,
    txToPresent: Boolean(tx.to),
    txDataSelector: tx.data?.slice(0, 10),
  }, "post-fix");
  // #endregion

  const web3Provider = new ethers.providers.Web3Provider(
    provider as ethers.providers.ExternalProvider
  );
  const signer = web3Provider.getSigner();
  const from = await signer.getAddress();

  const populated = await signer.populateTransaction({
    to: tx.to,
    data: tx.data,
    value: valueBn,
  });
  // #region agent log
  debugDlnDeposit("H6", "populateTransaction result", {
    inputValueBaseUnit: valueBn.toString(),
    populatedValueBaseUnit: populated.value?.toString(),
    populatedValueHex: populated.value === undefined ? "" : ethers.utils.hexlify(populated.value),
  }, "post-fix");
  // #endregion

  const walletRequest = {
    from,
    to: tx.to,
    data: tx.data,
    value: valueHex,
  };

  // #region agent log
  debugDlnDeposit("H8", "eth_sendTransaction request object", {
    request: walletRequest,
    valueBaseUnit: valueBn.toString(),
    dataLength: walletRequest.data?.length ?? 0,
    dataSelector: walletRequest.data?.slice(0, 10),
  }, "wallet-request");
  // #endregion

  const txHash = (await web3Provider.send("eth_sendTransaction", [walletRequest])) as string;

  // #region agent log
  debugDlnDeposit("H7", "eth_sendTransaction returned", { txHash }, "post-fix");
  // #endregion

  const receipt = await web3Provider.waitForTransaction(txHash);
  return receipt.transactionHash ?? txHash;
}

function getEthersSigner(provider: Eip1193Provider) {
  return new ethers.providers.Web3Provider(
    provider as ethers.providers.ExternalProvider
  ).getSigner();
}

function debugDlnDeposit(
  hypothesisId: string,
  message: string,
  data: Record<string, unknown>,
  runId = "pre-fix"
) {
  if (process.env.NODE_ENV === "production") return;
  fetch("http://127.0.0.1:7579/ingest/5b001da7-2a74-4b5f-8879-8c097e24c7ba", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "fbd18a",
    },
    body: JSON.stringify({
      sessionId: "fbd18a",
      runId,
      hypothesisId,
      location: "src/components/ui/DepositDrawer.tsx",
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

function formatTxValueForDebug(value: string | undefined, asset: DepositAsset): string {
  try {
    return `${ethers.utils.formatUnits(value || "0", asset.decimals)} ${asset.symbol}`;
  } catch {
    return "unformattable";
  }
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

async function buildExecutionSnapshot({
  amountUsd,
  asset,
  depositAddress,
  proxyAddress,
  walletAddress,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  proxyAddress: string;
  walletAddress: string;
}): Promise<ExecutionSnapshot> {
  const sourceAmountBaseUnit = await estimateBaseUnitForUsd({
    amountUsd,
    asset,
    proxyAddress,
  });
  if (!sourceAmountBaseUnit || sourceAmountBaseUnit === "0") {
    throw new Error("Source amount could not be estimated. Please retry.");
  }
  const quotedAtMs = Date.now();
  const expiresAtMs = quotedAtMs + QUOTE_STALE_THRESHOLD_MS;

  if (isDirectPolygonStableDeposit(asset)) {
    return buildDirectSnapshot({
      amountUsd,
      asset,
      depositAddress,
      sourceAmountBaseUnit,
      quotedAtMs,
      expiresAtMs,
    });
  }

  if (asset.chainId === String(POLYGON_CHAIN_ID)) {
    const swap = await getDlnSameChainSwap({
      chainId: asset.chainId,
      tokenIn: toDlnTokenAddress(asset),
      tokenInAmount: sourceAmountBaseUnit,
      tokenOut: POLYGON_USDC_ADDRESS,
      tokenOutRecipient: depositAddress,
      senderAddress: walletAddress,
      slippage: "auto",
    });
    return snapshotFromSameChainSwap({
      amountUsd,
      asset,
      depositAddress,
      sourceAmountBaseUnit,
      swap,
      quotedAtMs,
      expiresAtMs,
    });
  }

  const dlnQuote = await getDlnQuote({
    srcChainId: asset.chainId,
    srcChainTokenIn: toDlnTokenAddress(asset),
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
  return snapshotFromDlnQuote({
    amountUsd,
    asset,
    depositAddress,
    sourceAmountBaseUnit,
    dlnQuote,
    quotedAtMs,
    expiresAtMs,
  });
}

function buildDirectSnapshot({
  amountUsd,
  asset,
  depositAddress,
  sourceAmountBaseUnit,
  quotedAtMs,
  expiresAtMs,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  sourceAmountBaseUnit: string;
  quotedAtMs: number;
  expiresAtMs: number;
}): ExecutionSnapshot {
  const tx = buildErc20TransferTx(asset.tokenAddress, depositAddress, sourceAmountBaseUnit);
  const sendFloat = Number(ethers.utils.formatUnits(sourceAmountBaseUnit, asset.decimals));

  return {
    kind: "direct",
    asset,
    amountUsd,
    sourceAmountBaseUnit,
    sendBaseUnit: sourceAmountBaseUnit,
    sendAmountFloat: sendFloat,
    sendDisplay: `${formatCompactBalance(String(sendFloat))} ${asset.symbol}`,
    sendUsd: amountUsd,
    receiveBaseUnit: sourceAmountBaseUnit,
    receiveDecimals: asset.decimals,
    receiveDisplay: sendFloat.toFixed(4),
    receiveUsd: amountUsd,
    networkCostUsd: undefined,
    routeCostUsd: 0,
    priceImpact: 0,
    slippage: 0,
    estCheckoutTimeMs: 60_000,
    recipientAddress: depositAddress,
    tx,
    approveSpender: undefined,
    fixedFeeDisplay: undefined,
    fixedFeeUsd: undefined,
    walletTotalDisplay: `${formatCompactBalance(String(sendFloat))} ${asset.symbol}`,
    walletTotalUsd: amountUsd,
    orderId: undefined,
    quotedAtMs,
    expiresAtMs,
  };
}

function snapshotFromDlnQuote({
  amountUsd,
  asset,
  depositAddress,
  sourceAmountBaseUnit,
  dlnQuote,
  quotedAtMs,
  expiresAtMs,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  sourceAmountBaseUnit: string;
  dlnQuote: DlnQuoteResponse;
  quotedAtMs: number;
  expiresAtMs: number;
}): ExecutionSnapshot {
  const tx: ExecutionTx = {
    to: dlnQuote.tx.to,
    data: dlnQuote.tx.data,
    value: dlnQuote.tx.value || "0",
    allowanceTarget: (dlnQuote.tx as ExecutionTx).allowanceTarget,
  };
  const srcIn = dlnQuote.estimation.srcChainTokenIn;
  const srcAmountFloat = Number(ethers.utils.formatUnits(srcIn.amount, asset.decimals));
  const txValueFloat = Number(ethers.utils.formatUnits(tx.value, asset.decimals));
  const sendBaseUnit = asset.isNative ? tx.value : srcIn.amount;
  const sendAmountFloat = asset.isNative ? txValueFloat : srcAmountFloat;
  const unitUsd = srcAmountFloat > 0 && srcIn.approximateUsdValue
    ? srcIn.approximateUsdValue / srcAmountFloat
    : 0;
  const sendUsd = unitUsd > 0 ? sendAmountFloat * unitUsd : srcIn.approximateUsdValue;
  const dst = dlnQuote.estimation.dstChainTokenOut;
  const receiveDecimals = dst.decimals ?? 6;
  const receiveFloat = Number(ethers.utils.formatUnits(dst.amount, receiveDecimals));
  const fixedFee = getFixedFeeBreakdown({
    asset,
    fixedFeeBaseUnit: dlnQuote.fixFee,
    unitUsd,
  });
  const sendDisplay = `${formatCompactBalance(String(sendAmountFloat))} ${asset.symbol}`;
  const routeCostUsd = computeRouteCostUsd(srcIn.approximateUsdValue, dst.approximateUsdValue);

  // #region agent log
  debugDlnDeposit("H1,H2,H4", "dln quote snapshot built", {
    amountUsd,
    asset: { symbol: asset.symbol, chainId: asset.chainId, isNative: asset.isNative },
    sourceAmountBaseUnit,
    srcAmountBaseUnit: srcIn.amount,
    srcApproxUsd: srcIn.approximateUsdValue,
    fixedFeeBaseUnit: dlnQuote.fixFee,
    fixedFeeDisplay: fixedFee.display,
    txValueBaseUnit: tx.value,
    txValueDisplay: formatTxValueForDebug(tx.value, asset),
    sendBaseUnit,
    sendDisplay,
    walletTotalDisplay: asset.isNative
      ? `${formatCompactBalance(String(txValueFloat))} ${asset.symbol}`
      : fixedFee.display
        ? `${sendDisplay} + ${fixedFee.display}`
        : sendDisplay,
  });
  // #endregion

  return {
    kind: "cross-chain",
    asset,
    amountUsd,
    sourceAmountBaseUnit,
    sendBaseUnit,
    sendAmountFloat,
    sendDisplay,
    sendUsd,
    receiveBaseUnit: dst.amount,
    receiveDecimals,
    receiveDisplay: receiveFloat.toFixed(4),
    receiveUsd: dst.approximateUsdValue,
    networkCostUsd: dlnQuote.estimatedTransactionFee?.approximateUsdValue,
    routeCostUsd,
    priceImpact: typeof dlnQuote.usdPriceImpact === "number" ? Math.abs(dlnQuote.usdPriceImpact) : undefined,
    slippage: dlnQuote.estimation.recommendedSlippage,
    estCheckoutTimeMs: dlnQuote.order?.approximateFulfillmentDelay
      ? dlnQuote.order.approximateFulfillmentDelay * 1000
      : undefined,
    recipientAddress: depositAddress,
    tx,
    approveSpender: tx.allowanceTarget || tx.to,
    fixedFeeDisplay: fixedFee.display,
    fixedFeeUsd: fixedFee.usd,
    walletTotalDisplay: asset.isNative
      ? `${formatCompactBalance(String(txValueFloat))} ${asset.symbol}`
      : fixedFee.display
        ? `${sendDisplay} + ${fixedFee.display}`
        : sendDisplay,
    walletTotalUsd: asset.isNative && unitUsd > 0 ? txValueFloat * unitUsd : undefined,
    orderId: dlnQuote.orderId,
    quotedAtMs,
    expiresAtMs,
  };
}

function snapshotFromSameChainSwap({
  amountUsd,
  asset,
  depositAddress,
  sourceAmountBaseUnit,
  swap,
  quotedAtMs,
  expiresAtMs,
}: {
  amountUsd: number;
  asset: DepositAsset;
  depositAddress: string;
  sourceAmountBaseUnit: string;
  swap: DlnSameChainSwapResponse;
  quotedAtMs: number;
  expiresAtMs: number;
}): ExecutionSnapshot {
  const tx: ExecutionTx = {
    to: swap.tx.to,
    data: swap.tx.data,
    value: swap.tx.value || "0",
    allowanceTarget: (swap.tx as ExecutionTx).allowanceTarget,
  };
  const srcAmountFloat = Number(ethers.utils.formatUnits(swap.tokenIn.amount, asset.decimals));
  const txValueFloat = Number(ethers.utils.formatUnits(tx.value, asset.decimals));
  const sendBaseUnit = asset.isNative ? tx.value : swap.tokenIn.amount;
  const sendAmountFloat = asset.isNative ? txValueFloat : srcAmountFloat;
  const unitUsd = srcAmountFloat > 0 && swap.tokenIn.approximateUsdValue
    ? swap.tokenIn.approximateUsdValue / srcAmountFloat
    : 0;
  const sendUsd = unitUsd > 0 ? sendAmountFloat * unitUsd : swap.tokenIn.approximateUsdValue;
  const receiveDecimals = swap.tokenOut.decimals ?? 6;
  const receiveFloat = Number(ethers.utils.formatUnits(swap.tokenOut.amount, receiveDecimals));
  const routeCostUsd = computeRouteCostUsd(swap.tokenIn.approximateUsdValue, swap.tokenOut.approximateUsdValue);
  const sendDisplay = `${formatCompactBalance(String(sendAmountFloat))} ${asset.symbol}`;

  // #region agent log
  debugDlnDeposit("H1,H4", "same-chain snapshot built", {
    amountUsd,
    asset: { symbol: asset.symbol, chainId: asset.chainId, isNative: asset.isNative },
    sourceAmountBaseUnit,
    tokenInAmount: swap.tokenIn.amount,
    tokenInApproxUsd: swap.tokenIn.approximateUsdValue,
    txValueBaseUnit: tx.value,
    txValueDisplay: formatTxValueForDebug(tx.value, asset),
    sendBaseUnit,
    sendDisplay,
  });
  // #endregion

  return {
    kind: "same-chain",
    asset,
    amountUsd,
    sourceAmountBaseUnit,
    sendBaseUnit,
    sendAmountFloat,
    sendDisplay,
    sendUsd,
    receiveBaseUnit: swap.tokenOut.amount,
    receiveDecimals,
    receiveDisplay: receiveFloat.toFixed(4),
    receiveUsd: swap.tokenOut.approximateUsdValue,
    networkCostUsd: swap.estimatedTransactionFee?.approximateUsdValue,
    routeCostUsd,
    priceImpact: getBestAggregatorPriceDrop(swap),
    slippage: swap.recommendedSlippage ?? swap.slippage,
    estCheckoutTimeMs: undefined,
    recipientAddress: depositAddress,
    tx,
    approveSpender: tx.allowanceTarget || tx.to,
    fixedFeeDisplay: undefined,
    fixedFeeUsd: undefined,
    walletTotalDisplay: asset.isNative
      ? `${formatCompactBalance(String(txValueFloat))} ${asset.symbol}`
      : sendDisplay,
    walletTotalUsd: asset.isNative && unitUsd > 0 ? txValueFloat * unitUsd : undefined,
    orderId: undefined,
    quotedAtMs,
    expiresAtMs,
  };
}

function getFixedFeeBreakdown({
  asset,
  fixedFeeBaseUnit,
  unitUsd,
}: {
  asset: DepositAsset;
  fixedFeeBaseUnit?: string;
  unitUsd: number;
}): { display?: string; usd?: number } {
  if (!fixedFeeBaseUnit || Number(fixedFeeBaseUnit) <= 0) return {};

  const decimals = asset.isNative ? asset.decimals : 18;
  const symbol = asset.isNative ? asset.symbol : getNativeFeeSymbol(asset.chainId);
  const feeFloat = Number(ethers.utils.formatUnits(fixedFeeBaseUnit, decimals));
  const usd = asset.isNative && unitUsd > 0 ? feeFloat * unitUsd : undefined;

  return {
    display: `${formatCompactBalance(String(feeFloat))} ${symbol}`,
    usd,
  };
}

function computeRouteCostUsd(inputUsd?: number, outputUsd?: number): number | undefined {
  if (inputUsd === undefined || outputUsd === undefined) return undefined;
  const diff = inputUsd - outputUsd;
  return diff > 0 ? diff : 0;
}

function getBestAggregatorPriceDrop(swap: DlnSameChainSwapResponse): number | undefined {
  const best = swap.comparedAggregators?.[0];
  return best?.priceDrop;
}

function isQuotePriceChanged(prev: ExecutionSnapshot, next: ExecutionSnapshot): boolean {
  const prevReceive = prev.receiveUsd ?? Number(prev.receiveDisplay);
  const nextReceive = next.receiveUsd ?? Number(next.receiveDisplay);
  if (!Number.isFinite(prevReceive) || !Number.isFinite(nextReceive) || prevReceive <= 0) {
    return false;
  }
  return Math.abs(nextReceive - prevReceive) / prevReceive > QUOTE_PRICE_CHANGE_THRESHOLD;
}

function validateDepositSelection({
  amountUsd,
  asset,
  locale,
}: {
  amountUsd: number;
  asset: DepositAsset;
  locale: string;
}): string | null {
  const zh = locale === "zh";
  if (!SUPPORTED_DLN_EVM_CHAIN_IDS.has(asset.chainId)) {
    return zh
      ? "当前 Connected Wallet 暂只支持 EVM 链资产；Solana、Tron、Bitcoin 请先使用 Transfer Crypto。"
      : "Connected Wallet currently supports EVM assets only. Use Transfer Crypto for Solana, Tron, or Bitcoin.";
  }

  const availableUsd = asset.usdValue ?? 0;
  if (availableUsd > 0 && amountUsd > availableUsd * 1.01) {
    return zh
      ? "输入金额超过当前钱包可用余额。"
      : "Amount exceeds the available wallet balance.";
  }

  return null;
}


function formatExecutionError(
  error: unknown,
  locale: string,
  fallback: "quote" | "execute" | "cancel"
): string {
  const zh = locale === "zh";
  const raw = extractErrorText(error);
  const upper = raw.toUpperCase();

  if (upper.includes("USER_REJECTED") || upper.includes("USER DENIED") || upper.includes("REJECTED")) {
    return zh ? "用户已取消钱包操作。" : "Wallet request was rejected.";
  }
  if (upper.includes("ERROR_LOW_GIVE_AMOUNT") || upper.includes("LOW_GIVE") || upper.includes("MINIMUM")) {
    return zh ? "金额低于 deBridge 当前路线的最低要求，请提高金额后重试。" : "Amount is below the current deBridge route minimum. Increase the amount and retry.";
  }
  if (upper.includes("IMPOSSIBLE_ROUTE")) {
    return zh ? "当前链和资产没有可用的 deBridge 路线。" : "No deBridge route is currently available for this chain and asset.";
  }
  if (upper.includes("UNSUPPORTED_TOKEN_IN") || upper.includes("UNSUPPORTED_TOKEN_OUT")) {
    return zh ? "当前资产暂不支持一键充值，请改用 Transfer Crypto。" : "This asset is not supported for one-click deposit. Use Transfer Crypto instead.";
  }
  if (upper.includes("ESTIMATION_FAILED")) {
    return zh ? "交易估算失败，请稍后重试或降低金额。" : "Transaction estimation failed. Try again later or lower the amount.";
  }
  if (upper.includes("INSUFFICIENT") || upper.includes("NOT ENOUGH")) {
    return zh ? "钱包余额不足，无法覆盖金额或 gas。" : "Insufficient wallet balance for the amount or gas.";
  }
  if (upper.includes("UNKNOWN_ORDER")) {
    return zh ? "未找到该 deBridge 订单，可能尚未被索引。" : "deBridge order was not found yet. It may still be indexing.";
  }
  if (upper.includes("ORDER_ALREADY_FULFILLED")) {
    return zh ? "该订单已完成，不能取消退款。" : "This order has already been fulfilled and cannot be cancelled.";
  }

  if (raw) return raw;

  if (fallback === "quote") {
    return zh ? "获取报价失败，请稍后重试。" : "Failed to get a quote. Please try again.";
  }
  if (fallback === "cancel") {
    return zh ? "生成或提交退款交易失败。" : "Failed to create or submit the refund transaction.";
  }
  return zh ? "确认订单失败，请稍后重试。" : "Failed to confirm order. Please try again.";
}

function extractErrorText(error: unknown): string {
  if (error instanceof Error) {
    const details = "details" in error ? (error as { details?: unknown }).details : undefined;
    return [error.message, stringifyErrorDetails(details)].filter(Boolean).join(" ");
  }
  return String(error ?? "");
}

function stringifyErrorDetails(details: unknown): string {
  if (!details) return "";
  if (typeof details === "string") return details;
  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
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

function getNativeFeeSymbol(chainId: string): string {
  if (chainId === "56") return "BNB";
  if (chainId === String(POLYGON_CHAIN_ID)) return "POL";
  return "ETH";
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
