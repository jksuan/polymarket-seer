import { Skeleton } from '@/components/ui/Skeleton';
import { DiscoverCardsContainer } from '@/components/ui/DiscoverCard';

function DiscoverHeroCardSkeleton({ heightClass }: { heightClass: string }) {
  return (
    <div
      className={`relative w-full ${heightClass} rounded-[32px] overflow-hidden border border-white/10`}
      style={{
        background: 'linear-gradient(160deg, rgba(30,18,55,0.55) 0%, rgba(13,5,24,0.85) 100%)',
      }}
    >
      <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-20 h-4 rounded" />
        </div>
        <Skeleton className="w-16 h-4 rounded" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 pt-8">
        <Skeleton className="w-28 h-3 rounded mb-5" />
        <Skeleton className="w-[140px] h-[96px] rounded-2xl" />
        <Skeleton className="w-32 h-8 rounded-lg mt-5" />
        <div className="flex items-center gap-4 mt-3">
          <Skeleton className="w-20 h-9 rounded-lg" />
          <Skeleton className="w-16 h-9 rounded-lg" />
        </div>
      </div>

      <div className="absolute bottom-4 left-0 w-full flex justify-center">
        <Skeleton className="w-24 h-3 rounded" />
      </div>
    </div>
  );
}

function DiscoverMatchHeroSkeleton() {
  return (
    <div
      className="relative w-full h-[320px] rounded-[32px] overflow-hidden border border-white/5"
      style={{
        background: 'linear-gradient(145deg, rgba(30,20,50,0.55), rgba(18,10,32,0.75))',
      }}
    >
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="w-24 h-4 rounded" />
      </div>
      <div className="absolute top-6 right-6">
        <Skeleton className="w-20 h-4 rounded" />
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 pt-10">
        <div className="flex items-center justify-center gap-8 w-full">
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-[64px] h-[48px] rounded-xl" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
          <Skeleton className="w-6 h-5 rounded" />
          <div className="flex flex-col items-center gap-2">
            <Skeleton className="w-[64px] h-[48px] rounded-xl" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
        </div>
        <Skeleton className="w-40 h-10 rounded-xl" />
      </div>
    </div>
  );
}

function DiscoverHorizontalRowSkeleton() {
  return (
    <div className="w-full -mt-4">
      <div className="flex gap-3 overflow-hidden py-3 px-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[100px] flex items-center justify-between px-3 py-2.5 rounded-2xl border border-white/5 bg-[#0D0518]/50"
          >
            <Skeleton className="w-[36px] h-[22px] rounded-[3px]" />
            <Skeleton className="w-10 h-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscoverChampionPlaylistSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden py-1 px-2 -mt-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex-shrink-0 w-[88px] h-[52px] rounded-2xl border border-white/5 bg-[#0D0518]/50 flex flex-col items-center justify-center gap-1.5 px-2"
        >
          <Skeleton className="w-[28px] h-[20px] rounded-[3px]" />
          <Skeleton className="w-12 h-2.5 rounded" />
        </div>
      ))}
    </div>
  );
}

/** 挑战 Tab（DiscoverPage）加载态：与首页/发现卡片布局对齐的骨架屏 */
export function DiscoverPageSkeleton() {
  return (
    <DiscoverCardsContainer>
      <DiscoverHeroCardSkeleton heightClass="h-[380px]" />
      <DiscoverChampionPlaylistSkeleton />
      <DiscoverHeroCardSkeleton heightClass="h-[400px]" />
      <DiscoverHorizontalRowSkeleton />
      <DiscoverMatchHeroSkeleton />
      <DiscoverHorizontalRowSkeleton />
      <DiscoverMatchHeroSkeleton />
    </DiscoverCardsContainer>
  );
}
