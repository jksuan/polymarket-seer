import React from "react";

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function GlassCard({ children, className = "", style, ...props }: GlassCardProps) {
  return (
    <div
      className={`rounded-xl relative overflow-hidden ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
