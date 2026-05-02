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
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createDepositAddress, useBridgeStatus, useSupportedAssets } from "@/hooks/useBridge";
import { getDlnCancelTx, useDlnOrderStatus } from "@/hooks/useDln";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { shortenAddress } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import type { CreateDepositResponse } from "@/types/bridge";
import type {
  DepositAsset,
  DepositDrawerProps,
  ExecutionKind,
  ExecutionSnapshot,
  FlowStep,
} from "./deposit/types";
import { CONNECTED_LOW_BALANCE_USD, QUOTE_STALE_THRESHOLD_MS, TOKEN_ICON_URLS } from "./deposit/constants";
import { ensureEvmDepositAddress, extractAnyDepositAddress, extractDepositAddress } from "./deposit/addresses";
import {
  estimateUsdValue,
  normalizeSupportedAssets,
  readAssetBalance,
  sortVisibleAssets,
} from "./deposit/assets";
import { approveErc20IfNeeded, getWalletEthereumProvider, sendPreparedEvmTx, switchEvmChain } from "./deposit/evm";
import { buildExecutionSnapshot, isQuotePriceChanged, validateDepositSelection } from "./deposit/execution";
import { formatExecutionError } from "./deposit/errors";
import { formatCompactBalance, formatMs, formatPercent, formatUsd } from "./deposit/format";
import { getExecutionKindText, getExecutionStatusText, getStatusText } from "./deposit/status";

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
  const [amountUsd, setAmountUsd] = useState("10.00");
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
  const amountNumber = parseAmountUsd(amountUsd);
  const selectedUsdValue = selectedAsset ? assetUsdValues[selectedAsset.id] : undefined;
  const hasSubmittedTx = Boolean(executionTxHash || submittedOrderId);

  const transferStatus = useBridgeStatus(transferAddress, Boolean(transferAddress && isOpen));
  const dlnStatus = useDlnOrderStatus(submittedOrderId, Boolean(submittedOrderId && isOpen));

  useEffect(() => {
    if (!isOpen) return;
    quoteRequestRef.current += 1;
    setStep("home");
    setSelectedAsset(null);
    setAmountUsd("10.00");
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
            ? "\u62a5\u4ef7\u5df2\u81ea\u52a8\u5237\u65b0\uff0c\u8bf7\u786e\u8ba4\u5f53\u524d\u4ef7\u683c\u540e\u518d\u63d0\u4ea4\u3002"
            : "Quote refreshed automatically. Please review the current price before submitting.");
        }
      } catch {
        if (quoteRequestRef.current === requestId) {
          setQuoteWarning(locale === "zh"
            ? "\u62a5\u4ef7\u53ef\u80fd\u5df2\u8fc7\u671f\uff0c\u63d0\u4ea4\u65f6\u4f1a\u518d\u6b21\u5237\u65b0\u3002"
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
    setAmountUsd(formatAmountUsdInput(value * percent));
  };

  const handleAmountChange = (value: string) => {
    setAmountUsd(sanitizeAmountUsdInput(value));
  };

  const handleAmountBlur = () => {
    if (!amountUsd) return;
    setAmountUsd(formatAmountUsdInput(amountNumber));
  };

  const handleQuote = useCallback(async () => {
    if (!selectedAsset || !proxyAddress || amountNumber < 1) return;
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
      setExecutionError(locale === "zh" ? "\u94b1\u5305\u6216\u62a5\u4ef7\u5c1a\u672a\u5c31\u7eea\uff0c\u8bf7\u8fd4\u56de\u91cd\u8bd5\u3002" : "Wallet or quote is not ready. Please go back and retry.");
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
            ? "\u62a5\u4ef7\u6b63\u5728\u5237\u65b0\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002"
            : "Quote is still refreshing. Please retry shortly.");
          return;
        }
        const priceChanged = isQuotePriceChanged(activeSnapshot, refreshed);
        setSnapshot(refreshed);
        activeSnapshot = refreshed;
        if (priceChanged) {
          setQuoteWarning(locale === "zh"
            ? "\u62a5\u4ef7\u5df2\u66f4\u65b0\u4e14\u4ef7\u683c\u53d8\u5316\u8d85\u8fc7 1%\uff0c\u8bf7\u786e\u8ba4\u65b0\u4ef7\u683c\u540e\u518d\u6b21\u63d0\u4ea4\u3002"
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
      setTransferError(locale === "zh" ? "Polymarket \u94b1\u5305\u5c1a\u672a\u5c31\u7eea\u3002" : "Polymarket wallet is not ready.");
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
        setTransferError(locale === "zh" ? "\u672a\u627e\u5230\u53ef\u7528\u5145\u503c\u5730\u5740\u3002" : "No deposit address returned.");
      }
    } catch (error) {
      setTransferError(
        error instanceof Error
          ? error.message
          : locale === "zh"
            ? "\u521b\u5efa\u8f6c\u8d26\u5730\u5740\u5931\u8d25\u3002"
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
                    {locale === "zh" ? "\u5145\u503c" : "Deposit"}
                  </h2>
                  <p className="text-xs text-white/40">
                    Polymarket {locale === "zh" ? "\u4f59\u989d" : "Balance"}: ${Number(balanceUsd || 0).toFixed(2)}
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
                  isQuoting={isQuoting}
                  locale={locale}
                  onAmountBlur={handleAmountBlur}
                  onAmountChange={handleAmountChange}
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
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">{"\u20bf"}</span>
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
                ${walletUsd.toFixed(2)} {"\u2022"} {locale === "zh" ? "\u5373\u65f6" : "Instant"}
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
                {locale === "zh" ? "\u4e0d\u9650 \u2022 \u5373\u65f6" : "No limit \u2022 Instant"}
              </p>
            </div>
          </div>
          <span className="text-xs text-white/30">{"EVM \u2022 SOL \u2022 BTC"}</span>
        </button>
        <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4 opacity-50">
          <div className="flex items-center gap-3">
            <Store className="text-white/70" size={24} />
            <div>
              <p className="text-sm font-black text-white">Connect Exchange</p>
              <p className="text-xs text-white/40">{locale === "zh" ? "\u6682\u4e0d\u652f\u6301" : "Not supported yet"}</p>
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
          {locale === "zh" ? "\u6b63\u5728\u52a0\u8f7d\u8d44\u4ea7..." : "Loading assets..."}
        </div>
      )}

      {!assetsLoading && displayAssets.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/50">
          {locale === "zh" ? "\u6682\u65e0\u53ef\u7528\u8d44\u4ea7\u5217\u8868\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002" : "No supported assets found. Please try again later."}
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
  isQuoting,
  locale,
  onAmountBlur,
  onAmountChange,
  onContinue,
  onPercent,
}: {
  amountUsd: string;
  asset: DepositAsset;
  error: string;
  isQuoting: boolean;
  locale: string;
  onAmountBlur: () => void;
  onAmountChange: (value: string) => void;
  onContinue: () => void;
  onPercent: (percent: number) => void;
}) {
  const amountNumber = parseAmountUsd(amountUsd);
  const isAmountTooLow = amountNumber < 1;
  const amountInputWidth = `${Math.max(amountUsd.length || 1, 1)}ch`;

  return (
    <div className="flex min-h-[520px] flex-col justify-between">
      <div>
        <div className="mt-16 flex justify-center">
          <div className="inline-flex items-center justify-center text-6xl font-black text-white">
            <span>$</span>
            <input
              value={amountUsd}
              onBlur={onAmountBlur}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="0"
              style={{ width: amountInputWidth }}
              className="min-w-[1ch] max-w-[360px] bg-transparent text-left text-6xl font-black text-white outline-none placeholder:text-white/35"
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

      <div className="pb-5">
        <div className="mx-auto mb-7 flex w-fit items-center gap-4 rounded-full bg-white/10 px-4 py-3">
          <TokenIcon iconUrl={asset.iconUrl} symbol={asset.symbol} />
          <div>
            <p className="text-[10px] text-white/35">You send</p>
            <p className="text-xs font-black text-white">{asset.symbol}</p>
          </div>
          <ArrowRight className="text-white/35" size={18} />
          <TokenIcon symbol="pUSD" />
          <div>
            <p className="text-[10px] text-white/35">You receive</p>
            <p className="text-xs font-black text-white">pUSD</p>
          </div>
        </div>
        <button
          onClick={onContinue}
          disabled={isQuoting || isAmountTooLow}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-[#159bff] text-base font-black text-white active:scale-[0.98] disabled:opacity-50"
        >
          {isQuoting ? <Loader2 className="animate-spin" size={18} /> : locale === "zh" ? "\u7ee7\u7eed" : "Continue"}
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
    ? locale === "zh" ? "\u7b49\u5f85\u94b1\u5305\u786e\u8ba4..." : "Waiting for wallet..."
    : hasSubmittedTx
      ? locale === "zh" ? "\u5df2\u63d0\u4ea4" : "Submitted"
      : locale === "zh" ? "\u786e\u8ba4\u8ba2\u5355" : "Confirm Order";

  const slippageText =
    snapshot.slippage === undefined
      ? "Auto"
      : `Auto \u2022 ${formatPercent(snapshot.slippage)}`;

  const sendUsdText = snapshot.sendUsd !== undefined
    ? ` \u2248 ${formatUsd(snapshot.sendUsd)}`
    : "";
  const receiveUsdText = snapshot.receiveUsd !== undefined
    ? ` \u2248 ${formatUsd(snapshot.receiveUsd)}`
    : "";

  const fixedFeeText = snapshot.fixedFeeDisplay
    ? `${snapshot.fixedFeeDisplay}${snapshot.fixedFeeUsd === undefined ? "" : ` \u2248 ${formatUsd(snapshot.fixedFeeUsd)}`}`
    : "-";
  const walletTotalText = snapshot.walletTotalDisplay
    ? `${snapshot.walletTotalDisplay}${snapshot.walletTotalUsd === undefined ? "" : ` \u2248 ${formatUsd(snapshot.walletTotalUsd)}`}`
    : "-";
  const youSendText = snapshot.fixedFeeDisplay ? walletTotalText : `${snapshot.sendDisplay}${sendUsdText}`;
  const walletPromptText = snapshot.asset.isNative
    ? (locale === "zh"
        ? `You send \u5305\u542b\u4e0b\u65b9\u7684 deBridge fixed fee\uff0c\u94b1\u5305\u5f39\u7a97\u53ef\u80fd\u663e\u793a ${walletTotalText}\u3002`
        : `You send includes the deBridge fixed fee below. Your wallet may prompt ${walletTotalText}.`)
    : snapshot.kind === "direct"
      ? (locale === "zh"
          ? `\u94b1\u5305\u5c06\u5f39\u51fa\u4e00\u7b14 ${snapshot.sendDisplay}${sendUsdText} \u7684 ERC20 \u8f6c\u8d26\uff0c\u4e0e\u4e0a\u65b9"You send"\u5b8c\u5168\u4e00\u81f4\u3002`
          : `Your wallet will prompt for an ERC20 transfer of ${snapshot.sendDisplay}${sendUsdText}, matching "You send" exactly.`)
      : (locale === "zh"
          ? `You send \u5305\u542b\u4e0b\u65b9\u7684 deBridge fixed fee\uff0c\u94b1\u5305\u5f39\u7a97\u53ef\u80fd\u663e\u793a ${walletTotalText}\u3002`
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
            ["Quote refresh", locale === "zh" ? `\u6bcf ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s \u81ea\u52a8\u5237\u65b0` : `Auto every ${Math.round(QUOTE_STALE_THRESHOLD_MS / 1000)}s`],
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
            <span className="text-white/40">{locale === "zh" ? "\u6267\u884c\u72b6\u6001" : "Execution status"}</span>
            <span className="font-black text-white">{executionStatusText}</span>
          </div>
          {executionTxHash && (
            <p className="mt-2 break-all font-mono text-[11px] text-white/35">
              {executionTxHash}
            </p>
          )}
          {cancelTxHash && (
            <p className="mt-2 break-all font-mono text-[11px] text-[#ADFF2F]/70">
              {locale === "zh" ? "\u9000\u6b3e\u4ea4\u6613\uff1a" : "Refund tx:"} {cancelTxHash}
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
            ? "\u4ea4\u6613\u63d0\u4ea4\u540e\u8bf7\u7b49\u5f85 deBridge \u5b8c\u6210\u5151\u6362\uff0c\u518d\u7b49\u5f85 Polymarket \u68c0\u6d4b\u5165\u8d26\u3002"
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
              ? locale === "zh" ? "\u9000\u6b3e\u4ea4\u6613\u5df2\u63d0\u4ea4" : "Refund submitted"
              : locale === "zh" ? "\u53d6\u6d88\u8ba2\u5355\u5e76\u9000\u6b3e" : "Cancel order and refund"}
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
            ? "\u8fd9\u662f Polymarket \u7684\u5907\u7528\u624b\u52a8\u8f6c\u8d26\u8def\u5f84\uff1a\u751f\u6210\u5730\u5740\u540e\uff0c\u4ece\u5916\u90e8\u94b1\u5305\u6216\u4ea4\u6613\u6240\u8f6c\u5165\u652f\u6301\u8d44\u4ea7\u3002\u6700\u4f4e\u91d1\u989d\u4e25\u683c\u9075\u5faa supported-assets\u3002"
            : "This is the fallback transfer flow for wallets or exchanges. Minimums strictly follow supported-assets."}
        </p>
        <button
          onClick={onCreate}
          disabled={isCreating}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#ADFF2F] text-sm font-black text-[#0D0518] active:scale-[0.98] disabled:opacity-50"
        >
          {isCreating ? <Loader2 className="animate-spin" size={16} /> : <QrCode size={16} />}
          {transferAddress
            ? locale === "zh" ? "\u5237\u65b0\u5730\u5740" : "Refresh Address"
            : locale === "zh" ? "\u751f\u6210\u8f6c\u8d26\u5730\u5740" : "Create Transfer Address"}
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
              <p className="text-sm font-bold text-white">{locale === "zh" ? "\u72b6\u6001" : "Status"}</p>
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

function sanitizeAmountUsdInput(value: string): string {
  const normalized = value.replace(/,/g, "").replace(/[^\d.]/g, "");
  const [integerPart = "", ...decimalParts] = normalized.split(".");
  const decimalPart = decimalParts.join("").slice(0, 2);
  const trimmedInteger = integerPart.replace(/^0+(?=\d)/, "");
  const nextInteger = trimmedInteger || (integerPart ? "0" : "");
  const formattedInteger = nextInteger
    ? Number(nextInteger).toLocaleString("en-US")
    : "";

  if (normalized.includes(".")) {
    return (formattedInteger || "0") + "." + decimalPart;
  }

  return formattedInteger;
}

function parseAmountUsd(value: string): number {
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function formatAmountUsdInput(value: number): string {
  const normalized = Number.isFinite(value) && value >= 0 ? value : 0;
  return normalized.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DepositDrawer(props: DepositDrawerProps) {
  if (typeof document === "undefined") return null;

  return createPortal(<DrawerContent {...props} />, document.body);
}

