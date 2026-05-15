"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { normalizeAddress } from "@/lib/accountSwitchGuard";
import { createAccountDriftProcessor } from "@/auth/accountDriftProcessor";

export type EthereumProviderLike = {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  request?: (args: { method: string }) => Promise<unknown>;
};

export type UseExternalAccountDriftParams = {
  ready: boolean;
  authenticated: boolean;
  user: { wallet?: { address?: string } } | null | undefined;
  wallets: Array<{
    walletClientType?: string;
    getEthereumProvider?: () => Promise<unknown>;
  }> | undefined;
  sessionAddress: string | null;
  stickyExternalWalletClientType: string | null;
  login: () => void;
  /** 完整会话登出（清缓存与状态），不含防抖清理 */
  performLogout: () => Promise<void>;
};

export function useExternalAccountDrift({
  ready,
  authenticated,
  user,
  wallets,
  sessionAddress,
  stickyExternalWalletClientType,
  login,
  performLogout,
}: UseExternalAccountDriftParams) {
  const [suppressAccountDrift, setSuppressAccountDrift] = useState(false);
  const [isReloginPending, setIsReloginPending] = useState(false);
  const [reloginRequested, setReloginRequested] = useState(false);

  const prevAuthenticatedRef = useRef<boolean | null>(null);
  const reloginAfterExternalDriftRef = useRef<() => Promise<void>>(async () => {});
  const activeDriftClearDebounceRef = useRef<(() => void) | null>(null);

  const clearAccountChangeDebounce = useCallback(() => {
    activeDriftClearDebounceRef.current?.();
    activeDriftClearDebounceRef.current = null;
  }, []);

  const handleReloginWithNewAccount = useCallback(async () => {
    if (isReloginPending) return;
    setSuppressAccountDrift(true);
    clearAccountChangeDebounce();
    setIsReloginPending(true);
    try {
      await performLogout();
      setReloginRequested(true);
    } catch (error) {
      console.warn("[账户切换检测] 重新登录流程失败:", error);
      setIsReloginPending(false);
      setSuppressAccountDrift(false);
    }
  }, [performLogout, isReloginPending, clearAccountChangeDebounce]);

  useEffect(() => {
    reloginAfterExternalDriftRef.current = handleReloginWithNewAccount;
  }, [handleReloginWithNewAccount]);

  useEffect(() => {
    if (!reloginRequested || !ready || authenticated) return;
    login();
    setReloginRequested(false);
    setIsReloginPending(false);
  }, [reloginRequested, ready, authenticated, login]);

  useEffect(() => {
    if (prevAuthenticatedRef.current === null) {
      prevAuthenticatedRef.current = authenticated;
      return;
    }
    const prev = prevAuthenticatedRef.current;
    prevAuthenticatedRef.current = authenticated;
    if (prev === false && authenticated && user) {
      setSuppressAccountDrift(false);
    }
  }, [authenticated, user]);

  useEffect(() => {
    if (suppressAccountDrift) {
      clearAccountChangeDebounce();
      return;
    }

    if (!ready || !authenticated || !sessionAddress || !Array.isArray(wallets) || wallets.length === 0) {
      return;
    }

    const primaryWallet = selectPrimaryWallet(wallets, user?.wallet?.address, {
      stickyClientType: stickyExternalWalletClientType,
    });
    if (!primaryWallet?.walletClientType || primaryWallet.walletClientType === "privy") {
      return;
    }

    let cancelled = false;
    let provider: EthereumProviderLike | null = null;
    let processorClearDebounce: (() => void) | null = null;

    const driftProcessor = createAccountDriftProcessor({
      sessionAddress,
      onDriftDetected: () => {
        void reloginAfterExternalDriftRef.current();
      },
      getIsCancelled: () => cancelled,
    });
    processorClearDebounce = driftProcessor.clearDebounce;
    activeDriftClearDebounceRef.current = driftProcessor.clearDebounce;

    const accountsChangedHandler = (accounts: string[]) => {
      const latest = normalizeAddress(accounts?.[0]);
      driftProcessor.processAccountCandidate(latest);
    };

    void (async () => {
      try {
        if (!primaryWallet.getEthereumProvider) return;
        provider = (await primaryWallet.getEthereumProvider()) as EthereumProviderLike;
        if (cancelled || !provider) return;
        provider.on?.("accountsChanged", accountsChangedHandler);
        const initialAccounts = await provider.request?.({ method: "eth_accounts" });
        const initial = Array.isArray(initialAccounts) ? normalizeAddress(initialAccounts[0] as string) : null;
        driftProcessor.processAccountCandidate(initial);
      } catch (error) {
        console.warn("[账户切换检测] 监听 provider 失败:", error);
      }
    })();

    return () => {
      cancelled = true;
      processorClearDebounce?.();
      activeDriftClearDebounceRef.current = null;
      provider?.removeListener?.("accountsChanged", accountsChangedHandler);
    };
  }, [
    ready,
    authenticated,
    wallets,
    sessionAddress,
    user?.wallet?.address,
    stickyExternalWalletClientType,
    suppressAccountDrift,
    clearAccountChangeDebounce,
  ]);

  const resetReloginState = useCallback(() => {
    setIsReloginPending(false);
    setReloginRequested(false);
    setSuppressAccountDrift(false);
    clearAccountChangeDebounce();
  }, [clearAccountChangeDebounce]);

  return {
    clearAccountChangeDebounce,
    resetReloginState,
  };
}
