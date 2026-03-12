"use client";

import { useEffect } from "react";

import { PrivyProvider } from "@privy-io/react-auth";
import { polygon } from "viem/chains";

export default function Providers({ children }: { children: React.ReactNode }) {
  // 必须有一个有效的 Privy App ID
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmmj2xch900fy0cl41zbpp3zn";

  // Suppress Privy's internal React 19 missing key warning overlay in Dev mode
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args: any[]) => {
      if (typeof args[0] === "string" && args[0].includes("unique \"key\" prop") && args[0].includes("Me")) {
        return;
      }
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet", "twitter", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6", // tailwind blue-500
          logo: "https://polymarket.com/images/logo.png", // 可以换成我们自己的 logo
        },
        defaultChain: polygon,
        supportedChains: [polygon],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
