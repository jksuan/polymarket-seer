import { motion } from "motion/react";
import { GlassCard } from "./components/GlassCard";
import { OutcomePill } from "./components/OutcomePill";
import { ProfileEmptyState } from "./components/ProfileEmptyState";

export interface ProfileOrdersProps {
  portfolioLoading: boolean;
  openOrders: any[];
  onCancelOrder: (orderId: string) => void;
}

export function ProfileOrders({ portfolioLoading, openOrders, onCancelOrder }: ProfileOrdersProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex flex-col gap-3"
    >
      {portfolioLoading && (!openOrders || openOrders.length === 0) ? (
        <ProfileEmptyState loading={true} loadingText="加载挂单中..." />
      ) : (!openOrders || openOrders.length === 0) ? (
        <ProfileEmptyState loading={false} emptyText="暂无未成交的订单" />
      ) : (
        openOrders.map((order: any, idx: number) => {
          const price = Number(order.price) || 0;
          const originalSize = Number(order.original_size) || 0;
          const sizeMatched = Number(order.size_matched) || 0;
          const filledAmount = (sizeMatched * price).toFixed(2);
          const totalAmount = (originalSize * price).toFixed(2);
          const displayTitle = order.title || (order.market && !order.market.startsWith('0x') ? order.market : '未知市场');

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

          const isBuy = order.side === 'BUY';

          return (
            <GlassCard
              key={order.id || idx}
              className="p-3.5 notranslate"
              translate="no"
            >
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
                    <span className="text-[11px] font-medium text-[#a3aac4]">
                      {isBuy ? 'Buy' : 'Sell'}
                    </span>
                    <OutcomePill outcome={order.outcome} />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-[#192540] px-2 py-1 rounded-full border border-white/10 shrink-0 self-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#60a5fa] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#60a5fa] tracking-wider uppercase">排队中</span>
                </div>
              </div>

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
            </GlassCard>
          );
        })
      )}
    </motion.div>
  );
}
