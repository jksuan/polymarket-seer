'use client';

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, LogOut, RefreshCw, Zap, Settings, ArrowUpRight, Share2 } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, XAxis, CartesianGrid } from "recharts";
import { SettingsDrawer } from "@/components/ui/SettingsDrawer";
import { SellDrawer } from "@/components/ui/SellDrawer";
import { RedeemDrawer } from "@/components/ui/RedeemDrawer";


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

/**
 * Derive market status from position data.
 * Polymarket sets curPrice → 1.0 for winners, → 0.0 for losers once resolved.
 * We also check endDate to ensure the market has actually closed.
 */
function getMarketStatus(pos: any): "active" | "won" | "lost" | "resolving" {
  // Safely parse curPrice to a float. Default to -1.
  let cp = -1;
  if (pos.curPrice !== undefined && pos.curPrice !== null && pos.curPrice !== "") {
    cp = Number(pos.curPrice);
  } else if (pos.currentValue !== undefined && pos.currentValue !== null && pos.currentValue !== "") {
    // Some endpoints might return currentValue as 0 if lost
    if (pos.size > 0 && Number(pos.currentValue) === 0) cp = 0;
  }

  // 1. Definite Win/Loss bounded checks (handles early resolutions & floating point & string issues)
  // Polymarket pins resolution to exactly 1 or 0.
  if (cp >= 0 && cp <= 0.0001) return "lost";
  if (cp >= 0.9999) return "won";

  // 防线 1: 明确的关闭信号 (已关闭/已结算)
  if (pos.closed === true) return "resolving";

  // 防线 2: 权威的订单簿关停标志 (如字段存在)
  if (pos.enableOrderBook === false) return "resolving";

  // 防线 3 取消：官方 API 文档特别声明「不应仅凭 endDate 过期就硬禁用卖出按钮」。
  // 因 endDate 与订单簿真实关停之间没有绝对的即时同步关系。有些短期竞猜允许在 endDate 模糊期内继续交易。

  // 防线 4: 最后放行前，确保后台活跃标记正常
  if (pos.active === false) return "resolving";

  // 所有关卡均通过，确认为真正可交易活盘
  return "active";
}

export function ProfilePage({
  authenticated, login, logout, user, usdcBalance, isRefreshingBalance, fetchBalance,
  proxyAddress, positions, openOrders, trades, portfolioLoading, onClearState, walletAddress,
  onSell, onLimitSell, onCancelOrder, onRedeem
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<"stats" | "active" | "orders" | "history" | "transactions">("stats");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sellDrawerOpen, setSellDrawerOpen] = useState(false);
  const [activeSellPos, setActiveSellPos] = useState<any>(null);
  const [redeemDrawerOpen, setRedeemDrawerOpen] = useState(false);
  const [activeRedeemPos, setActiveRedeemPos] = useState<any>(null);


  /**
   * 切换选项卡处理函数
   * 说明：除了更新激活 tab 状态外，还会驱使视口平滑滚动回 Tab 栏顶部。
   * 这样做是为了防止因为新 Tab 内容较少导致页面高度坍塌，从而引起浏览器滚动条位置剧烈跳变。
   */
  const handleTabChange = (tab: "stats" | "active" | "orders" | "history" | "transactions") => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleShare = async (title: string, text: string) => {
    const url = window.location.origin;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.warn("分享被取消或失败", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${title}\n${text}\n${url}`);
        alert("文案及链接已复制到剪贴板");
      } catch (err) {
        console.error("复制失败", err);
      }
    }
  };

  // Derived counts for tabs
  const historyCount = (trades || []).filter((t: any) => t.type === "REDEEM").length;
  const transactionsCount = (trades || []).length;

  const displayIdentifier = user?.twitter?.username 
    ? `@${user.twitter.username}`
    : user?.email?.address
      ? user.email.address
      : walletAddress 
        ? shortenAddress(walletAddress)
        : "Guest";

  // --- Dynamic Stats Calculations ---
  // 1. Current Holdings
  let currentInvested = 0;
  let currentValue = 0;
  let distributionData: {name: string, value: number, color: string}[] = [];

  if (positions) {
    positions.forEach((pos: any) => {
      currentInvested += Number(pos.initialValue || pos.totalBought || 0);
      currentValue += Number(pos.currentValue || 0);
    });

    // Distribution (Top 3 markets by currentValue + Other)
    const sorted = [...positions].sort((a, b) => Number(b.currentValue || 0) - Number(a.currentValue || 0));
    const colors = ["#FF6B00", "#00F0FF", "#ADFF2F", "#8B5CF6"];
    sorted.slice(0, 3).forEach((pos, idx) => {
      let label = (pos.title || pos.question || "Market").replace(/([（\(].*?[）\)])/g, '').trim().substring(0, 8);
      distributionData.push({ name: label, value: Number((Number(pos.currentValue || 0)).toFixed(2)), color: colors[idx] });
    });
    if (sorted.length > 3) {
      const otherValue = sorted.slice(3).reduce((acc, pos) => acc + Number(pos.currentValue || 0), 0);
      distributionData.push({ name: "其他", value: Number(otherValue.toFixed(2)), color: colors[3] });
    }
  }

  if (distributionData.length === 0) {
    distributionData = [{ name: "空仓", value: 1, color: "#8B5CF6" }]; 
  }

  // 2. Historical Cash Flow
  let historyInvested = 0;
  let historyRevenue = 0;

  if (trades && trades.length > 0) {
    trades.forEach((t: any) => {
      const usdc = Number(t.usdcSize || 0);
      if (t.type === "TRADE") {
        if (t.side === "BUY") {
          historyInvested += usdc;
        } else if (t.side === "SELL") {
          historyRevenue += usdc;
        }
      } else if (t.type === "REDEEM") {
        historyRevenue += usdc;
      }
    });
  }

  const historyNetProfit = historyRevenue - historyInvested;
  const currentUnrealizedPnl = currentValue - currentInvested;
  const currentUnrealizedPct = currentInvested > 0 ? (currentUnrealizedPnl / currentInvested) * 100 : 0;


  if (!authenticated) {
    return (
      <div className="flex flex-col h-[100dvh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 pt-4 mb-4">
           {/* Logo */}
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
           
           {/* Right side Settings */}
           <div className="flex items-center gap-3">
              <button onClick={() => setSettingsOpen(true)} className="text-white/40 hover:text-white active:scale-90 transition-all">
                 <Settings size={20} />
              </button>
           </div>
        </div>

        {/* Center Auth Prompt */}
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
      {/* --- 联合吸顶 App Header: 将页眉和 Tabs 合并 --- */}
      <div 
        className="sticky top-0 z-40 border-b border-white/5"
        style={{ background: "rgba(13,5,24,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="max-w-md mx-auto pt-4">
          {/*页眉 (Logo + 会员信息)*/}
          <div className="flex items-center justify-between px-4 mb-4">
         {/* Left: Logo */}
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

         {/* Right: Profile cluster */}
         <div className="flex items-center gap-2">
            {/* Setting Button here! Left of Avatar */}
            <button onClick={() => setSettingsOpen(true)} className="mr-1 w-9 h-9 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white flex items-center justify-center active:scale-95 transition-all flex-shrink-0">
               <Settings size={16} />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#007AFF] flex items-center justify-center text-white font-black text-[13px] shadow-[0_0_10px_rgba(0,240,255,0.4)] flex-shrink-0">
               {displayIdentifier[0] === '@' ? displayIdentifier[1]?.toUpperCase() || 'S' : displayIdentifier[0]?.toUpperCase() || 'S'}
            </div>
            <div className="flex flex-col justify-center max-w-[120px]">
               <span className="text-white font-bold text-sm truncate">
                  {displayIdentifier}
               </span>
               <span className="text-white/40 text-[10px] font-mono leading-none truncate mt-0.5">
                  {proxyAddress ? shortenAddress(proxyAddress) : shortenAddress(walletAddress || '')}
               </span>
            </div>
         </div>
          </div>

          {/*Tabs 导航区*/}
          <div
            className="px-4 flex items-center gap-6 pb-2 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
            style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
          >
          <button
            onClick={() => handleTabChange("stats")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{
              color:
                activeTab === "stats" ? "#dee5ff" : "#a3aac4",
            }}
          >
            总览
            {activeTab === "stats" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{
                  background: "#6bff8f",
                  boxShadow:
                    "0 -2px 10px rgba(107,255,143,0.5)",
                }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("active")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{
              color:
                activeTab === "active" ? "#dee5ff" : "#a3aac4",
            }}
          >
            持仓<span className="text-[12px] opacity-60 font-medium">({positions?.length || 0})</span>
            {activeTab === "active" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{
                  background: "#6bff8f",
                  boxShadow:
                    "0 -2px 10px rgba(107,255,143,0.5)",
                }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("orders")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{
              color:
                activeTab === "orders" ? "#dee5ff" : "#a3aac4",
            }}
          >
            挂单<span className="text-[12px] opacity-60 font-medium">({openOrders?.length || 0})</span>
            {activeTab === "orders" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{
                  background: "#6bff8f",
                  boxShadow:
                    "0 -2px 10px rgba(107,255,143,0.5)",
                }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{
              color:
                activeTab === "history" ? "#dee5ff" : "#a3aac4",
            }}
          >
            战绩<span className="text-[12px] opacity-60 font-medium">({historyCount})</span>
            {activeTab === "history" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{
                  background: "#6bff8f",
                  boxShadow:
                    "0 -2px 10px rgba(107,255,143,0.5)",
                }}
              />
            )}
          </button>
          <button
            onClick={() => handleTabChange("transactions")}
            className="relative pb-2 font-bold text-[15px] transition-colors shrink-0"
            style={{
              color:
                activeTab === "transactions"
                  ? "#dee5ff"
                  : "#a3aac4",
            }}
          >
            明细<span className="text-[12px] opacity-60 font-medium">({transactionsCount})</span>
            {activeTab === "transactions" && (
              <motion.div
                layoutId="activeTabIndicator"
                className="absolute bottom-[-9px] left-0 w-full h-[3px] rounded-t-md"
                style={{
                  background: "#6bff8f",
                  boxShadow:
                    "0 -2px 10px rgba(107,255,143,0.5)",
                }}
              />
            )}
          </button>
          </div>
        </div>
      </div>

<SellDrawer 
        isOpen={sellDrawerOpen}
        onClose={() => setSellDrawerOpen(false)}
        position={activeSellPos}
        onMarketSell={(tokenId, shares) => {
          setSellDrawerOpen(false);
          onSell(tokenId, shares);
        }}
        onLimitSell={(tokenId, shares, price) => {
          setSellDrawerOpen(false);
          onLimitSell(tokenId, shares, price);
        }}
      />

      <RedeemDrawer
        isOpen={redeemDrawerOpen}
        onClose={() => setRedeemDrawerOpen(false)}
        position={activeRedeemPos}
        onConfirm={(pos) => {
          setRedeemDrawerOpen(false);
          onRedeem(pos);
        }}
      />

      <div className="max-w-md mx-auto px-4 mt-6">
        {/* Tab Content */}
        {activeTab === "stats" && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-4"
          >
      <div className="flex flex-col gap-3 w-full relative z-20">
        
        {/* ── 历史流水账本 (Top Card) ── */}
        <div
          className="p-4 rounded-3xl relative overflow-hidden flex flex-col justify-between gap-4"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Main Profit Number */}
          <div className="flex flex-col relative z-10 h-full">
            <div
              style={{
                fontSize: "11px", fontFamily: "Inter", fontWeight: 600,
                color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em",
              }}
            >
              全周期总净盈亏 (Net Cash)
            </div>
            <div className="flex items-baseline gap-2 mt-1 flex-1">
              <span
                style={{
                  fontSize: "32px", fontFamily: "Inter", fontWeight: 900,
                  color: historyNetProfit >= 0 ? "#ADFF2F" : "#ff6b6b",
                  letterSpacing: "-0.02em",
                  textShadow: historyNetProfit >= 0 ? "0 0 16px rgba(173,255,47,0.3)" : "0 0 16px rgba(255,107,107,0.3)",
                }}
              >
                {historyNetProfit >= 0 ? '+' : '-'}${Math.abs(historyNetProfit).toFixed(2)}
              </span>
            </div>
            
            {/* Supporting Breakdown */}
            <div className="flex justify-between items-end border-t border-white/10 pt-2 mt-auto">
              <div>
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">总投入(买入)</span>
                <div className="text-[13px] font-black text-white/80">${historyInvested.toFixed(2)}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-white/30 uppercase tracking-widest font-bold">总收入(卖出+兑换)</span>
                <div className="text-[13px] font-black text-white/80">${historyRevenue.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 当前持仓阵地 (Bottom Card) ── */}
        <div
          className="p-4 rounded-3xl relative overflow-hidden flex flex-col gap-3 w-full"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          }}
        >
          {/* Subtle background glow based on unrealized PnL */}
          <div className={`absolute -right-10 -bottom-10 w-32 h-32 opacity-10 blur-3xl rounded-full ${currentUnrealizedPnl >= 0 ? 'bg-[#ADFF2F]' : 'bg-[#ff6b6b]'}`} />

          {/* Title */}
          <div
            className="relative z-10 border-b border-white/10 pb-3 mb-1"
            style={{
              fontSize: "11px", fontFamily: "Inter", fontWeight: 600,
              color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em",
            }}
          >
            当前持仓
          </div>

          <div className="flex w-full">
            <div className="flex-1 flex flex-col items-center relative z-10 border-r border-white/10">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">总本金</div>
              <div className="text-[16px] font-black text-white">${currentInvested.toFixed(2)}</div>
            </div>
            
            <div className="flex-1 flex flex-col items-center relative z-10 border-r border-white/10">
              <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">总价值</div>
              <div className="text-[16px] font-black text-[#00F0FF]">${currentValue.toFixed(2)}</div>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center relative z-10">
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: currentUnrealizedPnl >= 0 ? "rgba(173,255,47,0.7)" : "rgba(255,107,107,0.7)" }}>浮动盈亏</div>
              <div className="flex flex-col items-center">
                 <div className={`text-[15px] font-black leading-none ${currentUnrealizedPnl >= 0 ? 'text-[#ADFF2F]' : 'text-[#ff6b6b]'}`}>
                   {currentUnrealizedPnl >= 0 ? '+' : '-'}${Math.abs(currentUnrealizedPnl).toFixed(2)}
                 </div>
                 <div className={`text-[10px] font-bold mt-1 leading-none ${currentUnrealizedPnl > 0 ? 'text-[#ADFF2F]/70' : currentUnrealizedPnl < 0 ? 'text-[#ff6b6b]/70' : 'text-white/30'}`}>
                   ({currentUnrealizedPnl > 0 ? '+' : ''}{currentUnrealizedPct.toFixed(1)}%)
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Domain Distribution (PieChart) ── */}
      <div className="w-full mb-6 relative z-20">
        <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
              收益构成
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              {distributionData.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}80` }} />
                  <span className="text-[12px] font-bold text-white/80 w-12 truncate">{item.name}</span>
                  <span className="text-[13px] font-black" style={{ color: item.color }}>${item.value !== 1 ? item.value : '0.00'}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[110px] h-[110px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  innerRadius={36}
                  outerRadius={52}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">总价值</span>
              <span className="text-[13px] font-black text-white mt-0.5">${currentValue.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
          </motion.div>
        )}
        {activeTab === "active" && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-3"
          >
            {portfolioLoading && (
              <div className="text-white/50 text-sm text-center mt-10">正在同步链上持仓数据...</div>
            )}

            {!portfolioLoading && (!positions || positions.length === 0) && (
              <div className="text-white/30 text-sm text-center mt-10">空空如也，快去预测盈亏吧！</div>
            )}

            {!portfolioLoading && positions && positions.map((pos: any, idx: number) => {
              const avgPct = ((pos.avgPrice || 0) * 100).toFixed(1);
              const curPct = ((pos.curPrice || 0) * 100).toFixed(1);
              const pnl = pos.cashPnl || 0;
              const pnlPct = pos.percentPnl || 0;
              const isProfitable = pnl >= 0;
              const initialVal = pos.initialValue || pos.totalBought || 0;
              const currentVal = pos.currentValue || 0;
              const expectedReturn = pos.size || 0;
              const displayTitle = (pos.title || "Unknown Market").replace(/\.+$/, '');

              return (
                <div
                  key={`${pos.asset}-${idx}`}
                  translate="no"
                  className="p-2.5 rounded-xl notranslate"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >

                  {/* Market info container: Icon + (Title & Badge) */}
                  <div className="flex items-center gap-3 px-0.5">
                    {pos.icon && (
                      <img
                        src={pos.icon}
                        alt=""
                        className="w-[42px] h-[42px] rounded-[10px] object-cover shrink-0 bg-white"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    )}
                    
                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <div className="text-[11.5px] sm:text-[12px] font-normal text-white tracking-tight truncate w-full py-0.5" style={{ lineHeight: '1.4' }}>
                        {displayTitle}
                      </div>
                      
                      {pos.outcome && (
                        <div className="mt-0.5">
                          <span
                            className="inline-flex items-center px-1.5 py-[3px] rounded-md text-[11px] font-bold leading-none"
                            style={{
                              background: "rgba(107,255,143,0.12)",
                              border: "1px solid rgba(107,255,143,0.25)",
                              color: "#6bff8f",
                            }}
                          >
                            {pos.outcome}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="mt-4 px-0.5 flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4] whitespace-nowrap">投入本金</span>
                        <span className="text-[15px] font-bold text-[#a3aac4] tracking-tight">${Number(initialVal).toFixed(2)}</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4] whitespace-nowrap">当前价值</span>
                        <div className="flex flex-col leading-none">
                          <span className="text-[16px] font-bold text-[#dee5ff]">${Number(currentVal).toFixed(2)}</span>
                          <span className={`text-[11px] font-bold mt-1.5 ${isProfitable ? 'text-[#6bff8f]' : 'text-[#ff6b6b]'}`}>
                            {isProfitable ? '+' : '-'}${Math.abs(Number(pnl)).toFixed(2)} ({Math.abs(Number(pnlPct)).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 items-end text-right">
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4] whitespace-nowrap">预期回报</span>
                        <span className="text-[15px] font-bold text-[#a3aac4] tracking-tight">${Number(expectedReturn).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Probability Change & Actions Row */}
                    <div className="flex items-end justify-between mt-2 pt-3 border-t border-white/5">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4]">胜率变化</span>
                        <div className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
                          <span className="text-[#a3aac4]">{avgPct}%</span>
                          <span className="text-[#60a5fa]">→</span>
                          <span className="text-[#dee5ff]">{curPct}%</span>
                        </div>
                      </div>

                      {/* Action buttons — 3-state based on market status */}
                      {(() => {
                        const status = getMarketStatus(pos);
                        return (
                          <div className="flex items-center gap-2 mb-0.5">
                            {status === "active" && (
                              <button
                                onClick={() => {
                                  setActiveSellPos(pos);
                                  setSellDrawerOpen(true);
                                }}
                                className="bg-transparent border border-[#0099FF]/50 text-[#0099FF] text-[13px] font-bold px-5 py-1.5 rounded-[6px] hover:bg-[#0099FF]/10 active:scale-95 transition-all leading-none h-[28px] shadow-[0_0_12px_rgba(0,153,255,0.15)] tracking-wide"
                              >
                                卖出
                              </button>
                            )}

                            {status === "won" && (
                              <button
                                onClick={() => {
                                  setActiveRedeemPos({ ...pos, _marketStatus: "won" });
                                  setRedeemDrawerOpen(true);
                                }}
                                className="text-[13px] font-bold px-4 py-1.5 rounded-[6px] active:scale-95 transition-all leading-none h-[28px] tracking-wide"
                                style={{
                                  background: "linear-gradient(90deg, #7edd00, #ADFF2F)",
                                  color: "#0D0518",
                                  boxShadow: "0 0 14px rgba(173,255,47,0.3)",
                                }}
                              >
                                🏆 兑换
                              </button>
                            )}

                            {status === "lost" && (
                              <button
                                onClick={() => {
                                  setActiveRedeemPos({ ...pos, _marketStatus: "lost" });
                                  setRedeemDrawerOpen(true);
                                }}
                                className="bg-transparent border border-white/20 text-white/40 text-[13px] font-bold px-4 py-1.5 rounded-[6px] hover:bg-white/5 active:scale-95 transition-all leading-none h-[28px] tracking-wide"
                              >
                                📦 归档
                              </button>
                            )}

                            {status === "resolving" && (
                              <button
                                disabled
                                className="bg-[#192540] border border-white/10 text-[#a3aac4]/60 text-[13px] font-bold px-4 py-1.5 rounded-[6px] cursor-not-allowed leading-none h-[28px] tracking-wide flex items-center gap-1.5"
                              >
                                ⏳ 结果判定中
                              </button>
                            )}

                            <button 
                              onClick={() => handleShare(
                                "SEER.SPORTS 预测",
                                `我正在关注「${displayTitle}」，目前关注度 ${curPct}%，快来看看！`
                              )}
                              className="w-[28px] h-[28px] rounded-full bg-[#192540] flex items-center justify-center text-[#60a5fa] hover:bg-[#203050] transition-colors active:scale-95"
                            >
                              <Share2 size={14} />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "orders" && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-3"
          >

            {/* Loading state */}
            {portfolioLoading && (!openOrders || openOrders.length === 0) && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#60a5fa] border-t-transparent rounded-full animate-spin" />
                <span className="ml-3 text-sm text-[#a3aac4]">加载挂单中...</span>
              </div>
            )}

            {/* Empty state */}
            {!portfolioLoading && (!openOrders || openOrders.length === 0) && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="text-4xl mb-3 opacity-40">📋</div>
                <div className="text-sm text-[#a3aac4]">暂无挂单</div>
                <div className="text-xs text-[#a3aac4]/60 mt-1">您当前没有未成交的订单</div>
              </div>
            )}

            {/* Dynamic order cards */}
            {openOrders && openOrders.length > 0 && openOrders.map((order: any, idx: number) => {
              const price = Number(order.price) || 0;
              const originalSize = Number(order.original_size) || 0;
              const sizeMatched = Number(order.size_matched) || 0;
              const filledAmount = (sizeMatched * price).toFixed(2);
              const totalAmount = (originalSize * price).toFixed(2);
              const displayTitle = order.title || (order.market && !order.market.startsWith('0x') ? order.market : '未知市场');

              // Expiration display
              let expirationDisplay = '取消前有效';
              if (order.expiration && Number(order.expiration) > 0) {
                const expTime = new Date(Number(order.expiration) * 1000);
                const now = new Date();
                const diffMs = expTime.getTime() - now.getTime();
                if (diffMs <= 0) {
                  expirationDisplay = '已过期';
                } else if (diffMs < 3600000) {
                  expirationDisplay = `${Math.ceil(diffMs / 60000)}分钟后`;
                } else if (diffMs < 86400000) {
                  expirationDisplay = `${Math.ceil(diffMs / 3600000)}小时后`;
                } else {
                  expirationDisplay = `${Math.ceil(diffMs / 86400000)}天后`;
                }
              }

              // Side label
              const isBuy = order.side === 'BUY';

              return (
                <div
                  key={order.id || idx}
                  className="p-3.5 rounded-xl notranslate"
                  translate="no"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  {/* Market info: Icon + Title + Status badge */}
                  <div className="flex items-center gap-3 px-0.5">
                    {order.icon && (
                      <img
                        src={order.icon}
                        alt=""
                        className="w-[42px] h-[42px] rounded-[10px] object-cover shrink-0 bg-white"
                        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                    )}

                    <div className="flex flex-col items-start min-w-0 flex-1">
                      <div className="text-[11.5px] sm:text-[12px] font-normal text-white tracking-tight truncate w-full py-0.5" style={{ lineHeight: '1.4' }}>
                        {displayTitle || '未知市场'}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        {/* Side: plain text */}
                        <span className="text-[11px] font-medium text-[#a3aac4]">
                          {isBuy ? 'Buy' : 'Sell'}
                        </span>

                        {/* Outcome badge: Yes=green, No=red, other=blue */}
                        {order.outcome && (() => {
                          const outcomeLC = String(order.outcome).toLowerCase();
                          const isYes = outcomeLC === 'yes';
                          const isNo = outcomeLC === 'no';
                          const pillBg = isYes ? 'rgba(107,255,143,0.12)' : isNo ? 'rgba(255,107,107,0.12)' : 'rgba(96,165,250,0.12)';
                          const pillBorder = isYes ? '1px solid rgba(107,255,143,0.25)' : isNo ? '1px solid rgba(255,107,107,0.25)' : '1px solid rgba(96,165,250,0.25)';
                          const pillColor = isYes ? '#6bff8f' : isNo ? '#ff6b6b' : '#60a5fa';
                          return (
                            <span
                              className="inline-flex items-center px-1.5 py-[3px] rounded-md text-[10px] font-bold leading-none"
                              style={{ background: pillBg, border: pillBorder, color: pillColor }}
                            >
                              {order.outcome}
                            </span>
                          );
                        })()}

                      </div>
                    </div>

                    {/* Status badge — inline right */}
                    <div className="flex items-center gap-1.5 bg-[#192540] px-2 py-1 rounded-full border border-white/10 shrink-0 self-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse" />
                      <span className="text-[10px] font-bold text-[#60a5fa] tracking-wider uppercase">
                        排队中
                      </span>
                    </div>
                  </div>

                  {/* Stats row: grid layout with cancel button */}
                  <div className="mt-3.5 px-0.5 pt-3 border-t border-white/5">
                    <div className="grid grid-cols-4 gap-3 items-end">
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4] whitespace-nowrap">已成交</span>
                        <span className="text-[15px] font-bold text-[#6bff8f] tracking-tight">${filledAmount} <span className="text-[#a3aac4] text-[12px] font-normal">/ ${totalAmount}</span></span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4] whitespace-nowrap">目标胜率</span>
                        <span className="text-[15px] font-bold text-[#dee5ff] tracking-tight">{(price * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4] whitespace-nowrap">到期时间</span>
                        <span className="text-[13px] font-bold text-[#a3aac4] tracking-tight whitespace-nowrap">{expirationDisplay}</span>
                      </div>
                      <div className="flex justify-end">
                        <button 
                          onClick={() => onCancelOrder(order.id)} 
                          className="bg-transparent border border-[#ff4444]/70 text-[#ff4444] text-[13px] font-bold px-4 py-1.5 rounded-[6px] hover:bg-[#ff4444]/15 active:scale-95 transition-all leading-none h-[28px] shadow-[0_0_10px_rgba(255,26,26,0.3)] shrink-0"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {activeTab === "history" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex flex-col gap-3"
          >
            {portfolioLoading ? (
              <div className="text-center text-[#a3aac4] text-[14px] py-10">正在同步历史数据...</div>
            ) : trades.length === 0 ? (
              <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无历史战绩</div>
            ) : (
              (() => {
                /**
                 * 数据聚合处理：
                 * 1. buyCostByCondId: 统计每个 conditionId 的累计买入成本（用于计算亏损额）。
                 * 2. buyPriceWeightedByCondId: 统计累计成本和累计份额（用于计算加权平均入场胜率）。
                 * 3. buyFirstTsByCondId: 记录每个 conditionId 的最早 BUY 时间戳（用于计算持仓历时）。
                 */
                const buyCostByCondId: Record<string, number> = {};
                const buyPriceWeightedByCondId: Record<string, { totalCost: number; totalShares: number }> = {};
                const buyFirstTsByCondId: Record<string, number> = {};
                trades.forEach((t: any) => {
                  if (t.type === "TRADE" && t.side === "BUY" && t.conditionId) {
                    buyCostByCondId[t.conditionId] = (buyCostByCondId[t.conditionId] || 0) + Number(t.usdcSize || 0);
                    const cost = Number(t.usdcSize || 0);
                    const shares = Number(t.size || 0);
                    if (!buyPriceWeightedByCondId[t.conditionId]) {
                      buyPriceWeightedByCondId[t.conditionId] = { totalCost: 0, totalShares: 0 };
                    }
                    buyPriceWeightedByCondId[t.conditionId].totalCost += cost;
                    buyPriceWeightedByCondId[t.conditionId].totalShares += shares;
                    const ts = Number(t.timestamp || 0);
                    if (ts > 0 && (!buyFirstTsByCondId[t.conditionId] || ts < buyFirstTsByCondId[t.conditionId])) {
                      buyFirstTsByCondId[t.conditionId] = ts;
                    }
                  }
                });
                // 过滤出 REDEEM 条目，即已结算的最终结果（历史战绩只展示结算项）
                const historyItems = [...trades]
                  .filter((t: any) => t.type === "REDEEM")
                  .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

                if (historyItems.length === 0) {
                  return <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无历史战绩</div>;
                }

                return historyItems.map((item: any, idx: number) => {
                  const usdcAmt = Number(item.usdcSize || 0);
                  const isWon = usdcAmt > 0.01;

                  // For losses: look up total BUY cost for this conditionId
                  const lossCost = !isWon ? (buyCostByCondId[item.conditionId] || 0) : 0;

                  // Entry win rate: weighted avg buy price → percentage
                  const wpData = buyPriceWeightedByCondId[item.conditionId];
                  const entryPct = wpData && wpData.totalShares > 0
                    ? ((wpData.totalCost / wpData.totalShares) * 100).toFixed(1)
                    : item.price != null
                      ? (Number(item.price) * 100).toFixed(1)
                      : null;

                  // 计算持仓历时：从该 Condition 下最早的一笔 BUY 到当前 REDEEM 的结算时间
                  const redeemTs = Number(item.timestamp || 0);
                  const buyTs = buyFirstTsByCondId[item.conditionId] || 0;
                  let holdingStr = "";
                  if (redeemTs > 0 && buyTs > 0 && redeemTs > buyTs) {
                    const diffSec = redeemTs - buyTs;
                    const days = Math.floor(diffSec / 86400);
                    const hours = Math.floor((diffSec % 86400) / 3600);
                    if (days > 0) {
                      holdingStr = `${days}天${hours > 0 ? hours + "小时" : ""}`;
                    } else if (hours > 0) {
                      holdingStr = `${hours}小时`;
                    } else {
                      const mins = Math.floor(diffSec / 60);
                      holdingStr = mins > 0 ? `${mins}分钟` : "不足1分钟";
                    }
                  }

                  // Timestamp
                  const ts = item.timestamp ? new Date(item.timestamp * 1000) : null;
                  const timeStr = ts
                    ? `${ts.getFullYear()}/${String(ts.getMonth()+1).padStart(2,"0")}/${String(ts.getDate()).padStart(2,"0")} ${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}`
                    : "";

                  // Outcome badge
                  const outcome = item.outcome || "";
                  const outcomeLC = outcome.toLowerCase();
                  const outcomeBg = outcomeLC === "yes" ? "rgba(107,255,143,0.12)" : outcomeLC === "no" ? "rgba(255,107,107,0.12)" : "rgba(96,165,250,0.12)";
                  const outcomeBorder = outcomeLC === "yes" ? "1px solid rgba(107,255,143,0.25)" : outcomeLC === "no" ? "1px solid rgba(255,107,107,0.25)" : "1px solid rgba(96,165,250,0.25)";
                  const outcomeColor = outcomeLC === "yes" ? "#6bff8f" : outcomeLC === "no" ? "#ff6b6b" : "#60a5fa";

                  return (
                    <div
                      key={item.transactionHash || idx}
                      className="p-3.5 rounded-xl relative overflow-hidden"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >

                      {/* Top row: time + 赢/输 badge */}
                      <div className="flex items-center justify-between mb-3 relative z-10">
                        <span className="text-[11px] text-[#a3aac4]/70 font-medium">{timeStr}</span>
                        <span
                          className="px-3 py-1 rounded-lg text-[12px] font-bold leading-none"
                          style={isWon
                            ? { background: "#6bff8f", color: "#091328" }
                            : { background: "rgba(255,107,107,0.15)", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.3)" }
                          }
                        >
                          {isWon ? "🏆 赢" : "输"}
                        </span>
                      </div>

                      {/* Market info */}
                      <div className="flex items-center gap-3 relative z-10">
                        {item.icon && (
                          <img
                            src={item.icon}
                            alt=""
                            className="w-[40px] h-[40px] rounded-[10px] object-cover shrink-0 bg-white"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#dee5ff] truncate leading-snug notranslate" translate="no">
                            {item.title || "未知市场"}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {outcome && (
                              <span
                                className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold leading-none"
                                style={{ background: outcomeBg, border: outcomeBorder, color: outcomeColor }}
                              >
                                {outcome}
                              </span>
                            )}
                            {item.price != null && (
                              <span className="text-[11px] text-[#a3aac4]/70">
                                @ {(Number(item.price) * 100).toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 下方统计栏：单行排列内容包括 盈亏额 | 入场胜率 | 持仓时长 | 分享按钮 */}
                      <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-white/5 relative z-10 gap-2">
                        {/* 1. 盈利/亏损金额 */}
                        <div className="flex flex-col shrink-0">
                          <span className="text-[9px] font-bold text-[#a3aac4]/50 uppercase tracking-[0.8px] mb-0.5">
                            {isWon ? "盈利" : "亏损"}
                          </span>
                          <span className="text-[18px] font-bold tracking-tight leading-none" style={{ color: isWon ? "#6bff8f" : "#ff6b6b" }}>
                            {isWon ? `+$${usdcAmt.toFixed(2)}` : `-$${lossCost.toFixed(2)}`}
                          </span>
                        </div>

                        {/* 2. 入场平均胜率 (通过加权买入价计算) */}
                        {entryPct != null && (
                          <div className="flex flex-col items-center shrink-0">
                            <span className="text-[9px] font-bold text-[#a3aac4]/50 uppercase tracking-[0.8px] mb-0.5">入场胜率</span>
                            <span className="text-[13px] font-bold text-[#a3aac4]/80">@ {entryPct}%</span>
                          </div>
                        )}

                        {/* 3. 持仓历时 */}
                        {holdingStr && (
                          <div className="flex flex-col items-center shrink-0">
                            <span className="text-[9px] font-bold text-[#a3aac4]/50 uppercase tracking-[0.8px] mb-0.5">持仓历时</span>
                            <span className="text-[13px] font-bold text-[#a3aac4]/80">{holdingStr}</span>
                          </div>
                        )}

                        {/* 4. 分享按钮：针对获胜和亏损通过色系区分反馈预期 */}
                        {isWon ? (
                          <button 
                            onClick={() => handleShare(
                              "SEER.SPORTS 胜利战报",
                              `我在「${item.title || "未知市场"}」中成功预测，实现盈利 $${usdcAmt.toFixed(2)}${entryPct ? `，入场精准度 ${entryPct}%` : ''}！胜算满满！`
                            )}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#192540] text-[#60a5fa] hover:bg-[#203050] transition-colors font-bold text-[12px] active:scale-95 border border-[#60a5fa]/20 shrink-0"
                          >
                            🎉 分享胜利
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleShare(
                              "SEER.SPORTS 交易复盘",
                              `在「${item.title || "未知市场"}」预测失利，当期建仓精确度 ${entryPct || '--'}%，吃一堑长一智，准备再战！`
                            )}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ff9966]/10 text-[#ff9966] hover:bg-[#ff9966]/20 transition-colors font-bold text-[12px] active:scale-95 border border-[#ff9966]/30 shrink-0"
                          >
                            📝 分享复盘
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </motion.div>
        )}

        {activeTab === "transactions" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex flex-col gap-3"
          >
            {portfolioLoading ? (
              <div className="text-center text-[#a3aac4] text-[14px] py-10">正在同步交易记录...</div>
            ) : trades.length === 0 ? (
              <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无交易记录</div>
            ) : (
              (() => {
                const txItems = [...trades]
                  .filter((t: any) => t.type === "TRADE" || t.type === "REDEEM")
                  .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

                if (txItems.length === 0) {
                  return <div className="text-center text-[#a3aac4] text-[14px] py-10">暂无交易记录</div>;
                }

                return txItems.map((item: any, idx: number) => {
                  const usdcAmt = Number(item.usdcSize || 0);
                  const isRedeem = item.type === "REDEEM";
                  const isBuy = item.side === "BUY";
                  const isWonRedeem = isRedeem && usdcAmt > 0.01;

                  // Type badge config
                  let txLabel = "其他";
                  let txColor = "#a3aac4";
                  let txBg = "rgba(255,255,255,0.07)";
                  if (isBuy) { txLabel = "买入"; txColor = "#60a5fa"; txBg = "rgba(96,165,250,0.12)"; }
                  else if (item.side === "SELL") { txLabel = "卖出"; txColor = "#fb923c"; txBg = "rgba(251,146,60,0.12)"; }
                  else if (isWonRedeem) { txLabel = "兑换"; txColor = "#6bff8f"; txBg = "rgba(107,255,143,0.12)"; }
                  else if (isRedeem) { txLabel = "归档"; txColor = "#a3aac4"; txBg = "rgba(255,255,255,0.07)"; }

                  // Amount: BUY is a cost (red -), everything else is income (green +)
                  const amtDisplay = isBuy ? `-$${usdcAmt.toFixed(2)}` : `+$${usdcAmt.toFixed(2)}`;
                  const amtColor = isBuy ? "#ff6b6b" : usdcAmt > 0.01 ? "#6bff8f" : "#a3aac4";

                  // Timestamp
                  const ts = item.timestamp ? new Date(item.timestamp * 1000) : null;
                  const timeStr = ts
                    ? `${ts.getFullYear()}/${String(ts.getMonth()+1).padStart(2,"0")}/${String(ts.getDate()).padStart(2,"0")} ${String(ts.getHours()).padStart(2,"0")}:${String(ts.getMinutes()).padStart(2,"0")}`
                    : "";

                  // Outcome badge
                  const outcome = item.outcome || "";
                  const outcomeLC = outcome.toLowerCase();
                  const outcomePill = outcomeLC === "yes"
                    ? { bg: "rgba(107,255,143,0.12)", border: "1px solid rgba(107,255,143,0.25)", color: "#6bff8f" }
                    : outcomeLC === "no"
                    ? { bg: "rgba(255,107,107,0.12)", border: "1px solid rgba(255,107,107,0.25)", color: "#ff6b6b" }
                    : { bg: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.25)", color: "#60a5fa" };

                  return (
                    <div
                      key={item.transactionHash || idx}
                      className="p-3 rounded-xl flex items-center gap-3"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      {/* Type badge */}
                      <div className="w-[42px] shrink-0">
                        <div
                          className="text-[11px] font-bold py-1.5 rounded-md text-center w-full leading-none"
                          style={{ color: txColor, background: txBg }}
                        >
                          {txLabel}
                        </div>
                      </div>

                      {/* Market info */}
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        {item.icon && (
                          <img
                            src={item.icon}
                            alt=""
                            className="w-[28px] h-[28px] rounded-[6px] object-cover shrink-0 bg-white"
                            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div
                            className="text-[12px] font-semibold text-[#dee5ff] truncate notranslate"
                            translate="no"
                          >
                            {item.title || "未知市场"}
                          </div>
                          {outcome && (
                            <span
                              className="inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold leading-none mt-0.5"
                              style={{ background: outcomePill.bg, border: outcomePill.border, color: outcomePill.color }}
                            >
                              {outcome}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount + time */}
                      <div className="text-right shrink-0 min-w-[74px]">
                        <div className="text-[15px] font-bold" style={{ color: amtColor }}>
                          {amtDisplay}
                        </div>
                        <div className="text-[10px] text-[#a3aac4]/60 mt-0.5">{timeStr}</div>
                      </div>
                    </div>
                  );
                });
              })()
            )}
          </motion.div>
        )}
      </div>
      <SettingsDrawer 
        isOpen={settingsOpen} 
        onClose={() => setSettingsOpen(false)} 
        authenticated={true}
        onLogout={() => { logout(); onClearState(); }}
      />
    </div>
  );
}
