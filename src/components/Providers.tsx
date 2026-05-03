"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { polygon } from "viem/chains";

// 模块级别安装拦截器，在 PrivyProvider 渲染之前就生效
if (typeof window !== "undefined") {
  const _origError = console.error.bind(console);
  console.error = (...args: any[]) => {
    // 屏蔽 Privy 初始化时发出的空对象错误 `{}`
    if (
      args.length === 1 &&
      typeof args[0] === "object" &&
      args[0] !== null &&
      !(args[0] instanceof Error) &&
      Object.keys(args[0]).length === 0
    ) {
      return;
    }
    // 屏蔽 React 19 missing key warning
    if (typeof args[0] === "string" && args[0].includes("unique \"key\" prop") && args[0].includes("Me")) {
      return;
    }
    // 屏蔽 CLOB SDK 内部的 api key Axios 报错（正常流程中的 fallback 报错机制，已在代码中 catch 处理）
    if (typeof args[0] === "string" && args[0].includes("[CLOB Client] request error") && (args[0].includes("Could not derive api key!") || args[0].includes("Could not create api key"))) {
      return;
    }
    _origError(...args);
  };
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmmj2xch900fy0cl41zbpp3zn";

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet", "twitter", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6",
          logo: "/polymarket-icon.png",
        },
        defaultChain: polygon,
        supportedChains: [polygon],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
