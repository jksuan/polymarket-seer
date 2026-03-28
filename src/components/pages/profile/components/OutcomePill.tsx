import { getOutcomeStyle } from "../utils";

export function OutcomePill({ outcome, className = "" }: { outcome: string, className?: string }) {
  if (!outcome) return null;
  const style = getOutcomeStyle(outcome);
  return (
    <span
      className={`inline-flex items-center px-1.5 py-[2px] rounded text-[10px] font-bold leading-none ${className}`}
      style={{ background: style.bg, border: style.border, color: style.color }}
    >
      {outcome}
    </span>
  );
}
