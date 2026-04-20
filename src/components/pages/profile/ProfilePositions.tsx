import { useState } from "react";
import { motion } from "motion/react";
import { Share2 } from "lucide-react";
import { SellDrawer } from "@/components/ui/SellDrawer";
import { RedeemDrawer } from "@/components/ui/RedeemDrawer";
import { ShareCardModal } from "@/components/ui/ShareCardModal";
import { useShareCard } from "@/hooks/useShareCard";
import { GlassCard } from "./components/GlassCard";
import { OutcomePill } from "./components/OutcomePill";
import { ProfileEmptyState } from "./components/ProfileEmptyState";
import { ProfileCardSkeleton } from "./components/ProfileCardSkeleton";

function getMarketStatus(pos: any): "active" | "won" | "lost" | "resolving" {
  let cp = -1;
  if (pos.curPrice !== undefined && pos.curPrice !== null && pos.curPrice !== "") {
    cp = Number(pos.curPrice);
  } else if (pos.currentValue !== undefined && pos.currentValue !== null && pos.currentValue !== "") {
    if (pos.size > 0 && Number(pos.currentValue) === 0) cp = 0;
  }
  if (cp >= 0 && cp <= 0.0001) return "lost";
  if (cp >= 0.9999) return "won";
  if (pos.closed === true) return "resolving";
  if (pos.enableOrderBook === false) return "resolving";
  if (pos.active === false) return "resolving";
  return "active";
}

export interface ProfilePositionsProps {
  portfolioLoading: boolean;
  positions: any[];
  onSell: (tokenId: string, sharesText: string) => void;
  onLimitSell: (tokenId: string, sharesText: string, price: number) => void;
  onRedeem: (pos: any) => void;
}

export function ProfilePositions({ portfolioLoading, positions, onSell, onLimitSell, onRedeem }: ProfilePositionsProps) {
  const [sellDrawerOpen, setSellDrawerOpen] = useState(false);
  const [activeSellPos, setActiveSellPos] = useState<any>(null);
  const [redeemDrawerOpen, setRedeemDrawerOpen] = useState(false);
  const [activeRedeemPos, setActiveRedeemPos] = useState<any>(null);

  const {
    isGenerating, showModal, cardImageUrl, cardData,
    generateCard, saveCard, shareToX, closeModal,
  } = useShareCard();

  const handleSharePosition = (pos: any) => {
    const displayTitle = (pos.title || "Unknown Market").replace(/\.+$/, '');
    generateCard({
      type: 'position',
      icon: pos.icon,       // raw URL — hook will fetch as base64
      title: displayTitle,
      outcome: pos.outcome,
      initialValue: Number(pos.initialValue || pos.totalBought || 0),
      currentValue: Number(pos.currentValue || 0),
      pnl: pos.cashPnl || 0,
      pnlPct: pos.percentPnl || 0,
      avgPrice: pos.avgPrice || 0,
      curPrice: pos.curPrice || 0,
      expectedReturn: pos.size || 0,
    });
  };

  return (
    <>
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

      <ShareCardModal
        isOpen={showModal}
        isGenerating={isGenerating}
        cardImageUrl={cardImageUrl}
        cardData={cardData}
        onClose={closeModal}
        onSaveCard={saveCard}
        onShareToX={() => shareToX(cardData?.title)}
      />

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 10 }}
        className="flex flex-col gap-3"
      >
        {portfolioLoading && (!positions || positions.length === 0) ? (
          <>
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
            <ProfileCardSkeleton />
          </>
        ) : (!positions || positions.length === 0) ? (
          <ProfileEmptyState loading={false} emptyText="空空如也，快去预测盈亏吧！" />
        ) : (
          positions.map((pos: any, idx: number) => {
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
              <GlassCard
                key={`${pos.asset}-${idx}`}
                translate="no"
                className="p-2.5 notranslate"
              >
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
                    {pos.outcome && <OutcomePill outcome={pos.outcome} className="mt-0.5" />}
                  </div>
                </div>

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

                  <div className="flex items-end justify-between mt-2 pt-3 border-t border-white/5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] sm:text-[12px] font-medium text-[#a3aac4]">胜率变化</span>
                      <div className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight">
                        <span className="text-[#a3aac4]">{avgPct}%</span>
                        <span className="text-[#60a5fa]">→</span>
                        <span className="text-[#dee5ff]">{curPct}%</span>
                      </div>
                    </div>

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
                              ⏳ 判定中
                            </button>
                          )}

                          <button 
                            onClick={() => handleSharePosition(pos)}
                            className="w-[28px] h-[28px] rounded-full bg-[#192540] flex items-center justify-center text-[#60a5fa] hover:bg-[#203050] transition-colors active:scale-95"
                          >
                            <Share2 size={14} />
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </GlassCard>
            );
          })
        )}
      </motion.div>
    </>
  );
}
