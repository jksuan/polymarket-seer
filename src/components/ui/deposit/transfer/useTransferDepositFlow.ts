import { useCallback, useEffect, useMemo, useState } from "react";
import { createDepositAddress, useBridgeStatus } from "@/hooks/useBridge";
import type { BridgeAddressType, CreateDepositResponse } from "@/types/bridge";
import type { DepositAddressMap, DepositAsset, FlowStep } from "../types";
import { ADDRESS_TYPES, DEPOSIT_CREATE_REQUESTED_ADDRESS_TYPES } from "../constants";
import {
  depositAddressMatchesType,
  extractDepositAddress,
  extractDepositAddressMap,
} from "../addresses";
import { getTransferStatusSinceAddressCreated } from "../status";

function missingTransferDepositAddressMessage(
  locale: string,
  addressType: BridgeAddressType,
  variant: "afterCreate" | "afterSwitch"
): string {
  if (addressType === "svm") {
    return locale === "zh"
      ? "当前 Solana 入金地址暂不可用，请稍后重试或切换 EVM 网络。"
      : "Solana deposit address is temporarily unavailable. Retry later or switch to an EVM network.";
  }
  if (variant === "afterCreate") {
    return locale === "zh"
      ? `当前网络暂不支持收款地址（${addressType.toUpperCase()}）。请切换网络后重试。`
      : `No ${addressType.toUpperCase()} deposit address available for selected network.`;
  }
  return locale === "zh"
    ? `当前网络暂不支持收款地址（${addressType.toUpperCase()}）。请切换网络。`
    : `Selected network does not have a ${addressType.toUpperCase()} deposit address.`;
}

const TRANSFER_ALLOWED_CHAIN_NAMES = new Set([
  "ethereum",
  "polygon",
  "arbitrum",
  "base",
  "optimism",
  "bnb smart chain",
  "solana",
  "bitcoin",
  "tron",
  "hyperevm",
  "monad",
]);

const TRANSFER_ALLOWED_CHAIN_IDS = new Set([
  "1",
  "10",
  "56",
  "137",
  "143",
  "8453",
  "999",
  "42161",
]);
const TRANSFER_ALLOWED_TOKEN_SYMBOLS = new Set([
  "1INCH",
  "AAVE",
  "ARB",
  "BASE",
  "BNB",
  "BTC",
  "BITCOIN",
  "BUSD",
  "DAI",
  "ETH",
  "EUROC",
  "HYPE",
  "LINK",
  "MATIC",
  "MON",
  "OP",
  "POL",
  "SOL",
  "TUSD",
  "USDC",
  "USDC.E",
  "USDE",
  "USDT",
  "WBNB",
  "WETH",
]);

const TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES = new Set([
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  "11111111111111111111111111111111",
  "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8",
]);

function normalizeChainName(chainName?: string): string {
  return (chainName || "").trim().toLowerCase();
}

function getTransferAddressType(chainId?: string, chainName?: string): BridgeAddressType {
  const id = (chainId || "").trim();
  if (TRANSFER_ALLOWED_CHAIN_IDS.has(id)) return "evm";
  const name = normalizeChainName(chainName);
  if (name.includes("solana")) return "svm";
  if (name.includes("bitcoin") || name.includes("btc")) return "btc";
  if (name.includes("tron")) return "tron";
  return "evm";
}

function getTransferSymbolKey(asset: DepositAsset): string {
  return `${asset.chainId}:${asset.symbol.trim().toUpperCase()}`;
}

function pickPreferredTransferAsset(current: DepositAsset, next: DepositAsset): DepositAsset {
  const currentAddress = current.tokenAddress.toLowerCase();
  const nextAddress = next.tokenAddress.toLowerCase();
  const currentIsPlaceholder = TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES.has(currentAddress);
  const nextIsPlaceholder = TRANSFER_PLACEHOLDER_NATIVE_ADDRESSES.has(nextAddress);

  if (currentIsPlaceholder !== nextIsPlaceholder) {
    return nextIsPlaceholder ? current : next;
  }

  const currentHasIcon = Boolean(current.iconUrl);
  const nextHasIcon = Boolean(next.iconUrl);
  if (currentHasIcon !== nextHasIcon) {
    return nextHasIcon ? next : current;
  }

  const currentMinUsd = Number(current.minCheckoutUsd);
  const nextMinUsd = Number(next.minCheckoutUsd);
  const currentMinValid = Number.isFinite(currentMinUsd) && currentMinUsd > 0;
  const nextMinValid = Number.isFinite(nextMinUsd) && nextMinUsd > 0;
  if (currentMinValid && nextMinValid && currentMinUsd !== nextMinUsd) {
    return nextMinUsd < currentMinUsd ? next : current;
  }

  return next.id.localeCompare(current.id) < 0 ? next : current;
}

type UseTransferDepositFlowArgs = {
  connectedSubmitFastUntilMs: number;
  depositAssets: DepositAsset[];
  isOpen: boolean;
  locale: string;
  onDepositResponse: (response: CreateDepositResponse | null) => void;
  proxyAddress: string;
  setStep: (step: FlowStep) => void;
  step: FlowStep;
};

export function useTransferDepositFlow({
  connectedSubmitFastUntilMs,
  depositAssets,
  isOpen,
  locale,
  onDepositResponse,
  proxyAddress,
  setStep,
  step,
}: UseTransferDepositFlowArgs) {
  const [transferAddresses, setTransferAddresses] = useState<DepositAddressMap>({});
  const [transferAddress, setTransferAddress] = useState("");
  const [transferAddressCreatedAtMs, setTransferAddressCreatedAtMs] = useState(0);
  const [transferUiSessionStartedAtMs, setTransferUiSessionStartedAtMs] = useState(0);
  const [selectedTransferChainId, setSelectedTransferChainId] = useState("");
  const [selectedTransferAssetId, setSelectedTransferAssetId] = useState("");
  const [isCreatingTransferAddress, setIsCreatingTransferAddress] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [copied, setCopied] = useState(false);

  const transferAssets = useMemo(() => {
    const filtered = depositAssets.filter((asset) => {
      const symbol = asset.symbol.trim().toUpperCase();
      if (!TRANSFER_ALLOWED_TOKEN_SYMBOLS.has(symbol)) return false;
      const chainId = asset.chainId.trim();
      const normalizedChainName = normalizeChainName(asset.chainName);
      return TRANSFER_ALLOWED_CHAIN_IDS.has(chainId) || TRANSFER_ALLOWED_CHAIN_NAMES.has(normalizedChainName);
    });

    const deduped = new Map<string, DepositAsset>();
    for (const asset of filtered) {
      const key = getTransferSymbolKey(asset);
      const existing = deduped.get(key);
      if (!existing) {
        deduped.set(key, asset);
        continue;
      }
      const kept = pickPreferredTransferAsset(existing, asset);
      deduped.set(key, kept);
    }
    return [...deduped.values()];
  }, [depositAssets]);

  const selectedTransferSymbol = useMemo(
    () =>
      transferAssets
        .find((asset) => asset.id === selectedTransferAssetId)
        ?.symbol.trim()
        .toUpperCase() ?? "",
    [selectedTransferAssetId, transferAssets]
  );

  const transferChainOptions = useMemo(() => {
    const sourceAssets = selectedTransferSymbol
      ? transferAssets.filter((a) => a.symbol.trim().toUpperCase() === selectedTransferSymbol)
      : transferAssets;

    const chainMap = new Map<string, string>();
    for (const asset of sourceAssets) {
      if (!chainMap.has(asset.chainId)) {
        chainMap.set(asset.chainId, asset.chainName);
      }
    }
    return [...chainMap.entries()].map(([chainId, chainName]) => ({ chainId, chainName }));
  }, [selectedTransferSymbol, transferAssets]);

  const selectedTransferChain = useMemo(
    () => transferChainOptions.find((chain) => chain.chainId === selectedTransferChainId),
    [selectedTransferChainId, transferChainOptions]
  );

  const selectedTransferAddressType = useMemo(
    () => getTransferAddressType(selectedTransferChain?.chainId, selectedTransferChain?.chainName),
    [selectedTransferChain?.chainId, selectedTransferChain?.chainName]
  );

  const transferStatusFilterBaselineMs = Math.max(
    transferAddressCreatedAtMs,
    transferUiSessionStartedAtMs
  );
  const transferSessionFastUntilMs =
    transferStatusFilterBaselineMs > 0
      ? transferStatusFilterBaselineMs + 60_000
      : 0;
  const transferFastPollingUntilMs = Math.max(
    transferSessionFastUntilMs,
    connectedSubmitFastUntilMs
  );

  const transferStatus = useBridgeStatus(
    transferAddress,
    Boolean(transferAddress && isOpen),
    {
      fastPollingUntilMs: transferFastPollingUntilMs,
      fastRefreshIntervalMs: 2_000,
      debugEnabled: false,
      debugLabel: "transfer-status",
      stopOnFinalStatus: false,
    }
  );

  const transferLatestStatus = useMemo(
    () => getTransferStatusSinceAddressCreated(
      transferStatus.data?.transactions,
      transferStatusFilterBaselineMs
    ),
    [transferStatus.data?.transactions, transferStatusFilterBaselineMs]
  );

  const transferBridgeComplete = Boolean(
    transferAddress &&
      (transferLatestStatus === "COMPLETED")
  );

  const handleCopy = useCallback(async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  }, []);

  const handleCreateTransferAddress = useCallback(async () => {
    if (!proxyAddress) {
      setTransferError(locale === "zh" ? "Polymarket 钱包尚未就绪。" : "Polymarket wallet is not ready.");
      return;
    }

    setIsCreatingTransferAddress(true);
    setTransferError("");

    try {
      const response = await createDepositAddress({
        address: proxyAddress,
        requestedAddressTypes: DEPOSIT_CREATE_REQUESTED_ADDRESS_TYPES,
      });
      const addressMapRaw = extractDepositAddressMap(response);
      const addressMap: DepositAddressMap = {};
      for (const t of ADDRESS_TYPES) {
        const candidate = addressMapRaw[t];
        if (candidate && depositAddressMatchesType(candidate, t)) {
          addressMap[t] = candidate;
        }
      }
      const address =
        addressMap[selectedTransferAddressType] ||
        extractDepositAddress(response, selectedTransferAddressType) ||
        "";
      const safeAddress = depositAddressMatchesType(address, selectedTransferAddressType)
        ? address
        : "";
      onDepositResponse(response);
      setTransferAddresses(addressMap);
      setTransferAddress(safeAddress);
      setTransferAddressCreatedAtMs(Date.now());

      if (!safeAddress) {
        setTransferError(
          missingTransferDepositAddressMessage(locale, selectedTransferAddressType, "afterCreate")
        );
      }
    } catch (error) {
      setTransferAddresses({});
      setTransferAddress("");
      setTransferAddressCreatedAtMs(0);
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
  }, [locale, onDepositResponse, proxyAddress, selectedTransferAddressType]);

  useEffect(() => {
    if (transferAssets.length > 0) return;
    if (!selectedTransferChainId && !selectedTransferAssetId) return;
    setSelectedTransferChainId("");
    setSelectedTransferAssetId("");
  }, [selectedTransferAssetId, selectedTransferChainId, transferAssets.length]);

  useEffect(() => {
    if (transferAssets.length === 0) return;
    const selectedExists = transferAssets.some((asset) => asset.id === selectedTransferAssetId);
    if (!selectedExists) {
      setSelectedTransferAssetId(transferAssets[0].id);
    }
  }, [selectedTransferAssetId, transferAssets]);

  useEffect(() => {
    if (transferChainOptions.length === 0) {
      if (selectedTransferChainId) setSelectedTransferChainId("");
      return;
    }
    const chainExists = transferChainOptions.some((chain) => chain.chainId === selectedTransferChainId);
    if (!chainExists) {
      setSelectedTransferChainId(transferChainOptions[0].chainId);
    }
  }, [selectedTransferChainId, transferChainOptions]);

  useEffect(() => {
    if (!selectedTransferSymbol || !selectedTransferChainId) return;
    const matched = transferAssets.find(
      (asset) =>
        asset.chainId === selectedTransferChainId &&
        asset.symbol.trim().toUpperCase() === selectedTransferSymbol
    );
    if (!matched) return;
    if (matched.id !== selectedTransferAssetId) {
      setSelectedTransferAssetId(matched.id);
    }
  }, [selectedTransferAssetId, selectedTransferChainId, selectedTransferSymbol, transferAssets]);

  useEffect(() => {
    if (!selectedTransferChainId) return;
    if (Object.keys(transferAddresses).length === 0) {
      setTransferAddress("");
      setTransferAddressCreatedAtMs(0);
      return;
    }
    const raw = transferAddresses[selectedTransferAddressType] || "";
    const nextAddress = depositAddressMatchesType(raw, selectedTransferAddressType)
      ? raw
      : "";
    setTransferAddress(nextAddress);
    setTransferAddressCreatedAtMs(nextAddress ? Date.now() : 0);
    if (!nextAddress) {
      setTransferError(
        missingTransferDepositAddressMessage(locale, selectedTransferAddressType, "afterSwitch")
      );
      return;
    }
    setTransferError("");
  }, [locale, selectedTransferAddressType, selectedTransferChainId, transferAddresses]);

  useEffect(() => {
    if (!isOpen) return;
    if (step !== "transfer") return;
    if (transferAddress) return;
    if (isCreatingTransferAddress) return;
    if (transferError) return;
    void handleCreateTransferAddress();
  }, [handleCreateTransferAddress, isCreatingTransferAddress, isOpen, step, transferAddress, transferError]);

  const openTransferStep = useCallback(() => {
    setTransferUiSessionStartedAtMs(Date.now());
    setTransferAddresses({});
    setTransferAddress("");
    setTransferAddressCreatedAtMs(0);
    setTransferError("");
    onDepositResponse(null);
    setStep("transfer");
  }, [onDepositResponse, setStep]);

  const resetTransferState = useCallback(() => {
    setTransferAddresses({});
    setTransferAddress("");
    setTransferAddressCreatedAtMs(0);
    setTransferError("");
    setCopied(false);
    setSelectedTransferChainId("");
    setSelectedTransferAssetId("");
  }, []);

  return {
    copied,
    handleCopy,
    handleCreateTransferAddress,
    isCreatingTransferAddress,
    openTransferStep,
    resetTransferState,
    selectedTransferAssetId,
    selectedTransferChainId,
    setSelectedTransferAssetId,
    setSelectedTransferChainId,
    setTransferAddress,
    transferAddress,
    transferAssets,
    transferBridgeComplete,
    transferChainOptions,
    transferError,
    transferLatestStatus,
    transferStatus,
  };
}
