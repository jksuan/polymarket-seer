import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";
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
import { MAX_DEPOSIT_BALANCE_RATIO } from "./deposit/constants";
import { ensureEvmDepositAddress, extractAnyDepositAddress, extractDepositAddress } from "./deposit/addresses";
import {
  estimateUsdValue,
  normalizeSupportedAssets,
  readAssetBalance,
} from "./deposit/assets";
import { approveErc20IfNeeded, getWalletEthereumProvider, sendPreparedEvmTx, switchEvmChain } from "./deposit/evm";
import { buildExecutionSnapshot, isQuotePriceChanged, validateDepositSelection } from "./deposit/execution";
import { formatExecutionError } from "./deposit/errors";
import { formatAmountUsdInput, parseAmountUsd, sanitizeAmountUsdInput } from "./deposit/format";
import { getExecutionStatusText, getStatusText } from "./deposit/status";
import { AmountStep, AssetStep, ConfirmStep, HomeStep, TransferStep } from "./deposit/steps";

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
    const nextAmount = percent === 1
      ? value * MAX_DEPOSIT_BALANCE_RATIO
      : value * percent;
    setAmountUsd(formatAmountUsdInput(nextAmount));
  };

  const handleAmountChange = (value: string) => {
    setAmountUsd(sanitizeAmountUsdInput(value));
  };

  const handleAmountBlur = () => {
    if (!amountUsd) return;
    setAmountUsd(formatAmountUsdInput(amountNumber));
  };

  const handleQuote = useCallback(async () => {
    const maxDepositUsd = Number(selectedUsdValue ?? 0) * MAX_DEPOSIT_BALANCE_RATIO;
    if (!selectedAsset || !proxyAddress || amountNumber < 1 || amountNumber > maxDepositUsd + 0.01) return;
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
  }, [amountNumber, locale, proxyAddress, selectedAsset, selectedUsdValue, transferAddress, walletAddress]);

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

export function DepositDrawer(props: DepositDrawerProps) {
  if (typeof document === "undefined") return null;

  return createPortal(<DrawerContent {...props} />, document.body);
}

