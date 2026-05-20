"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { selectPrimaryWallet } from "@/lib/primaryWallet";
import { normalizeAddress } from "@/lib/accountSwitchGuard";
import { createAccountDriftProcessor } from "@/auth/accountDriftProcessor";
import {
  type AuthSessionMode,
  shouldMonitorExternalAccountDrift,
} from "@/auth/sessionMode";

export type EthereumProviderLike = {
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
  request?: (args: { method: string }) => Promise<unknown>;
};

type DriftWallet = {
  address: string;
  walletClientType?: string;
  getEthereumProvider?: () => Promise<unknown>;
};

export type UseExternalAccountDriftParams = {
  ready: boolean;
  authenticated: boolean;
  sessionMode: AuthSessionMode | null;
  user: { wallet?: { address?: string } } | null | undefined;
  wallets: DriftWallet[] | undefined;
  sessionAddress: string | null;
  stickyExternalWalletClientType: string | null;
  performLogout: () => Promise<void>;
};

/** ADR-0005 §4：漂移后仅 logout，不自动 login */
export function useExternalAccountDrift({
  ready,
  authenticated,
  sessionMode,
  user,
  wallets,
  sessionAddress,
  stickyExternalWalletClientType,
  performLogout,
}: UseExternalAccountDriftParams) {
  const [accountDriftRequiresRelogin, setAccountDriftRequiresRelogin] = useState(false);
  const activeDriftClearDebounceRef = useRef<(() => void) | null>(null);
  const performLogoutRef = useRef(performLogout);

  useEffect(() => {
    performLogoutRef.current = performLogout;
  }, [performLogout]);

  const clearAccountChangeDebounce = useCallback(() => {
    activeDriftClearDebounceRef.current?.();
    activeDriftClearDebounceRef.current = null;
  }, []);

  const clearAccountDriftPrompt = useCallback(() => {
    setAccountDriftRequiresRelogin(false);
  }, []);

  const handleDriftDetected = useCallback(async () => {
    clearAccountChangeDebounce();
    try {
      await performLogoutRef.current();
      setAccountDriftRequiresRelogin(true);
    } catch (error) {
      console.warn("[账户切换检测] 登出失败:", error);
    }
  }, [clearAccountChangeDebounce]);

  useEffect(() => {
    if (authenticated) {
      setAccountDriftRequiresRelogin(false);
      return;
    }
    clearAccountChangeDebounce();
  }, [authenticated, clearAccountChangeDebounce]);

  useEffect(() => {
    clearAccountChangeDebounce();

    if (!shouldMonitorExternalAccountDrift(sessionMode)) {
      return;
    }

    if (!stickyExternalWalletClientType) {
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
        void handleDriftDetected();
      },
      getIsCancelled: () => cancelled,
    });
    processorClearDebounce = driftProcessor.clearDebounce;
    activeDriftClearDebounceRef.current = driftProcessor.clearDebounce;

    const accountsChangedHandler = (...args: unknown[]) => {
      const accounts = args[0];
      if (!Array.isArray(accounts)) return;
      const latest = normalizeAddress(accounts[0] as string);
      driftProcessor.processAccountCandidate(latest);
    };

    void (async () => {
      try {
        if (!primaryWallet.getEthereumProvider) return;
        provider = (await primaryWallet.getEthereumProvider()) as EthereumProviderLike;
        if (cancelled || !provider) return;
        provider.on?.("accountsChanged", accountsChangedHandler);
        const initialAccounts = await provider.request?.({ method: "eth_accounts" });
        const initial = Array.isArray(initialAccounts)
          ? normalizeAddress(initialAccounts[0] as string)
          : null;
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
    sessionMode,
    wallets,
    sessionAddress,
    user?.wallet?.address,
    stickyExternalWalletClientType,
    clearAccountChangeDebounce,
    handleDriftDetected,
  ]);

  const resetReloginState = useCallback(() => {
    clearAccountDriftPrompt();
    clearAccountChangeDebounce();
  }, [clearAccountDriftPrompt, clearAccountChangeDebounce]);

  return {
    accountDriftRequiresRelogin,
    clearAccountChangeDebounce,
    clearAccountDriftPrompt,
    resetReloginState,
  };
}
