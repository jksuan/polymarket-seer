'use client';

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Wallet, Settings, Zap, ArrowDownToLine } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { SettingsDrawer } from "@/components/ui/SettingsDrawer";
import { DepositDrawer } from "@/components/ui/DepositDrawer";
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

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);

  const handleTabChange = (tab: "stats" | "active" | "orders" | "history" | "transactions") => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const historyCount = (trades || []).filter((t: any) => t.type === "REDEEM").length;
  const transactionsCount = (trades || []).length;

  // displayIdentifier is now pulled from usePolymarketAuth() to guarantee consistency

  if (!authenticated) {
    return (
      <div className="flex flex-col h-[100dvh]">
        <div className="flex items-center justify-between px-4 pt-4 mb-4">
           <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(173,255,47,0.4)]" style={{ background: 'linear-gradient(135deg,#ADFF2F,#00F0FF)' }}>
                 <div className="w-full h-full bg-[#0D0518] rounded-full flex items-center justify-center">
                    <Zap size={14} fill="#ADFF2F" color="#ADFF2F" />
                 </div>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 900, fontFamily: 'Inter', color: '#fff', letterSpacing: '-0.5px' }}>
                SEER<span style={{ color: '#ADFF2F' }}>.</span>SPORTS
              </span>
           </div>
           
           <div className="flex items-center gap-3">
              <button onClick={() => setSettingsOpen(true)} className="text-white/40 hover:text-white active:scale-90 transition-all">
                 <Settings size={20} />
              </button>
           </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center pb-32 px-4">
           <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mb-6">
              <Wallet size={36} className="text-blue-500" />
           </div>
           <h1 className="text-2xl font-black italic text-white mb-2">连接进入预测场</h1>
           <p className="text-white/50 text-sm text-center mb-8 max-w-[240px]">
             登陆以查看您的跨链钱包余额、过往战绩和当前仓位。
           </p>
           <button onClick={login} className="bg-blue-600 hover:bg-blue-500 text-white font-bold w-full max-w-[280px] py-4 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-95 transition-all">
             连接 / 注册钱包
           </button>
        </div>

        <SettingsDrawer 
          isOpen={settingsOpen} 
          onClose={() => setSettingsOpen(false)} 
          authenticated={false} 
        />
      </div>
    );
  }

  return (
    <div className="pb-8 min-h-[100dvh]">
      <div 
        className="sticky top-0 z-40 border-b border-white/5"
        style={{ background: "rgba(13,5,24,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-md mx-auto pt-4">
          <div className="flex items-center justify-between px-4 mb-4">
         <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center p-0.5 shadow-[0_0_10px_rgba(173,255,47,0.4)]" style={{ background: 'linear-gradient(135deg,#ADFF2F,#00F0FF)' }}>
              <div className="w-full h-full bg-[#0D0518] rounded-full flex items-center justify-center">
                <Zap size={12} fill="#ADFF2F" color="#ADFF2F" />
              </div>
            </div>
            <span style={{ fontSize: '16px', fontWeight: 900, fontFamily: 'Inter', color: '#fff', letterSpacing: '-0.5px' }}>
              SEER
            </span>
         </div>

         <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 mr-1">
               <div className="flex flex-col items-end justify-center">
                  <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-0.5">
                     可用余额
                  </span>
                  <span className="text-[15px] font-black text-[#ADFF2F] leading-none" style={{ textShadow: "0 0 10px rgba(173,255,47,0.4)" }}>
                     ${Number(usdcBalance || 0).toFixed(2)}
                  </span>
               </div>
               <button 
                  onClick={() => setDepositOpen(true)}
                  className="flex items-center gap-1 bg-[#ADFF2F] hover:bg-[#8CEE1C] text-[#0D0518] px-3 py-1.5 rounded-lg text-[12px] font-bold tracking-wider transition-all shadow-[0_0_12px_rgba(173,255,47,0.3)] active:scale-95"
               >
                  <ArrowDownToLine size={12} strokeWidth={2.5} />
                  充值
               </button>
            </div>

            <button 
               onClick={() => setSettingsOpen(true)}
               className="flex items-center justify-center pl-3 pr-1 border-l border-white/10 active:scale-95 transition-all outline-none"
            >
               <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#007AFF] flex items-center justify-center text-white font-black text-[14px] shadow-[0_0_12px_rgba(0,240,255,0.4)] shrink-0">
                  {displayIdentifier[0] === '@' ? displayIdentifier[1]?.toUpperCase() || 'S' : displayIdentifier[0]?.toUpperCase() || 'S'}
               </div>
            </button>
         </div>
          </div>

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

      <div className="max-w-md mx-auto px-4 mt-6">
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

      <SettingsDrawer 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        authenticated={true}
        onLogout={() => { onClearState(); }}
      />

      <DepositDrawer
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        proxyAddress={proxyAddress || ""}
      />
    </div>
  );
}
