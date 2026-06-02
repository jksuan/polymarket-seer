'use client';

import { useState, useEffect, Suspense, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { PolymarketAuthProvider, usePolymarketAuth } from "@/contexts/PolymarketAuthContext";
import { UserWalletSyncProvider } from "@/contexts/UserWalletSyncContext";
import { useTrading } from "@/hooks/useTrading";

import { BottomNav } from '@/components/ui/BottomNav';
import { HomePage } from '@/components/pages/HomePage';
import { SearchPage } from '@/components/pages/SearchPage';
import { DiscoverPage } from '@/components/pages/DiscoverPage';
import { ProfilePage } from '@/components/pages/ProfilePage';
import { ChallengePage } from '@/components/pages/ChallengePage';
import TxOverlay from "@/components/TxOverlay";

function AppRouterContent() {
  const [activeTab, setActiveTabRaw] = useState('home');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = sessionStorage.getItem('seer_app_tab');
      if (savedTab) {
        setActiveTabRaw(savedTab);
      }
    }
  }, []);

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabRaw(tab);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('seer_app_tab', tab);
    }
  }, []);

  // Web3 Core Hooks
  const { 
    authenticated, user, login, handleLogout,
    walletAddress, proxyAddress, usdcBalance, isRefreshingBalance, fetchBalance,
    setWalletAddress, setProxyAddress, setUsdcBalance, hasCreds
  } = usePolymarketAuth();

  const {
    txStep, txMessage, txOrderId, txError, setTxStep,
    positions, openOrders, trades, portfolioLoading,
    handlePlaceRealBet, handleRedeem, fetchPortfolio,
    handleSellPosition, handleLimitSellPosition, handleCancelOrder
  } = useTrading(walletAddress, proxyAddress, hasCreds, () => fetchBalance(false));

  const closeTxOverlay = () => {
    setTxStep("idle");
    if (proxyAddress) fetchBalance(false);
  };

  // handleLogout 已由 Context 提供，包含完整的退出清理逻辑

  // Tracks the last async action so TxOverlay's "Retry" can replay it
  const lastActionRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [lastBetAmount, setLastBetAmount] = useState("10");

  const handlePlaceBetWrap = useCallback(async (amount: string, tokenId: string, executionPrice?: number) => {
    const action = () => handlePlaceRealBet(amount, tokenId, executionPrice);
    lastActionRef.current = action;
    setLastBetAmount(amount);
    await action();
  }, [handlePlaceRealBet]);

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
             <HomePage onPlaceBet={handlePlaceBetWrap} positions={positions} />
          )}
          {activeTab === 'search' && <SearchPage onPlaceBet={handlePlaceBetWrap} positions={positions} />}
          {/* 
            UI/UX 调整说明：
            底部导航栏的 "发现(discover)" 标签在此处渲染了 `ChallengePage` 组件 (包含了左右划动的Tinder式卡片)。
            这是因为左右划动卡片本质上是一个低门槛的探索过程，更符合“发现”的语义逻辑与直觉。
          */}
          {activeTab === 'discover' && (
            <ChallengePage
              onPlaceBet={async (amount, tokenId, executionPrice) => {
                const action = () => handlePlaceRealBet(amount, tokenId, executionPrice);
                lastActionRef.current = action;
                setLastBetAmount(amount);
                await action();
              }}
              positions={positions}
            />
          )}
          {activeTab === 'profile' && (
            <ProfilePage 
              authenticated={authenticated}
              login={login}
              logout={handleLogout}
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
              onClearState={handleLogout}
              onRedeem={(pos) => {
                const mode = pos._marketStatus === "lost" ? "archive" : "redeem";
                const action = () => handleRedeem(pos, mode);
                lastActionRef.current = action;
                action();
              }}
              onSell={async (tokenId, sharesText, executionPrice?: number) => {
                const action = () => handleSellPosition(tokenId, sharesText, executionPrice);
                lastActionRef.current = action;
                setLastBetAmount(sharesText);
                await action();
              }}
              onLimitSell={async (tokenId, sharesText, price) => {
                const action = () => handleLimitSellPosition(tokenId, sharesText, price);
                lastActionRef.current = action;
                setLastBetAmount(sharesText);
                await action();
              }}
              onCancelOrder={async (orderId) => {
                const action = () => handleCancelOrder(orderId);
                lastActionRef.current = action;
                setLastBetAmount("0");
                await action();
              }}
            />
          )}
          {/* 
            UI/UX 调整说明：
            底部导航栏上的中心奖杯 "挑战(challenge)" 标签在此处渲染了 `DiscoverPage` 组件 (包含了夺冠热门等精美大卡片)。
            夺冠热门本身直指最高悬念，将其放在象征最高荣誉的中央“奖杯(挑战)”按钮下，既满足视觉分量匹配，又在语义上极具仪式感。
          */}
          {activeTab === 'challenge' && <DiscoverPage onPlaceBet={handlePlaceBetWrap} positions={positions} />}
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
        onRetry={() => { lastActionRef.current(); }}
      />
    </div>
  );
}

export default function AppRouter() {
  return (
    <PolymarketAuthProvider>
      <UserWalletSyncProvider>
        <Suspense fallback={<div className="min-h-[100dvh] bg-[#0D0518] text-white flex items-center justify-center">Loading...</div>}>
          <AppRouterContent />
        </Suspense>
      </UserWalletSyncProvider>
    </PolymarketAuthProvider>
  );
}
