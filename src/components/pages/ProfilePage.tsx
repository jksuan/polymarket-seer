'use client';

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Wallet } from "lucide-react";
import { TopHeader } from "@/components/ui/TopHeader";
import { usePolymarketAuth } from "@/contexts/PolymarketAuthContext";

import { ProfileOverview } from "./profile/ProfileOverview";
import { ProfilePositions } from "./profile/ProfilePositions";
import { ProfileOrders } from "./profile/ProfileOrders";
import { ProfileHistory } from "./profile/ProfileHistory";
import { ProfileTransactions } from "./profile/ProfileTransactions";

export interface ProfilePageProps {
  authenticated: boolean;
  login: () => void;
  logout: () => void;
  user: any;
  usdcBalance: string;
  isRefreshingBalance: boolean;
  fetchBalance: () => void;
  walletAddress: string;
  proxyAddress: string | null;
  positions: any[];
  openOrders: any[];
  trades: any[];
  portfolioLoading: boolean;
  onClearState: () => void;
  onRedeem: (pos: any) => void;
  onSell: (tokenId: string, sharesText: string) => void;
  onLimitSell: (tokenId: string, sharesText: string, price: number) => void;
  onCancelOrder: (orderId: string) => void;
}

export function ProfilePage({
  authenticated, login, logout, user, usdcBalance, isRefreshingBalance, fetchBalance,
  proxyAddress, positions, openOrders, trades, portfolioLoading, onClearState, walletAddress,
  onSell, onLimitSell, onCancelOrder, onRedeem
}: ProfilePageProps) {
  const { displayIdentifier } = usePolymarketAuth();
  const [activeTab, setActiveTabRaw] = useState<"stats" | "active" | "orders" | "history" | "transactions">("stats");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedTab = sessionStorage.getItem("seer_active_tab");
      if (savedTab) {
        setActiveTabRaw(savedTab as any);
      }
    }
  }, []);

  const setActiveTab = (tab: "stats" | "active" | "orders" | "history" | "transactions") => {
    setActiveTabRaw(tab);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("seer_active_tab", tab);
    }
  };

  const handleTabChange = (tab: "stats" | "active" | "orders" | "history" | "transactions") => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const historyCount = (trades || []).filter((t: any) => t.type === "REDEEM").length;
  const transactionsCount = (trades || []).length;

  if (!authenticated) {
    return (
      <div className="flex flex-col h-[100dvh]">
        <div className="w-full">
          <TopHeader />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center pb-32 px-4">
           <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
              <Wallet size={36} className="text-blue-500" />
           </div>
           <h1 className="text-2xl font-black italic text-white mb-2">连接进入预测�?/h1>
           <p className="text-white/50 text-sm text-center mb-8 max-w-[240px]">
             登陆以查看您的跨链钱包余额、过往战绩和当前仓位�?
           </p>
           <button onClick={login} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full max-w-[280px] py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all">
             登录
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8 min-h-[100dvh]">
      <div 
        className="sticky top-0 z-40 border-b border-white/5"
        style={{ background: "rgba(13,5,24,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div>
          <TopHeader />

          <div
            className="px-4 flex items-center gap-6 pb-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
            style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          >
          <button
            onClick={() => handleTabChange("stats")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{ color: activeTab === "stats" ? "#dee5ff" : "#a3aac4" }}
          >
            总览
            {activeTab === "stats" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{ background: "#6bff8f", boxShadow: "0 -2px 10px rgba(107,255,143,0.5)" }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("active")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{ color: activeTab === "active" ? "#dee5ff" : "#a3aac4" }}
          >
            持仓<span className="text-[12px] opacity-60 font-medium">({positions?.length || 0})</span>
            {activeTab === "active" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{ background: "#6bff8f", boxShadow: "0 -2px 10px rgba(107,255,143,0.5)" }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("orders")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{ color: activeTab === "orders" ? "#dee5ff" : "#a3aac4" }}
          >
            挂单<span className="text-[12px] opacity-60 font-medium">({openOrders?.length || 0})</span>
            {activeTab === "orders" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{ background: "#6bff8f", boxShadow: "0 -2px 10px rgba(107,255,143,0.5)" }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{ color: activeTab === "history" ? "#dee5ff" : "#a3aac4" }}
          >
            战绩<span className="text-[12px] opacity-60 font-medium">({historyCount})</span>
            {activeTab === "history" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{ background: "#6bff8f", boxShadow: "0 -2px 10px rgba(107,255,143,0.5)" }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("transactions")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{ color: activeTab === "transactions" ? "#dee5ff" : "#a3aac4" }}
          >
            明细<span className="text-[12px] opacity-60 font-medium">({transactionsCount})</span>
            {activeTab === "transactions" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{ background: "#6bff8f", boxShadow: "0 -2px 10px rgba(107,255,143,0.5)" }}
              />
            )}
          </button>
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        {activeTab === "stats" && (
          <ProfileOverview trades={trades} positions={positions} />
        )}
        {activeTab === "active" && (
          <ProfilePositions portfolioLoading={portfolioLoading} positions={positions} onSell={onSell} onLimitSell={onLimitSell} onRedeem={onRedeem} />
        )}
        {activeTab === "orders" && (
          <ProfileOrders portfolioLoading={portfolioLoading} openOrders={openOrders} onCancelOrder={onCancelOrder} />
        )}
        {activeTab === "history" && (
          <ProfileHistory portfolioLoading={portfolioLoading} trades={trades} />
        )}
        {activeTab === "transactions" && (
          <ProfileTransactions portfolioLoading={portfolioLoading} trades={trades} />
        )}
      </div>
    </div>
  );
}
