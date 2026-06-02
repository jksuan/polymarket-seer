"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";

import {
  POLYGON_CHAIN_ID,
} from "@/lib/constants";
import {
  getCachedCreds,
  setCachedCreds,
  clearCachedCredsForWallet,
} from "@/lib/utils";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { isValidApiKeyCreds } from "@/lib/clobApiKeyCreds";
import { createClobClient } from "@/lib/clobClientFactory";
import { resolveClobApiKeyCreds } from "@/auth/resolveClobApiKeyCreds";
import { readUsdcBalanceDisplay } from "@/auth/readUsdcBalanceDisplay";
import {
  ensureProxyCollateralSynced,
  type ClobCollateralClient,
} from "@/auth/collateralBalance";
import { createDepositRelayExecutor } from "@/auth/depositRelayExecutor";
import {
  createTradingRelayClient,
  ensureDepositVaultDeployed,
  resolveTradingVault,
} from "@/auth/vault";
import { isEmbeddedWalletUnavailableError, walletListFingerprint } from "@/lib/accountSwitchGuard";

/** 首次进入后拉余额的最大尝试次数（含第一次） */
export const BALANCE_INITIAL_MAX_ATTEMPTS = 4;
/** 静默刷新间隔 */
export const BALANCE_SILENT_REFRESH_INTERVAL_MS = 90_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export type UseBalanceSyncParams = {
  ready: boolean;
  authenticated: boolean;
  wallets: any[] | undefined;
  userWalletAddress: string | undefined;
  /** Privy user.id：换账号时触发余额/CLOB 重拉 */
  privyUserId: string | null | undefined;
  stickyExternalWalletClientType: string | null;
  preferEmbeddedForPrimaryWallet: boolean;
  awaitingEmbeddedWalletSync: boolean;
  /** embedded 钱包对象失效（换账号残留）时由上层重同步 / createWallet */
  onEmbeddedWalletUnavailable?: () => void;
  /** 用户取消 ClobAuth 签名时由上层回滚 Privy 会话 */
  onClobAuthRejected?: () => void;
  setStickyExternalWalletClientType: (value: string | null) => void;
  setHasCreds: (value: boolean) => void;
  setWalletAddress: (value: string) => void;
  setProxyAddress: (value: string | null) => void;
};

export function useBalanceSync({
  ready,
  authenticated,
  wallets,
  userWalletAddress,
  privyUserId,
  stickyExternalWalletClientType,
  preferEmbeddedForPrimaryWallet,
  awaitingEmbeddedWalletSync,
  onEmbeddedWalletUnavailable,
  onClobAuthRejected,
  setStickyExternalWalletClientType,
  setHasCreds,
  setWalletAddress,
  setProxyAddress,
}: UseBalanceSyncParams) {
  const [usdcBalance, setUsdcBalance] = useState("0.00");
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isInitialBalanceLoading, setIsInitialBalanceLoading] = useState(false);

  const isFetchingBalanceRef = useRef(false);
  const fetchBalanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silentRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriedDeriveCredsRef = useRef(false);
  const prevPrivyUserIdRef = useRef<string | null | undefined>(undefined);
  const awaitingEmbeddedWalletSyncRef = useRef(awaitingEmbeddedWalletSync);
  const fetchBalanceRef = useRef<((showLoading?: boolean) => Promise<boolean>) | null>(null);
  const initialLoadKeyRef = useRef<string | null>(null);
  const prevAwaitingEmbeddedSyncRef = useRef(awaitingEmbeddedWalletSync);
  const clobAuthRejectedHandledRef = useRef(false);
  const onClobAuthRejectedRef = useRef(onClobAuthRejected);

  awaitingEmbeddedWalletSyncRef.current = awaitingEmbeddedWalletSync;
  onClobAuthRejectedRef.current = onClobAuthRejected;

  const walletsFingerprint = walletListFingerprint(wallets);
  const initialLoadKey = `${privyUserId ?? ""}:${walletsFingerprint}:${userWalletAddress ?? ""}`;

  useEffect(() => {
    const currentId = privyUserId ?? null;
    if (prevPrivyUserIdRef.current === undefined) {
      prevPrivyUserIdRef.current = currentId;
      return;
    }
    if (prevPrivyUserIdRef.current !== currentId) {
      hasTriedDeriveCredsRef.current = false;
      prevPrivyUserIdRef.current = currentId;
    }
  }, [privyUserId]);

  const stopSilentRefresh = useCallback(() => {
    if (silentRefreshIntervalRef.current != null) {
      clearInterval(silentRefreshIntervalRef.current);
      silentRefreshIntervalRef.current = null;
    }
  }, []);

  const resetBalanceState = useCallback(() => {
    setUsdcBalance("0.00");
    setIsInitialBalanceLoading(false);
    setIsRefreshingBalance(false);
    isFetchingBalanceRef.current = false;
    hasTriedDeriveCredsRef.current = false;
    clobAuthRejectedHandledRef.current = false;
    stopSilentRefresh();
    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
      fetchBalanceTimerRef.current = null;
    }
    initialLoadKeyRef.current = null;
  }, [stopSilentRefresh]);

  const fetchBalance = useCallback(
    async (showLoading = false): Promise<boolean> => {
      if (
        isFetchingBalanceRef.current ||
        !authenticated ||
        !wallets ||
        wallets.length === 0 ||
        clobAuthRejectedHandledRef.current
      ) {
        return false;
      }

      isFetchingBalanceRef.current = true;
      if (showLoading) setIsRefreshingBalance(true);

      let readOk = false;

      try {
        const wallet = selectPrimaryWallet(wallets, userWalletAddress, {
          stickyClientType: stickyExternalWalletClientType,
          preferEmbedded: preferEmbeddedForPrimaryWallet,
          awaitingWalletSync: awaitingEmbeddedWalletSyncRef.current,
        });
        if (!wallet) {
          setHasCreds(false);
          setUsdcBalance("0.00");
          return false;
        }

        if (wallet.walletClientType && wallet.walletClientType !== "privy") {
          setStickyExternalWalletClientType(wallet.walletClientType.toLowerCase());
        } else {
          setStickyExternalWalletClientType(null);
        }

        setWalletAddress(wallet.address);

        const ethereumProvider = await wallet.getEthereumProvider();
        const provider = new ethers.providers.Web3Provider(ethereumProvider as any);
        const signer = provider.getSigner();
        const clobClient = createClobClient({ signer: signer as never });

        const vault = await resolveTradingVault(signer);
        setProxyAddress(vault.address);

        if (!getCachedCreds(wallet.address)) {
          await new Promise((r) => setTimeout(r, 200));
        }

        const { creds, hasCreds: resolvedHasCreds, userRejected } = await resolveClobApiKeyCreds({
          walletAddress: wallet.address,
          getCachedCreds,
          clearCachedCredsForWallet,
          setCachedCreds,
          switchChain: () => wallet.switchChain(POLYGON_CHAIN_ID),
          clobClient,
          hasAttemptedDerive: hasTriedDeriveCredsRef.current,
          markDeriveAttempted: () => {
            hasTriedDeriveCredsRef.current = true;
          },
        });

        if (userRejected) {
          clobAuthRejectedHandledRef.current = true;
          setHasCreds(false);
          setWalletAddress("");
          setProxyAddress(null);
          onClobAuthRejectedRef.current?.();
          return false;
        }

        setHasCreds(resolvedHasCreds);

        const validCreds = isValidApiKeyCreds(creds) ? creds : null;
        const balanceResult = await readUsdcBalanceDisplay({
          creds: validCreds,
          fetchTradableCollateralBalance: async () => {
            if (!validCreds) {
              return { balanceAtomic: BigInt(0), readOk: false };
            }
            const clobWithCreds = createClobClient({
              signer: signer as never,
              creds: validCreds,
              funderAddress: vault.address,
              signatureType: vault.signatureType,
            });
            const relayClient = createTradingRelayClient(signer);
            try {
              await ensureDepositVaultDeployed(relayClient, vault.address);
            } catch (deployErr) {
              console.warn("[余额] Deposit Wallet 部署检查失败", deployErr);
            }
            const relayExecutor = createDepositRelayExecutor(signer, vault.address);
            const { balanceAtomic } = await ensureProxyCollateralSynced({
              clobClient: clobWithCreds as ClobCollateralClient,
              provider,
              proxyAddress: vault.address,
              relayExecutor,
            });
            return { balanceAtomic, readOk: true };
          },
        });

        setUsdcBalance(balanceResult.displayBalance);
        readOk = balanceResult.readOk;
      } catch (err) {
        if (isEmbeddedWalletUnavailableError(err)) {
          console.warn("[余额/CLOB] embedded 钱包不可用，等待 Privy 重新对齐", err);
          setWalletAddress("");
          setProxyAddress(null);
          setHasCreds(false);
          onEmbeddedWalletUnavailable?.();
        } else {
          console.error("Balance fetch failed", err);
        }
        readOk = false;
      } finally {
        isFetchingBalanceRef.current = false;
        if (showLoading) setIsRefreshingBalance(false);
      }

      return readOk;
    },
    [
      authenticated,
      wallets,
      userWalletAddress,
      privyUserId,
      stickyExternalWalletClientType,
      preferEmbeddedForPrimaryWallet,
      onEmbeddedWalletUnavailable,
      onClobAuthRejected,
      setStickyExternalWalletClientType,
      setHasCreds,
      setWalletAddress,
      setProxyAddress,
    ]
  );

  fetchBalanceRef.current = fetchBalance;

  useEffect(() => {
    if (!ready || !authenticated || !walletsFingerprint) {
      setIsInitialBalanceLoading(false);
      return;
    }

    const isNewLoadCycle = initialLoadKeyRef.current !== initialLoadKey;
    if (isNewLoadCycle) {
      initialLoadKeyRef.current = initialLoadKey;
      setIsInitialBalanceLoading(true);
    }

    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
    }

    const hasExternalWallet = (wallets ?? []).some((w) => w.walletClientType !== "privy");
    const delay = hasExternalWallet ? 1500 : 300;

    let cancelled = false;

    fetchBalanceTimerRef.current = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        const runFetch = fetchBalanceRef.current;
        if (!runFetch) return;

        let ok = false;
        for (let attempt = 0; attempt < BALANCE_INITIAL_MAX_ATTEMPTS && !ok && !cancelled; attempt += 1) {
          if (clobAuthRejectedHandledRef.current) break;
          ok = await runFetch(false);
          if (ok || cancelled) break;
          const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
          await sleep(backoffMs);
        }
        if (!cancelled) setIsInitialBalanceLoading(false);
      })();
    }, delay);

    return () => {
      cancelled = true;
      if (fetchBalanceTimerRef.current) {
        clearTimeout(fetchBalanceTimerRef.current);
        fetchBalanceTimerRef.current = null;
      }
    };
  }, [ready, authenticated, initialLoadKey, walletsFingerprint]);

  useEffect(() => {
    const wasAwaiting = prevAwaitingEmbeddedSyncRef.current;
    prevAwaitingEmbeddedSyncRef.current = awaitingEmbeddedWalletSync;
    if (wasAwaiting && !awaitingEmbeddedWalletSync && ready && authenticated && walletsFingerprint) {
      setIsInitialBalanceLoading(true);
      void fetchBalanceRef.current?.(false).finally(() => {
        setIsInitialBalanceLoading(false);
      });
    }
  }, [awaitingEmbeddedWalletSync, ready, authenticated, walletsFingerprint]);

  useEffect(() => {
    if (!ready || !authenticated || !walletsFingerprint) {
      stopSilentRefresh();
      return;
    }

    stopSilentRefresh();
    silentRefreshIntervalRef.current = setInterval(() => {
      void fetchBalanceRef.current?.(false);
    }, BALANCE_SILENT_REFRESH_INTERVAL_MS);

    return () => {
      stopSilentRefresh();
    };
  }, [ready, authenticated, walletsFingerprint, stopSilentRefresh]);

  return {
    usdcBalance,
    setUsdcBalance,
    isRefreshingBalance,
    isInitialBalanceLoading,
    fetchBalance,
    resetBalanceState,
    stopSilentRefresh,
  };
}
