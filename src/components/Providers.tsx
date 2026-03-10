"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  // 必须有一个有效的 Privy App ID
  // 我们暂时放在环境变量里：NEXT_PUBLIC_PRIVY_APP_ID
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmmj2xch900fy0cl41zbpp3zn";

  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "wallet", "twitter"],
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6", // tailwind blue-500
          logo: "https://polymarket.com/images/logo.png", // 可以换成我们自己的 logo
        },
        // 支持的钱包选项，可以隐藏对于非币圈用户太复杂的选项
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets", // 核心功能：使用社交/邮箱登录时，静默生成不可见链上钱包的终极武器！
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
