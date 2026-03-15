"use client";

import { useState } from "react";
import { Briefcase, Loader2, Wallet, ClipboardList, History, HandCoins, TrendingUp, CheckCircle2, ExternalLink, CircleSlash, Plus } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";

interface PortfolioProps {
  positions: any[];
  openOrders: any[];
  trades: any[];
  portfolioLoading: boolean;
  onRedeem: (pos: any) => void;
}

export default function Portfolio({ positions, openOrders, trades, portfolioLoading, onRedeem }: PortfolioProps) {
  const [portfolioTab, setPortfolioTab] = useState<"positions" | "orders" | "history">("positions");

  return (
    <div className="space-y-4 pt-4 border-t border-zinc-900">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-black flex items-center gap-2">
          <Briefcase size={20} className="text-blue-500" />
          我的资产组合
        </h2>
        {portfolioLoading && <Loader2 size={16} className="animate-spin text-zinc-500" />}
      </div>

      {/* 选项卡切换 */}
      <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800/50">
        <button onClick={() => setPortfolioTab("positions")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${portfolioTab === 'positions' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <Wallet size={14} /> 持仓 ({positions.length})
        </button>
        <button onClick={() => setPortfolioTab("orders")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${portfolioTab === 'orders' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <ClipboardList size={14} /> 挂单 ({openOrders.length})
        </button>
        <button onClick={() => setPortfolioTab("history")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${portfolioTab === 'history' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}>
          <History size={14} /> 历史
        </button>
      </div>

      {/* 列表内容 */}
      <div className="min-h-[200px] space-y-3 pb-8">
        {portfolioTab === "positions" && (
          <>
            {positions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <CircleSlash size={24} />
                <p className="text-xs font-medium">暂无活跃持仓</p>
              </div>
            ) : (
              positions.map((pos, idx) => (
                <div key={idx} className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl overflow-hidden transition-all hover:border-zinc-700 shadow-xl">
                  <div className="p-4 space-y-3">
                    {/* 第一行：图标 + 标题 + 方向标签 */}
                    <div className="flex items-start gap-3">
                      {pos.icon ? (
                        <img src={pos.icon} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                          <Wallet size={16} className="text-zinc-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[11px] font-bold text-zinc-300 line-clamp-2 leading-snug">{pos.title || pos.question || pos.marketName || "未知预测市场"}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${pos.outcome === 'Yes' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                            {pos.outcome} {(Number(pos.avgPrice || 0) * 100).toFixed(1)}¢
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">{Number(pos.size).toFixed(1)} 份额</span>
                        </div>
                      </div>
                    </div>

                    {/* 第二行：均价 / 当前价 / 价值 */}
                    <div className="flex items-center justify-between text-[10px] bg-zinc-950/50 rounded-xl px-3 py-2">
                      <div className="text-center">
                        <div className="text-zinc-600 font-bold">均价</div>
                        <div className="text-zinc-300 font-black">{(Number(pos.avgPrice || 0) * 100).toFixed(1)}¢</div>
                      </div>
                      <div className="text-center">
                        <div className="text-zinc-600 font-bold">当前</div>
                        <div className="text-zinc-300 font-black">{(Number(pos.curPrice || 0) * 100).toFixed(1)}¢</div>
                      </div>
                      <div className="text-center">
                        <div className="text-zinc-600 font-bold">价值</div>
                        <div className="text-white font-black">${Number(pos.currentValue || 0).toFixed(2)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-zinc-600 font-bold">盈亏</div>
                        <div className={`font-black ${Number(pos.cashPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {Number(pos.cashPnl || 0) >= 0 ? '+' : ''}${Number(pos.cashPnl || 0).toFixed(2)}
                          <span className="ml-0.5">({Number(pos.percentPnl || 0).toFixed(1)}%)</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 可领奖按钮 */}
                    {pos.redeemable && (
                      <button 
                        onClick={() => onRedeem(pos)} 
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-[11px] font-black py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/40"
                      >
                        <HandCoins size={14} strokeWidth={2.5} /> 立即领奖 (Redeem)
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {portfolioTab === "orders" && (
          <div className="space-y-2">
            {openOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <ClipboardList size={24} />
                <p className="text-xs font-medium">暂无进行中的挂单</p>
              </div>
            ) : (
              openOrders.map((order, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-lg">
                  <div className="text-left space-y-0.5">
                    <div className={`text-[10px] font-black uppercase tracking-wider ${order.side === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{order.side} 限价单</div>
                    <div className="text-xs font-bold text-white">价格: ${order.price} • 数量: {order.size}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-[9px] font-black text-zinc-500 uppercase">待撮合</div>
                </div>
              ))
            )}
          </div>
        )}

        {portfolioTab === "history" && (
          <div className="space-y-3">
            {trades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-600 gap-2 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                <History size={24} />
                <p className="text-xs font-medium">暂无成交记录</p>
              </div>
            ) : (
              trades.slice(0, 20).map((item, i) => {
                const isTrade = item.type === 'TRADE';
                const isBuy = isTrade && item.side === 'BUY';
                const isSell = isTrade && item.side === 'SELL';
                const isRedeem = item.type === 'REDEEM';
                const isReward = item.type === 'REWARD';
                
                let typeLabel = "交易";
                let typeIcon = <History size={14} />;
                let colorClass = "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
                
                if (isBuy) {
                  typeLabel = "已买入";
                  typeIcon = <Plus size={14} />;
                  colorClass = "text-blue-400 bg-blue-400/10 border-blue-400/20";
                } else if (isSell) {
                  typeLabel = "已卖出";
                  typeIcon = <TrendingUp size={14} className="rotate-180" />;
                  colorClass = "text-orange-400 bg-orange-400/10 border-orange-400/20";
                } else if (isRedeem) {
                  typeLabel = "领奖";
                  typeIcon = <CheckCircle2 size={14} />;
                  colorClass = "text-green-400 bg-green-400/10 border-green-400/20";
                } else if (isReward) {
                  typeLabel = "奖励";
                  typeIcon = <HandCoins size={14} />;
                  colorClass = "text-purple-400 bg-purple-400/10 border-purple-400/20";
                }

                return (
                  <div key={i} className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-3 hover:bg-zinc-900/60 transition-all flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-tight ${colorClass}`}>
                          {typeIcon}
                          {typeLabel}
                        </div>
                        <span className="text-[10px] text-zinc-600 font-bold">{formatRelativeTime(item.timestamp)}</span>
                      </div>
                      <div className={`text-xs font-black ${isBuy ? 'text-zinc-400' : 'text-green-500'}`}>
                        {isBuy ? '-' : '+'}${Number(item.usdcSize || (Number(item.size) * Number(item.price)) || 0).toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      {item.icon ? (
                        <img src={item.icon} className="w-8 h-8 rounded-lg object-cover flex-shrink-0 bg-zinc-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                          {isReward ? <HandCoins size={16} className="text-purple-400" /> : <CircleSlash size={16} className="text-zinc-600" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h5 className="text-[11px] font-bold text-zinc-300 line-clamp-2 leading-snug">
                          {item.title || (isReward ? "周期奖励已发放" : "平台活动记录")}
                        </h5>
                        <div className="flex items-center gap-2 mt-1">
                          {item.outcome && (
                            <span className={`text-[9px] font-black ${item.outcome === 'Yes' ? 'text-green-500' : 'text-red-500'}`}>
                              {item.outcome} {(Number(item.price || 0) * 100).toFixed(1)}¢
                            </span>
                          )}
                          <span className="text-[9px] text-zinc-500 font-bold">{item.size > 0 ? `${Number(item.size).toFixed(2)} 份额` : ''}</span>
                        </div>
                      </div>
                      <a href={`https://polygonscan.com/tx/${item.transactionHash}`} target="_blank" className="text-zinc-700 hover:text-zinc-400 p-1">
                         <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
