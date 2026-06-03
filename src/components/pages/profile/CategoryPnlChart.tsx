/** 总览「分类盈亏」已下架；组件保留供后续图表改版复用。 */
"use client";
import React from "react";

export interface CategoryPnlItem {
  category: string;
  pnl: number;        // net cash P&L (positive = profit, negative = loss)
  invested: number;   // total bought
  revenue: number;    // total sold + redeemed
}

interface Props {
  data: CategoryPnlItem[];
  width?: number;
  height?: number;
}

const COLORS = {
  profit: "#ADFF2F",
  profitBg: "rgba(173,255,47,0.15)",
  loss: "#ff6b6b",
  lossBg: "rgba(255,107,107,0.15)",
  text: "rgba(255,255,255,0.6)",
  textDim: "rgba(255,255,255,0.3)",
  zeroLine: "rgba(255,255,255,0.12)",
};

/**
 * Horizontal bi-directional bar chart for PnL by sport category.
 *
 * Layout per row (left-to-right):
 *   [Category Label (60px)] [◄ Loss bar | Zero line | Profit bar ►] [PnL value]
 *
 * Pure SVG, zero dependencies, mobile-optimised.
 */
export function CategoryPnlChart({ data, width = 320, height: propHeight }: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 80 }}>
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>暂无分类数据</span>
      </div>
    );
  }

  // Sort: largest pnl first for visual impact
  const sorted = [...data].sort((a, b) => b.pnl - a.pnl);

  const rowHeight = 32;
  const gap = 6;
  const totalHeight = propHeight || sorted.length * (rowHeight + gap) - gap;

  // Layout constants
  const labelWidth = 48;
  const valueWidth = 64;
  const barAreaX = labelWidth + 8;
  const barAreaWidth = width - barAreaX - valueWidth - 4;
  const barHeight = 18;

  // Find max |pnl| for scaling
  const maxAbs = Math.max(...sorted.map((d) => Math.abs(d.pnl)), 0.01);

  // Each side gets half the bar area
  const halfBar = barAreaWidth / 2;
  const centerX = barAreaX + halfBar;

  return (
    <svg
      viewBox={`0 0 ${width} ${totalHeight}`}
      width="100%"
      height={totalHeight}
      style={{ display: "block", overflow: "visible" }}
      role="img"
      aria-label="各类别盈亏条形图"
    >
      {/* Zero / center line */}
      <line
        x1={centerX}
        y1={0}
        x2={centerX}
        y2={totalHeight}
        stroke={COLORS.zeroLine}
        strokeWidth={1}
        strokeDasharray="3,3"
      />

      {sorted.map((item, i) => {
        const y = i * (rowHeight + gap);
        const barY = y + (rowHeight - barHeight) / 2;
        const isProfit = item.pnl >= 0;
        const barLen = (Math.abs(item.pnl) / maxAbs) * halfBar;

        // Bar x position
        const barX = isProfit ? centerX : centerX - barLen;

        return (
          <g key={item.category}>
            {/* Category label */}
            <text
              x={labelWidth}
              y={y + rowHeight / 2}
              textAnchor="end"
              dominantBaseline="central"
              fill={COLORS.text}
              fontSize={11}
              fontWeight={700}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {item.category}
            </text>

            {/* Background pill (subtle) */}
            <rect
              x={barX}
              y={barY}
              width={Math.max(barLen, 2)}
              height={barHeight}
              rx={4}
              fill={isProfit ? COLORS.profitBg : COLORS.lossBg}
            />

            {/* Foreground bar */}
            <rect
              x={barX}
              y={barY}
              width={Math.max(barLen, 2)}
              height={barHeight}
              rx={4}
              fill={isProfit ? COLORS.profit : COLORS.loss}
              opacity={0.85}
            >
              {/* Animate bar width on mount */}
              <animate
                attributeName="width"
                from="0"
                to={String(Math.max(barLen, 2))}
                dur="0.6s"
                fill="freeze"
                calcMode="spline"
                keySplines="0.25 0.46 0.45 0.94"
              />
              {isProfit ? (
                <animate
                  attributeName="x"
                  from={String(centerX)}
                  to={String(barX)}
                  dur="0.6s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.25 0.46 0.45 0.94"
                />
              ) : (
                <animate
                  attributeName="x"
                  from={String(centerX)}
                  to={String(barX)}
                  dur="0.6s"
                  fill="freeze"
                  calcMode="spline"
                  keySplines="0.25 0.46 0.45 0.94"
                />
              )}
            </rect>

            {/* PnL value label */}
            <text
              x={width - 2}
              y={y + rowHeight / 2}
              textAnchor="end"
              dominantBaseline="central"
              fill={isProfit ? COLORS.profit : COLORS.loss}
              fontSize={11}
              fontWeight={800}
              fontFamily="Inter, system-ui, sans-serif"
              opacity={0.9}
            >
              {isProfit ? "+" : ""}{item.pnl.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
