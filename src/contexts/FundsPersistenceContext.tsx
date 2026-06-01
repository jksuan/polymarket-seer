"use client";

import { createContext, useContext, type ReactNode } from "react";
import {
  useFundsPersistence,
  type FundsPersistenceApi,
} from "@/hooks/useFundsPersistence";

const FundsPersistenceContext = createContext<FundsPersistenceApi | null>(null);

export function FundsPersistenceProvider({ children }: { children: ReactNode }) {
  const api = useFundsPersistence();
  return (
    <FundsPersistenceContext.Provider value={api}>
      {children}
    </FundsPersistenceContext.Provider>
  );
}

export function useFundsPersistenceContext(): FundsPersistenceApi {
  const ctx = useContext(FundsPersistenceContext);
  if (!ctx) {
    throw new Error("useFundsPersistenceContext must be used within FundsPersistenceProvider");
  }
  return ctx;
}
