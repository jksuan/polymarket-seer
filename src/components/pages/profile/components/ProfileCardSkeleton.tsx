import { GlassCard } from "./GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";

export function ProfileCardSkeleton() {
  return (
    <GlassCard className="p-2.5 notranslate mb-3 flex flex-col">
      <div className="flex items-center gap-3 px-0.5">
        <Skeleton className="w-[42px] h-[42px] rounded-[10px] shrink-0" />
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="w-3/4 h-[12px] rounded" />
          <Skeleton className="w-16 h-[14px] rounded-full" />
        </div>
      </div>
      <div className="mt-4 px-0.5 flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-12 h-[10px] rounded" />
            <Skeleton className="w-16 h-[14px] rounded" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-12 h-[10px] rounded" />
            <Skeleton className="w-16 h-[14px] rounded" />
            <Skeleton className="w-14 h-[10px] rounded" />
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <Skeleton className="w-12 h-[10px] rounded" />
            <Skeleton className="w-16 h-[14px] rounded" />
          </div>
        </div>
        <div className="flex justify-between items-end mt-2 pt-3 border-t border-white/5">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-12 h-[10px] rounded" />
            <Skeleton className="w-20 h-[14px] rounded" />
          </div>
          <Skeleton className="w-20 h-[28px] rounded-md shrink-0" />
        </div>
      </div>
    </GlassCard>
  );
}
