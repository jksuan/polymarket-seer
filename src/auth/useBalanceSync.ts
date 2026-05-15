"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ethers } from "ethers";
import { ClobClient } from "@polymarket/clob-client";
import { deriveSafe } from "@polymarket/builder-relayer-client/dist/builder/derive";

import {
  POLYGON_CHAIN_ID,
  CLOB_API_URL,
  SAFE_FACTORY_POLYGON,
  ADDRESSES,
  ERC20_ABI,
  SIGNATURE_TYPE_GNOSIS_SAFE,
} from "@/lib/constants";
import {
  getCachedCreds,
  setCachedCreds,
  clearCachedCredsForWallet,
} from "@/lib/utils";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { isValidApiKeyCreds } from "@/lib/clobApiKeyCreds";
import { resolveClobApiKeyCreds } from "@/auth/resolveClobApiKeyCreds";
import { readUsdcBalanceDisplay } from "@/auth/readUsdcBalanceDisplay";

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
  stickyExternalWalletClientType: string | null;
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
  stickyExternalWalletClientType,
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
    stopSilentRefresh();
    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
      fetchBalanceTimerRef.current = null;
    }
  }, [stopSilentRefresh]);

  const fetchBalance = useCallback(
    async (showLoading = false): Promise<boolean> => {
      if (isFetchingBalanceRef.current || !authenticated || !wallets || wallets.length === 0) {
        return false;
      }

      isFetchingBalanceRef.current = true;
      if (showLoading) setIsRefreshingBalance(true);

      let readOk = false;

      try {
        const wallet = selectPrimaryWallet(wallets, userWalletAddress, {
          stickyClientType: stickyExternalWalletClientType,
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
        const clobClient = new ClobClient(CLOB_API_URL, POLYGON_CHAIN_ID, signer as any);

        const derivedProxy = deriveSafe(wallet.address, SAFE_FACTORY_POLYGON);
        setProxyAddress(derivedProxy);

        if (!getCachedCreds(wallet.address)) {
          await new Promise((r) => setTimeout(r, 200));
        }

        const { creds, hasCreds: resolvedHasCreds } = await resolveClobApiKeyCreds({
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
        setHasCreds(resolvedHasCreds);

        const validCreds = isValidApiKeyCreds(creds) ? creds : null;
        const balanceResult = await readUsdcBalanceDisplay({
          creds: validCreds,
          fetchClobCollateralBalance: async () => {
            if (!validCreds) return null;
            const clobWithCreds = new ClobClient(
              CLOB_API_URL,
              POLYGON_CHAIN_ID,
              signer as any,
              validCreds,
              SIGNATURE_TYPE_GNOSIS_SAFE,
              derivedProxy
            );
            return clobWithCreds.getBalanceAllowance({ asset_type: "COLLATERAL" as any });
          },
          fetchProxyUsdcBalance: async () => {
            const contract = new ethers.Contract(ADDRESSES.USDCe, ERC20_ABI, provider);
            const proxyBal = await contract.balanceOf(derivedProxy);
            return proxyBal.toString();
          },
          switchChainForFallback: () => wallet.switchChain(POLYGON_CHAIN_ID),
        });

        setUsdcBalance(balanceResult.displayBalance);
        readOk = balanceResult.readOk;
      } catch (err) {
        console.error("Balance fetch failed", err);
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
      stickyExternalWalletClientType,
      setStickyExternalWalletClientType,
      setHasCreds,
      setWalletAddress,
      setProxyAddress,
    ]
  );

  useEffect(() => {
    if (!ready || !authenticated || !wallets || wallets.length === 0) {
      setIsInitialBalanceLoading(false);
      return;
    }

    setIsInitialBalanceLoading(true);

    if (fetchBalanceTimerRef.current) {
      clearTimeout(fetchBalanceTimerRef.current);
    }

    const hasExternalWallet = wallets.some((w) => w.walletClientType !== "privy");
    const delay = hasExternalWallet ? 1500 : 300;

    let cancelled = false;

    fetchBalanceTimerRef.current = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        let ok = false;
        for (let attempt = 0; attempt < BALANCE_INITIAL_MAX_ATTEMPTS && !ok && !cancelled; attempt += 1) {
          ok = await fetchBalance(false);
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
      setIsInitialBalanceLoading(false);
    };
  }, [ready, wallets, authenticated, userWalletAddress, fetchBalance]);

  useEffect(() => {
    if (!ready || !authenticated || !wallets || wallets.length === 0) {
      stopSilentRefresh();
      return;
    }

    stopSilentRefresh();
    silentRefreshIntervalRef.current = setInterval(() => {
      void fetchBalance(false);
    }, BALANCE_SILENT_REFRESH_INTERVAL_MS);

    return () => {
      stopSilentRefresh();
    };
  }, [ready, authenticated, wallets, fetchBalance, stopSilentRefresh]);

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
