"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { clearCredsCache, copyToClipboard, shortenAddress } from "@/lib/utils";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import { useTrading } from "@/hooks/useTrading";

import Navbar from "@/components/Navbar";
import ChallengeCard from "@/components/ChallengeCard";
import Portfolio from "@/components/Portfolio";
import TxOverlay from "@/components/TxOverlay";

function HomeContent() {
  const searchParams = useSearchParams();
  const initialAmount = searchParams.get("amount") || "50";
  const initialTopic = searchParams.get("topic") || "马斯克下周去火星";

  const [topic, setTopic] = useState(initialTopic);
  const [amount, setAmount] = useState<string>(initialAmount);
  const [username, setUsername] = useState("CryptoKing");
  const [copied, setCopied] = useState(false);
  
  const { authenticated, user, login, logout } = usePrivy();

  // 1. 初始化 Auth Hook
  const { 
    walletAddress, 
    proxyAddress, 
    usdcBalance, 
    isRefreshingBalance, 
    fetchBalance, 
    setWalletAddress,
    setProxyAddress,
    setUsdcBalance,
    hasCreds
  } = usePolymarketAuth();

  // 2. 初始化 Trading Hook
  const {
    txStep, txMessage, txOrderId, txError, setTxStep,
    positions, openOrders, trades, portfolioLoading,
    handlePlaceRealBet, handleRedeem, fetchPortfolio, setPositions, setOpenOrders, setTrades
  } = useTrading(walletAddress, proxyAddress, hasCreds, () => fetchBalance(false));

  const handleCopy = (text: string) => {
    copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeTxOverlay = () => {
    setTxStep("idle");
    if (proxyAddress) fetchBalance(false);
  };

  const displayIdentifier = user?.twitter?.username 
    ? `@${user.twitter.username}`
    : user?.email?.address
      ? user.email.address
      : user?.google?.email
        ? user.google.email
        : walletAddress 
          ? shortenAddress(walletAddress)
          : "Wallet Connected";

  const displayAvatar = user?.twitter?.profilePictureUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${walletAddress || "default"}`;

  return (
    <main className="flex min-h-screen flex-col bg-zinc-950 text-white font-sans sm:items-center sm:justify-center relative overflow-x-hidden">
      
      <Navbar 
        authenticated={authenticated}
        login={login}
        logout={logout}
        proxyAddress={proxyAddress}
        walletAddress={walletAddress}
        usdcBalance={usdcBalance}
        displayIdentifier={displayIdentifier}
        displayAvatar={displayAvatar}
        isRefreshingBalance={isRefreshingBalance}
        onRefreshBalance={() => fetchBalance(true)}
        copied={copied}
        onCopyCopy={handleCopy}
        onClearState={() => {
           clearCredsCache();
           setWalletAddress("");
           setProxyAddress(null);
           setUsdcBalance("0.00");
           setPositions([]);
           setOpenOrders([]);
           setTrades([]);
        }}
      />

      <div className="w-full max-w-md p-6 space-y-8 relative z-10">
        <ChallengeCard
          topic={topic}
          setTopic={setTopic}
          amount={amount}
          setAmount={setAmount}
          username={username}
          setUsername={setUsername}
          authenticated={authenticated}
          onPlaceBet={() => handlePlaceRealBet(amount)}
          isGeneratingTx={txStep !== "idle"}
        />

        {/* ========== Portfolio 资产组合面板 ========== */}
        {authenticated && (
          <Portfolio 
            positions={positions}
            openOrders={openOrders}
            trades={trades}
            portfolioLoading={portfolioLoading}
            onRedeem={handleRedeem}
          />
        )}
      </div>

      <TxOverlay
        txStep={txStep}
        txMessage={txMessage}
        txOrderId={txOrderId!}
        txError={txError!}
        proxyAddress={proxyAddress!}
        amount={amount}
        onClose={closeTxOverlay}
        onRetry={() => handlePlaceRealBet(amount)}
      />
    </main>
  );
}

export default function Home() {
  return (<Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}><HomeContent /></Suspense>);
}
