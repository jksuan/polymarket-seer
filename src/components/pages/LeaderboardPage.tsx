'use client';

import { Trophy, Medal, Flame } from 'lucide-react';
import { shortenAddress } from '@/lib/utils';
import { TopHeader } from '@/components/ui/TopHeader';

const TOP_USERS = [
  { id: 1, rank: 1, address: "0x123...abc", profit: "+$45,210", winRate: "82%", volume: "$1.2M", isMe: false },
  { id: 2, rank: 2, address: "0xNeo...777", profit: "+$32,100", winRate: "75%", volume: "$880K", isMe: false },
  { id: 3, rank: 3, address: "0xWhale...eth", profit: "+$28,500", winRate: "68%", volume: "$2.1M", isMe: false },
  { id: 4, rank: 4, address: "0xAlpha...420", profit: "+$12,400", winRate: "61%", volume: "$150K", isMe: false },
  { id: 5, rank: 5, address: "0xMeta...999", profit: "+$9,300", winRate: "58%", volume: "$95K", isMe: false },
  { id: 6, rank: 6, address: "0xDeFi...GOD", profit: "+$8,100", winRate: "54%", volume: "$200K", isMe: false },
  { id: 7, rank: 402, address: "0xUser...xyz", profit: "-$420", winRate: "33%", volume: "$1.5K", isMe: true }, // Current user mock
];

export function LeaderboardPage() {
  return (
    <div className="pb-32 min-h-[100dvh]">
      <TopHeader isSticky={true} />
      <div className="px-4 mb-6 text-center">
         <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy size={28} className="text-[#ADFF2F]" />
            <h1 className="text-3xl font-black italic text-white tracking-wide uppercase text-shadow-[0_0_15px_rgba(173,255,47,0.3)]">
              风云榜
            </h1>
            <Trophy size={28} className="text-[#ADFF2F]" />
         </div>
         <p className="text-white/40 text-sm tracking-widest uppercase font-bold">TOP TRADERS GLOBALLY</p>
      </div>

      <div className="px-4">
        {/* Top 3 Podium concept - Visual Polish */}
        <div className="flex items-end justify-center gap-2 mb-8 h-40">
           {/* Rank 2 */}
           <div className="w-1/3 flex flex-col items-center relative pb-2 rounded-t-2xl" style={{ height: '70%', background: 'linear-gradient(to top, rgba(0,240,255,0.1), transparent)'}}>
              <div className="w-10 h-10 rounded-full bg-[#192540] border-2 border-[#00F0FF] absolute -top-5 flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                 <span className="text-[#00F0FF] font-black italic">#2</span>
              </div>
              <div className="mt-8 text-white font-bold text-xs">{shortenAddress(TOP_USERS[1].address)}</div>
              <div className="text-[#00F0FF] font-black text-sm mt-1">{TOP_USERS[1].profit}</div>
           </div>
           
           {/* Rank 1 */}
           <div className="w-1/3 flex flex-col items-center relative pb-2 rounded-t-2xl shadow-[0_-10px_30px_rgba(173,255,47,0.1)] z-10" style={{ height: '100%', background: 'linear-gradient(to top, rgba(173,255,47,0.15), transparent)'}}>
              <div className="absolute -top-10 w-full flex justify-center"><Flame size={20} className="text-[#ADFF2F] animate-pulse" /></div>
              <div className="w-14 h-14 rounded-full bg-[#192540] border-2 border-[#ADFF2F] absolute -top-5 flex items-center justify-center shadow-[0_0_20px_rgba(173,255,47,0.5)]">
                 <span className="text-[#ADFF2F] font-black text-xl italic">#1</span>
              </div>
              <div className="mt-12 text-white font-black text-sm">{shortenAddress(TOP_USERS[0].address)}</div>
              <div className="text-[#ADFF2F] font-black text-base mt-1">{TOP_USERS[0].profit}</div>
           </div>

           {/* Rank 3 */}
           <div className="w-1/3 flex flex-col items-center relative pb-2 rounded-t-2xl" style={{ height: '60%', background: 'linear-gradient(to top, rgba(255,107,0,0.1), transparent)'}}>
              <div className="w-10 h-10 rounded-full bg-[#192540] border-2 border-[#FF6B00] absolute -top-5 flex items-center justify-center shadow-[0_0_15px_rgba(255,107,0,0.4)]">
                 <span className="text-[#FF6B00] font-black italic">#3</span>
              </div>
              <div className="mt-6 text-white font-bold text-xs">{shortenAddress(TOP_USERS[2].address)}</div>
              <div className="text-[#FF6B00] font-black text-sm mt-1">{TOP_USERS[2].profit}</div>
           </div>
        </div>

        {/* List */}
        <div className="flex flex-col gap-3">
           <div className="flex text-white/30 text-[10px] uppercase font-bold tracking-widest px-2 mb-1">
              <div className="w-8 shrink-0">排名</div>
              <div className="flex-1">交易者</div>
              <div className="w-16 shrink-0 text-right">总收益</div>
           </div>

           {TOP_USERS.slice(3).map(user => (
              <div key={user.id} className={`flex items-center px-4 py-4 rounded-2xl border ${user.isMe ? 'bg-[#ADFF2F]/10 border-[#ADFF2F]/30' : 'bg-white/5 border-white/5'}`}>
                 <div className="w-8 shrink-0 font-black italic text-white/40 text-lg">
                    {user.rank}
                 </div>
                 <div className="flex-1 flex flex-col">
                    <span className="text-white font-bold">{user.address}</span>
                    <span className="text-[11px] text-white/40 mt-0.5">胜率 {user.winRate} · 量 {user.volume}</span>
                 </div>
                 <div className="w-20 shrink-0 text-right">
                    <span className={`font-black tracking-tight ${user.isMe ? 'text-white' : 'text-[#00F0FF]'}`}>
                       {user.profit}
                    </span>
                 </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
}
