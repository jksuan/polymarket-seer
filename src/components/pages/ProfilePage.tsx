'use client';

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wallet, LogOut, RefreshCw, Zap, Settings, ArrowUpRight, Share2 } from "lucide-react";
import { shortenAddress } from "@/lib/utils";
import { AreaChart, Area, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, XAxis, CartesianGrid } from "recharts";
import { SettingsDrawer } from "@/components/ui/SettingsDrawer";
import { SellDrawer } from "@/components/ui/SellDrawer";

const DISTRIBUTION_DATA = [
  { name: "NBA", value: 420, color: "#FF6B00" },
  { name: "英超", value: 310, color: "#00F0FF" },
  { name: "欧冠", value: 180, color: "#ADFF2F" },
  { name: "其他", value: 90, color: "#8B5CF6" },
];

const CHART_DATA = [
  { date: "03-16", value: 0 },
  { date: "03-17", value: 50 },
  { date: "03-18", value: 30 },
  { date: "03-19", value: 140 },
  { date: "03-20", value: 95 },
  { date: "03-21", value: 260 },
  { date: "03-22", value: 420 },
];

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
  onRedeem: (...args: any) => void;
  onSell: (tokenId: string, sharesText: string) => void;
  onLimitSell: (tokenId: string, sharesText: string, price: number) => void;
  onCancelOrder: (orderId: string) => void;
}

export function ProfilePage({
  authenticated, login, logout, user, usdcBalance, isRefreshingBalance, fetchBalance,
  proxyAddress, positions, openOrders, trades, portfolioLoading, onClearState, walletAddress,
  onSell, onLimitSell, onCancelOrder
}: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<"active" | "orders" | "history" | "transactions">("active");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sellDrawerOpen, setSellDrawerOpen] = useState(false);
  const [activeSellPos, setActiveSellPos] = useState<any>(null);

  const displayIdentifier = user?.twitter?.username 
    ? `@${user.twitter.username}`
    : user?.email?.address
      ? user.email.address
      : walletAddress 
        ? shortenAddress(walletAddress)
        : "Guest";

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
    <div className="pt-4 pb-8 min-h-[100dvh]">
      <div className="flex items-center justify-between px-4 mb-6">
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

      <div className="max-w-md mx-auto px-4 mt-5">
        <div
          className="p-4 rounded-3xl relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.3)",
          }}
        >
          <div className="flex justify-between items-start mb-2 relative z-10">
            <div>
              <div
                style={{
                  fontSize: "11px",
                  fontFamily: "Inter",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                总盈利 (近 7 天)
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  style={{
                    fontSize: "30px",
                    fontFamily: "Inter",
                    fontWeight: 900,
                    color: "#ADFF2F",
                    letterSpacing: "-0.02em",
                    textShadow: "0 0 16px rgba(173,255,47,0.3)",
                  }}
                >
                  +$420.00
                </span>
              </div>
            </div>
            <div
              className="flex items-center px-2 py-1 rounded-lg"
              style={{
                background: "rgba(0,240,255,0.1)",
                color: "#00F0FF",
              }}
            >
              <ArrowUpRight size={14} />
              <span
                style={{
                  fontSize: "12px",
                  fontFamily: "Inter",
                  fontWeight: 800,
                  marginLeft: "2px",
                }}
              >
                35%
              </span>
            </div>
          </div>

          <div className="h-[120px] w-[calc(100%+32px)] -ml-4 -mb-4 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={CHART_DATA}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ADFF2F" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ADFF2F" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" hide={true} />
                <Tooltip
                  formatter={(value: any) => [`+$${Number(value).toFixed(2)}`, "盈利"]}
                  labelFormatter={(label) => `日期: ${label}`}
                  contentStyle={{
                    background: "rgba(13,5,24,0.95)",
                    border: "1px solid rgba(173,255,47,0.3)",
                    borderRadius: "12px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                  }}
                  itemStyle={{
                    color: "#ADFF2F",
                    fontWeight: 900,
                    fontFamily: "Inter",
                  }}
                  labelStyle={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "11px",
                    marginBottom: "4px",
                    fontFamily: "Inter",
                    textTransform: "uppercase",
                  }}
                  cursor={{
                    stroke: "rgba(255,255,255,0.2)",
                    strokeWidth: 1,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#ADFF2F"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorProfit)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Asset Breakdown ── */}
      <div className="max-w-md mx-auto px-4 mt-4 flex gap-3">
        <div className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center relative overflow-hidden">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">投入本金</div>
          <div className="text-[16px] font-black text-white">$102.00</div>
        </div>
        <div className="flex-1 p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center relative overflow-hidden">
          <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">未结算</div>
          <div className="text-[16px] font-black text-[#00F0FF]">$21.32</div>
        </div>
        <div className="flex-1 p-3 rounded-2xl bg-[#ADFF2F]/10 border border-[#ADFF2F]/20 flex flex-col items-center relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-12 h-12 bg-[#ADFF2F] opacity-10 blur-xl rounded-full" />
          <div className="text-[10px] text-[#ADFF2F]/60 uppercase tracking-widest font-bold mb-1 relative z-10">已实现利润</div>
          <div className="text-[16px] font-black text-[#ADFF2F] relative z-10">+$420.00</div>
        </div>
      </div>

      {/* ── Domain Distribution (PieChart) ── */}
      <div className="max-w-md mx-auto px-4 mt-4">
        <div className="p-4 rounded-3xl bg-white/5 border border-white/5 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-2">
              收益构成
            </div>
            <div className="flex flex-col gap-1.5 mt-3">
              {DISTRIBUTION_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ background: item.color, boxShadow: `0 0 6px ${item.color}80` }} />
                  <span className="text-[12px] font-bold text-white/80 w-10">{item.name}</span>
                  <span className="text-[13px] font-black" style={{ color: item.color }}>${item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="w-[110px] h-[110px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={DISTRIBUTION_DATA}
                  innerRadius={36}
                  outerRadius={52}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={4}
                >
                  {DISTRIBUTION_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider">总收益</span>
              <span className="text-[13px] font-black text-white mt-0.5">1k+</span>
            </div>
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

      {/* Middle Part: Tabbed Activity and Social Cards */}
      <div className="max-w-md mx-auto px-4 mt-6">
        {/* Tabs */}
        <div
          className="sticky top-[52px] z-30 pt-3 -mx-4 px-4 flex items-center gap-6 border-b border-white/5 pb-2 mb-6 overflow-x-auto whitespace-nowrap [&::-webkit-scrollbar]:hidden"
          style={{
            background: "rgba(13,5,24,0.92)",
            backdropFilter: "blur(12px)",
            msOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <button
            onClick={() => setActiveTab("active")}
            className="relative pb-2 font-bold text-base transition-colors shrink-0"
            style={{
              color:
                activeTab === "active" ? "#dee5ff" : "#a3aac4",
            }}
          >
            持仓 ({positions?.length || 0})
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
            onClick={() => setActiveTab("orders")}
            className="relative pb-2 font-bold text-base transition-colors shrink-0"
            style={{
              color:
                activeTab === "orders" ? "#dee5ff" : "#a3aac4",
            }}
          >
            挂单 ({openOrders?.length || 0})
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
            onClick={() => setActiveTab("history")}
            className="relative pb-2 font-bold text-base transition-colors shrink-0"
            style={{
              color:
                activeTab === "history" ? "#dee5ff" : "#a3aac4",
            }}
          >
            历史战绩
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
            onClick={() => setActiveTab("transactions")}
            className="relative pb-2 font-bold text-base transition-colors shrink-0"
            style={{
              color:
                activeTab === "transactions"
                  ? "#dee5ff"
                  : "#a3aac4",
            }}
          >
            交易记录
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

        {/* Tab Content */}
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
                  key={pos.asset || idx}
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

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mb-0.5">
                        <button 
                          onClick={() => {
                            setActiveSellPos(pos);
                            setSellDrawerOpen(true);
                          }} 
                          className="bg-transparent border border-[#0099FF]/50 text-[#0099FF] text-[13px] font-bold px-5 py-1.5 rounded-[6px] hover:bg-[#0099FF]/10 active:scale-95 transition-all leading-none h-[28px] shadow-[0_0_12px_rgba(0,153,255,0.15)] tracking-wide"
                        >
                          卖出
                        </button>
                        <button className="w-[28px] h-[28px] rounded-full bg-[#192540] flex items-center justify-center text-[#60a5fa] hover:bg-[#203050] transition-colors active:scale-95">
                          <Share2 size={14} />
                        </button>
                      </div>
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
                        <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4] whitespace-nowrap">买入胜率</span>
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


            {/* History Card 1 - WIN */}
            <div
              className="p-3.5 rounded-xl relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Subtle green glow on top right */}
              <div className="absolute top-[-40px] right-[-40px] w-[120px] h-[120px] bg-[#6bff8f] opacity-[0.03] blur-[30px] rounded-full pointer-events-none" />

              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="text-[11px] font-bold text-[#a3aac4] tracking-[1px] uppercase">
                  欧洲冠军联赛
                </div>
                <div className="bg-[#6bff8f] px-3 py-1.5 rounded-xl flex items-center justify-center">
                  <span className="text-[12px] font-bold text-[#091328] uppercase leading-none">
                    获胜
                  </span>
                </div>
              </div>

              <div className="text-[20px] font-bold text-[#a3aac4] tracking-tight leading-tight relative z-10 px-1">
                <span className="text-[#dee5ff]">
                  皇家马德里
                </span>{" "}
                晋级
              </div>

              <div className="flex items-end justify-between mt-5 relative z-10 px-1">
                <div>
                  <div className="text-[11px] font-bold text-[#a3aac4] uppercase tracking-[1px]">
                    净赚
                  </div>
                  <div className="mt-1 text-[22px] font-bold text-[#6bff8f]">
                    +$145.00
                  </div>
                </div>

                <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#192540] text-[#60a5fa] hover:bg-[#203050] transition-colors font-bold text-[13px] active:scale-95 border border-[#60a5fa]/20">
                  🎉 分享胜利
                </button>
              </div>
            </div>

            {/* History Card 2 - LOST */}
            <div
              className="p-3.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] font-bold text-[#a3aac4] tracking-[1px] uppercase">
                  UFC 299
                </div>
                <div className="bg-[#9f0519] px-3 py-1.5 rounded-xl flex items-center justify-center">
                  <span className="text-[12px] font-bold text-[#ffa8a3] uppercase leading-none">
                    未中
                  </span>
                </div>
              </div>

              <div className="text-[20px] font-bold text-[#a3aac4] tracking-tight leading-tight px-1">
                <span className="text-[#dee5ff]">奥马利</span>{" "}
                KO胜出
              </div>

              <div className="flex items-end justify-between mt-5 px-1">
                <div>
                  <div className="text-[11px] font-bold text-[#a3aac4] uppercase tracking-[1px]">
                    损失
                  </div>
                  <div className="mt-1 text-[22px] font-bold text-[#ff6b6b]">
                    -$25.00
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "transactions" && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex flex-col gap-3"
          >


            {/* Transaction Card 1 */}
            <div
              className="p-3.5 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="w-[50px] shrink-0">
                <div className="text-[12px] font-bold text-[#6bff8f] uppercase bg-[#6bff8f]/10 py-1.5 rounded-md text-center w-full">
                  下注
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="text-[11px] font-bold text-[#a3aac4] tracking-[1px] uppercase mb-1">
                  盘口
                </div>
                <div className="text-[16px] font-bold text-[#dee5ff] tracking-tight line-clamp-1">
                  湖人 vs 勇士
                </div>
              </div>

              <div className="text-right shrink-0 min-w-[90px]">
                <div className="text-[18px] font-bold text-[#ff6b6b]">
                  -$50.00
                </div>
                <div className="text-[11px] font-medium text-[#a3aac4] mt-1">
                  2026/03/20 14:30
                </div>
              </div>
            </div>

            {/* Transaction Card 2 */}
            <div
              className="p-3.5 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="w-[50px] shrink-0">
                <div className="text-[12px] font-bold text-[#60a5fa] uppercase bg-[#60a5fa]/10 py-1.5 rounded-md text-center w-full">
                  结算
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="text-[11px] font-bold text-[#a3aac4] tracking-[1px] uppercase mb-1">
                  盘口
                </div>
                <div className="text-[16px] font-bold text-[#dee5ff] tracking-tight line-clamp-1">
                  皇家马德里 晋级
                </div>
              </div>

              <div className="text-right shrink-0 min-w-[90px]">
                <div className="text-[18px] font-bold text-[#6bff8f]">
                  +$195.00
                </div>
                <div className="text-[11px] font-medium text-[#a3aac4] mt-1">
                  2026/03/19 22:15
                </div>
              </div>
            </div>

            {/* Transaction Card 3 */}
            <div
              className="p-3.5 rounded-xl flex items-center gap-3"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="w-[50px] shrink-0">
                <div className="text-[12px] font-bold text-[#dee5ff] uppercase bg-white/10 py-1.5 rounded-md text-center w-full">
                  充值
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="text-[11px] font-bold text-[#a3aac4] tracking-[1px] uppercase mb-1">
                  USDT 钱包
                </div>
                <div className="text-[16px] font-bold text-[#dee5ff] tracking-tight line-clamp-1">
                  Polygon 网络
                </div>
              </div>

              <div className="text-right shrink-0 min-w-[90px]">
                <div className="text-[18px] font-bold text-[#6bff8f]">
                  +$500.00
                </div>
                <div className="text-[11px] font-medium text-[#a3aac4] mt-1">
                  2026/03/18 10:00
                </div>
              </div>
            </div>
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
