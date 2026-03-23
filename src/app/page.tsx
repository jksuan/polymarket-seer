'use client';

import { useState, Suspense } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { usePrivy } from "@privy-io/react-auth";
import { clearCredsCache } from "@/lib/utils";
import { usePolymarketAuth } from "@/hooks/usePolymarketAuth";
import { useTrading } from "@/hooks/useTrading";

import { BottomNav } from '@/components/ui/BottomNav';
import { HomePage } from '@/components/pages/HomePage';
import { SearchPage } from '@/components/pages/SearchPage';
import { LeaderboardPage } from '@/components/pages/LeaderboardPage';
import { ProfilePage } from '@/components/pages/ProfilePage';
import { ChallengePage } from '@/components/pages/ChallengePage';
import TxOverlay from "@/components/TxOverlay";

function AppRouterContent() {
  const [activeTab, setActiveTab] = useState('home');

  // Web3 Core Hooks
  const { authenticated, user, login, logout } = usePrivy();
  const { 
    walletAddress, proxyAddress, usdcBalance, isRefreshingBalance, fetchBalance,
    setWalletAddress, setProxyAddress, setUsdcBalance, hasCreds
  } = usePolymarketAuth();

  const {
    txStep, txMessage, txOrderId, txError, setTxStep,
    positions, openOrders, trades, portfolioLoading,
    handlePlaceRealBet, handleRedeem, fetchPortfolio, setPositions, setOpenOrders, setTrades
  } = useTrading(walletAddress, proxyAddress, hasCreds, () => fetchBalance(false));

  const closeTxOverlay = () => {
    setTxStep("idle");
    if (proxyAddress) fetchBalance(false);
  };

  const handleClearState = () => {
    clearCredsCache();
    setWalletAddress("");
    setProxyAddress(null);
    setUsdcBalance("0.00");
    setPositions([]);
    setOpenOrders([]);
    setTrades([]);
  };

  // Temp bet state logic to handle retries from TxOverlay
  const [lastBetAmount, setLastBetAmount] = useState("10");
  
  const handlePlaceBetWrap = async (amount: string, tokenId: string) => {
      setLastBetAmount(amount);
      await handlePlaceRealBet(amount, tokenId);
  };

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#0D0518]">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.98, filter: 'blur(5px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, scale: 1.05, filter: 'blur(5px)' }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full absolute inset-0 pb-[70px] overflow-y-auto"
          style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {activeTab === 'home' && (
             <HomePage onPlaceBet={handlePlaceBetWrap} />
          )}
          {activeTab === 'search' && <SearchPage />}
          {activeTab === 'leaderboard' && <LeaderboardPage />}
          {activeTab === 'profile' && (
            <ProfilePage 
              authenticated={authenticated}
              login={login}
              logout={logout}
              user={user}
              usdcBalance={usdcBalance}
              isRefreshingBalance={isRefreshingBalance}
              fetchBalance={() => fetchBalance(true)}
              walletAddress={walletAddress}
              proxyAddress={proxyAddress}
              positions={positions}
              openOrders={openOrders}
              trades={trades}
              portfolioLoading={portfolioLoading}
              onClearState={handleClearState}
              onRedeem={handleRedeem}
            />
          )}
          {activeTab === 'challenge' && <ChallengePage />}
        </motion.div>
      </AnimatePresence>
      <BottomNav activeTab={activeTab} onChange={setActiveTab} />
      
      <TxOverlay
        txStep={txStep}
        txMessage={txMessage}
        txOrderId={txOrderId!}
        txError={txError!}
        proxyAddress={proxyAddress!}
        amount={lastBetAmount}
        onClose={closeTxOverlay}
        onRetry={() => {}}
      />
    </div>
  );
}

export default function AppRouter() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#0D0518] text-white flex items-center justify-center">Loading Framework...</div>}>
      <AppRouterContent />
    </Suspense>
  );
}
