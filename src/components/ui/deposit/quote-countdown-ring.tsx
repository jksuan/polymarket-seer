import { useEffect, useState } from "react";

const R = 18;
const C = 2 * Math.PI * R;

type QuoteCountdownRingProps = {
  quotedAtMs: number;
  expiresAtMs: number;
  locale: string;
};

export function QuoteCountdownRing({ quotedAtMs, expiresAtMs, locale }: QuoteCountdownRingProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
    }, 250);
    return () => window.clearInterval(id);
  }, [quotedAtMs, expiresAtMs]);

  const now = Date.now();
  const total = Math.max(1, expiresAtMs - quotedAtMs);
  const remainingMs = Math.max(0, expiresAtMs - now);
  const ratio = remainingMs / total;
  const dashOffset = C * (1 - ratio);
  const seconds = Math.ceil(remainingMs / 1000);

  const title =
    locale === "zh"
      ? `${seconds} 秒后自动刷新报价`
      : `Quote refreshes in ${seconds}s`;

  return (
    <div
      className="absolute right-0 flex h-9 w-9 items-center justify-center"
      title={title}
      aria-label={title}
    >
      <svg className="h-9 w-9 -rotate-90" viewBox="0 0 44 44" aria-hidden>
        <circle
          cx="22"
          cy="22"
          fill="none"
          r={R}
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="3"
        />
        <circle
          cx="22"
          cy="22"
          fill="none"
          r={R}
          stroke="#159bff"
          strokeDasharray={C}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          strokeWidth="3"
          style={{ transition: "stroke-dashoffset 0.2s linear" }}
        />
      </svg>
      <span className="pointer-events-none absolute text-[11px] font-black tabular-nums text-white">
        {seconds > 0 ? seconds : 0}
      </span>
    </div>
  );
}
