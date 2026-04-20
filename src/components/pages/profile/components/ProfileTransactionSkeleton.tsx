import { GlassCard } from "./GlassCard";
import { Skeleton } from "@/components/ui/Skeleton";

export function ProfileTransactionSkeleton() {
  return (
    <GlassCard className="p-3 flex items-center gap-3 mb-3">
      {/* Label Box */}
      <div className="w-[42px] shrink-0">
        <Skeleton className="w-full h-[24px] rounded-md" />
      </div>

      <div className="flex-1 flex items-center gap-2 min-w-0">
        {/* Market Icon */}
        <Skeleton className="w-[28px] h-[28px] rounded-[6px] shrink-0" />
        
        {/* Title and Pill */}
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <Skeleton className="w-4/5 h-[12px] rounded" />
          <Skeleton className="w-[32px] h-[14px] rounded-full mt-0.5" />
        </div>
      </div>

      <div className="text-right shrink-0 min-w-[74px] flex flex-col items-end gap-1.5">
        {/* Amount */}
        <Skeleton className="w-10 h-[14px] rounded" />
        {/* Time */}
        <Skeleton className="w-16 h-[10px] rounded" />
      </div>
    </GlassCard>
  );
}
