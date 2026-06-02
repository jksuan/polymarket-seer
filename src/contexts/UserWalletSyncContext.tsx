"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useUserWalletSync } from "@/hooks/useUserWalletSync";

const UserWalletSyncContext = createContext<boolean>(false);

export function UserWalletSyncProvider({ children }: { children: ReactNode }) {
  useUserWalletSync();
  return (
    <UserWalletSyncContext.Provider value={true}>{children}</UserWalletSyncContext.Provider>
  );
}

export function useUserWalletSyncContext(): boolean {
  return useContext(UserWalletSyncContext);
}
