"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  createWithdrawAddress,
  getBridgeQuote,
  useBridgeStatus,
  useSupportedAssets,
} from "@/hooks/useBridge";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { extractDepositAddress } from "@/components/ui/deposit/addresses";
import { isEmailOrSocialLogin } from "@/components/ui/deposit/connected/loginIdentity";
import {
  formatAmountUsdInput,
  parseAmountUsd,
  sanitizeAmountUsdInput,
  toNumber,
} from "@/components/ui/deposit/format";
import type { CreateWithdrawResponse } from "@/types/bridge";
import {
  POLYGON_CHAIN_ID,
  PUSD_ADDRESS,
  PUSD_DECIMALS,
  QUOTE_DEBOUNCE_MS,
} from "./constants";
import { executePusdWithdrawTransfer } from "./executePusdWithdraw";
import type { WithdrawDestinationAsset, WithdrawQuoteState } from "./types";
import { resolveRecipientAddressType } from "./recipientAddressType";
import { isValidWithdrawRecipient, validateWithdrawAmountUsd, validateWithdrawRecipient } from "./validation";
import {
  assetsForChain,
  buildWithdrawDestinationAssets,
  getDefaultWithdrawAsset,
  groupChains,
} from "./withdrawAssets";

export function useWithdrawDrawerController({
  isOpen,
  proxyAddress,
  balanceUsd,
  locale,
  onBalanceRefresh,
  onClose,
}: {
  isOpen: boolean;
  proxyAddress: string;
  balanceUsd: string;
  locale: string;
  onBalanceRefresh: () => void;
  onClose: () => void;
}) {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const { stickyExternalWalletClientType } = usePolymarketAuth();
  const { data: supportedAssets, isLoading: assetsLoading } = useSupportedAssets();

  const [recipientAddr, setRecipientAddr] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [selectedChainId, setSelectedChainId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [fundsTermsOpen, setFundsTermsOpen] = useState(false);
  const [quote, setQuote] = useState<WithdrawQuoteState | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [bridgePollAddress, setBridgePollAddress] = useState<string | null>(null);

  const quoteRequestRef = useRef(0);
  const isExecutingRef = useRef(false);

  const activeWallet = useMemo(
    () =>
      selectPrimaryWallet(wallets, user?.wallet?.address, {
        stickyClientType: stickyExternalWalletClientType,
      }),
    [wallets, user?.wallet?.address, stickyExternalWalletClientType]
  );

  const destinationAssets = useMemo(
    () => buildWithdrawDestinationAssets(supportedAssets),
    [supportedAssets]
  );

  const chainOptions = useMemo(
    () => groupChains(destinationAssets),
    [destinationAssets]
  );

  const selectedAsset = useMemo((): WithdrawDestinationAsset | null => {
    const found = destinationAssets.find((a) => a.id === selectedAssetId);
    if (found) return found;
    return getDefaultWithdrawAsset(destinationAssets);
  }, [destinationAssets, selectedAssetId]);

  const tokenOptions = useMemo(() => {
    const chainId = selectedChainId || selectedAsset?.chainId || "";
    return assetsForChain(destinationAssets, chainId);
  }, [destinationAssets, selectedAsset?.chainId, selectedChainId]);

  const recipientAddressType = useMemo(() => {
    const chainId = selectedChainId || selectedAsset?.chainId || "";
    const chainName =
      selectedAsset?.chainName ||
      chainOptions.find((c) => c.chainId === chainId)?.chainName;
    return resolveRecipientAddressType(chainId, chainName);
  }, [chainOptions, selectedAsset?.chainId, selectedAsset?.chainName, selectedChainId]);

  const showUseConnected = Boolean(
    activeWallet?.address &&
      !isEmailOrSocialLogin(user) &&
      recipientAddressType === "evm"
  );

  const balanceNumber = useMemo(() => parseAmountUsd(balanceUsd), [balanceUsd]);
  const amountUsd = useMemo(() => parseAmountUsd(amountInput), [amountInput]);

  const amountError = useMemo(() => {
    if (!amountInput.trim()) return null;
    return validateWithdrawAmountUsd(amountUsd, balanceNumber, locale);
  }, [amountInput, amountUsd, balanceNumber, locale]);

  const recipientError = useMemo(() => {
    return validateWithdrawRecipient(recipientAddr, recipientAddressType, locale);
  }, [recipientAddr, recipientAddressType, locale]);

  const resetState = useCallback(() => {
    setRecipientAddr("");
    setAmountInput("");
    setQuote(null);
    setQuoteError("");
    setIsQuoting(false);
    setIsExecuting(false);
    setExecutionError("");
    setStatusMessage("");
    setBridgePollAddress(null);
    quoteRequestRef.current += 1;
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const defaultAsset = getDefaultWithdrawAsset(destinationAssets);
    if (!defaultAsset) return;
    setSelectedChainId(defaultAsset.chainId);
    setSelectedAssetId(defaultAsset.id);
  }, [isOpen, destinationAssets]);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen, resetState]);

  const handleUseConnected = useCallback(() => {
    if (!activeWallet?.address) return;
    setRecipientAddr(activeWallet.address);
  }, [activeWallet?.address]);

  const handleAmountChange = useCallback((value: string) => {
    setAmountInput(sanitizeAmountUsdInput(value));
  }, []);

  const handleMax = useCallback(() => {
    setAmountInput(formatAmountUsdInput(balanceNumber));
  }, [balanceNumber]);

  const handleChainChange = useCallback(
    (chainId: string) => {
      setSelectedChainId(chainId);
      const tokens = assetsForChain(destinationAssets, chainId);
      const next = tokens[0];
      if (next) setSelectedAssetId(next.id);
    },
    [destinationAssets]
  );

  const handleTokenChange = useCallback((assetId: string) => {
    setSelectedAssetId(assetId);
    const asset = destinationAssets.find((a) => a.id === assetId);
    if (asset) setSelectedChainId(asset.chainId);
  }, [destinationAssets]);

  const canQuote = Boolean(
    proxyAddress &&
      selectedAsset &&
      isValidWithdrawRecipient(recipientAddr, recipientAddressType) &&
      !amountError &&
      amountUsd > 0
  );

  useEffect(() => {
    if (!isOpen || !canQuote || !selectedAsset) {
      setQuote(null);
      setQuoteError("");
      return;
    }

    const requestId = ++quoteRequestRef.current;
    const timer = window.setTimeout(async () => {
      setIsQuoting(true);
      setQuoteError("");
      try {
        const amountBaseUnit = ethers.utils
          .parseUnits(amountUsd.toFixed(PUSD_DECIMALS), PUSD_DECIMALS)
          .toString();
        const response = await getBridgeQuote({
          fromAmountBaseUnit: amountBaseUnit,
          fromChainId: String(POLYGON_CHAIN_ID),
          fromTokenAddress: PUSD_ADDRESS,
          recipientAddress: recipientAddr.trim(),
          toChainId: selectedAsset.chainId,
          toTokenAddress: selectedAsset.tokenAddress,
        });
        if (quoteRequestRef.current !== requestId) return;

        const estOutputUsd = toNumber(response.estOutputUsd) ?? amountUsd;
        const estToBase = response.estToTokenBaseUnit;
        let receiveAmountDisplay = `${amountUsd.toFixed(5)} ${selectedAsset.symbol}`;
        if (estToBase) {
          try {
            const formatted = ethers.utils.formatUnits(estToBase, selectedAsset.decimals);
            receiveAmountDisplay = `${Number(formatted).toFixed(5)} ${selectedAsset.symbol}`;
          } catch {
            receiveAmountDisplay = `${estOutputUsd.toFixed(5)} ${selectedAsset.symbol}`;
          }
        }

        setQuote({
          response,
          fee: response.estFeeBreakdown,
          receiveAmountDisplay,
          receiveUsd: estOutputUsd,
          quotedAtMs: Date.now(),
        });
      } catch {
        if (quoteRequestRef.current !== requestId) return;
        setQuote(null);
        setQuoteError(locale === "zh" ? "无法获取报价，请稍后重试" : "Could not fetch quote. Try again.");
      } finally {
        if (quoteRequestRef.current === requestId) {
          setIsQuoting(false);
        }
      }
    }, QUOTE_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [
    amountUsd,
    canQuote,
    isOpen,
    locale,
    recipientAddr,
    selectedAsset,
    proxyAddress,
  ]);

  const bridgeStatus = useBridgeStatus(bridgePollAddress, Boolean(bridgePollAddress));

  useEffect(() => {
    const status = bridgeStatus.latestStatus;
    if (!status || !bridgePollAddress) return;
    if (status === "COMPLETED") {
      setStatusMessage(locale === "zh" ? "提现已完成" : "Withdrawal completed");
      onBalanceRefresh();
      return;
    }
    if (status === "FAILED") {
      setStatusMessage(locale === "zh" ? "提现失败" : "Withdrawal failed");
      return;
    }
    setStatusMessage(
      locale === "zh" ? "处理中…" : "Processing…"
    );
  }, [bridgePollAddress, bridgeStatus.latestStatus, locale, onBalanceRefresh]);

  const primaryButtonLabel = useMemo(() => {
    if (isExecuting) {
      return locale === "zh" ? "处理中…" : "Processing…";
    }
    if (!recipientAddr.trim() || !amountInput.trim() || amountError || recipientError || !quote) {
      return "Enter amount";
    }
    return "Withdraw";
  }, [
    amountError,
    amountInput,
    isExecuting,
    locale,
    quote,
    recipientAddr,
    recipientError,
  ]);

  const canSubmit = Boolean(
    canQuote &&
      quote &&
      !isQuoting &&
      !isExecuting &&
      !recipientError &&
      !amountError
  );

  const handleWithdraw = useCallback(async () => {
    if (!canSubmit || !selectedAsset || !proxyAddress || isExecutingRef.current) return;
    isExecutingRef.current = true;
    setIsExecuting(true);
    setExecutionError("");
    setStatusMessage("");

    try {
      const wallet = selectPrimaryWallet(wallets, user?.wallet?.address, {
        stickyClientType: stickyExternalWalletClientType,
      });
      if (!wallet) throw new Error(locale === "zh" ? "未找到已连接钱包" : "No connected wallet");

      const amountBaseUnit = ethers.utils
        .parseUnits(amountUsd.toFixed(PUSD_DECIMALS), PUSD_DECIMALS)
        .toString();

      const withdrawResponse: CreateWithdrawResponse = await createWithdrawAddress({
        address: proxyAddress,
        toChainId: selectedAsset.chainId,
        toTokenAddress: selectedAsset.tokenAddress,
        recipientAddr: recipientAddr.trim(),
      });

      const bridgeDepositAddress = extractDepositAddress(withdrawResponse, "evm");
      if (!ethers.utils.isAddress(bridgeDepositAddress)) {
        throw new Error(
          locale === "zh" ? "无法创建提现地址" : "Could not create withdrawal address"
        );
      }

      const ethereumProvider = await wallet.getEthereumProvider();
      const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
      const signer = provider.getSigner();

      await executePusdWithdrawTransfer({
        signer,
        bridgeDepositAddress,
        amountBaseUnit,
      });

      setBridgePollAddress(bridgeDepositAddress);
      setStatusMessage(locale === "zh" ? "提现已提交" : "Withdrawal submitted");
      onBalanceRefresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === "zh"
            ? "提现失败"
            : "Withdrawal failed";
      setExecutionError(message);
    } finally {
      isExecutingRef.current = false;
      setIsExecuting(false);
    }
  }, [
    amountUsd,
    canSubmit,
    locale,
    onBalanceRefresh,
    proxyAddress,
    recipientAddr,
    selectedAsset,
    stickyExternalWalletClientType,
    user?.wallet?.address,
    wallets,
  ]);

  return {
    activeWallet,
    amountError,
    amountInput,
    amountUsd,
    assetsLoading,
    balanceNumber,
    bridgeStatus,
    canSubmit,
    chainOptions,
    destinationAssets,
    executionError,
    fundsTermsOpen,
    handleAmountChange,
    handleChainChange,
    handleMax,
    handleTokenChange,
    handleUseConnected,
    handleWithdraw,
    isExecuting,
    isQuoting,
    onClose,
    primaryButtonLabel,
    quote,
    quoteError,
    recipientAddr,
    recipientError,
    selectedAsset,
    selectedChainId,
    setFundsTermsOpen,
    setRecipientAddr,
    recipientAddressType,
    showUseConnected,
    statusMessage,
    tokenOptions,
  };
}
