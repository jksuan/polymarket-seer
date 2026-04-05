'use client';

import React from 'react';
import type { ShareCardData } from '@/hooks/useShareCard';

export function PositionShareCard({ data }: { data: ShareCardData }) {
  const displayTitle = (data.title || 'Unknown Market').replace(/\.+$/, '');
  const avgPct = ((data.avgPrice || 0) * 100).toFixed(1);
  const curPct = ((data.curPrice || 0) * 100).toFixed(1);
  const pnl = data.pnl || 0;
  const pnlPct = data.pnlPct || 0;
  const isProfitable = pnl >= 0;
  const initialVal = data.initialValue || 0;
  const currentVal = data.currentValue || 0;
  const expectedReturn = data.expectedReturn || 0;
  const outcome = data.outcome || '';
  const pnlColor = isProfitable ? '#ADFF2F' : '#ff6b6b';
  const outcomeBg = outcome.toLowerCase() === 'yes'
    ? 'rgba(107,255,143,0.15)'
    : outcome.toLowerCase() === 'no'
      ? 'rgba(255,107,107,0.12)'
      : 'rgba(96,165,250,0.12)';
  const outcomeColor = outcome.toLowerCase() === 'yes' ? '#6bff8f'
    : outcome.toLowerCase() === 'no' ? '#ff6b6b' : '#60a5fa';
  const outcomeBorder = outcome.toLowerCase() === 'yes'
    ? '1px solid rgba(107,255,143,0.3)'
    : outcome.toLowerCase() === 'no'
      ? '1px solid rgba(255,107,107,0.3)'
      : '1px solid rgba(96,165,250,0.3)';

  return (
    <div
      id="share-card-render-target"
      style={{
        width: 400,
        height: 209,
        padding: '16px 20px 14px',
        background: 'linear-gradient(160deg, #1E243D 0%, #111527 100%)',
        borderRadius: 16,
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ position: 'absolute', top: -50, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(173,255,47,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── ROW 1: Brand + Badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ADFF2F, #00F0FF)'
          }}>
            <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#1E243D' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: -0.3, color: '#fff', display: 'flex', alignItems: 'center', height: 22 }}>
            SEER<span style={{ color: '#ADFF2F' }}>.</span>SPORTS
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 22, padding: '0 10px',
          borderRadius: 20,
          background: isProfitable ? 'rgba(173,255,47,0.12)' : 'rgba(255,107,107,0.12)',
          border: `1px solid ${isProfitable ? 'rgba(173,255,47,0.3)' : 'rgba(255,107,107,0.3)'}`,
          fontSize: 10, fontWeight: 800, color: pnlColor,
        }}>
          <span style={{ paddingTop: 1 }}>{isProfitable ? '浮盈' : '浮亏'}</span>
        </div>
      </div>

      {/* ── ROW 2: Icon + Event Title + Outcome ── */}
      <div style={{ display: 'flex', gap: 8, position: 'relative', zIndex: 1, marginTop: 4, marginBottom: 8, alignItems: 'center' }}>
        {data.iconBase64 && (
          <img
            src={data.iconBase64}
            alt=""
            crossOrigin="anonymous"
            style={{
               width: 36, height: 36, borderRadius: 8,
               objectFit: 'cover', flexShrink: 0,
               border: '1px solid rgba(255,255,255,0.1)',
               background: '#fff',
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: '#dee5ff',
            lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {displayTitle}
          </div>
          {outcome && (
            <div style={{ display: 'flex' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 16, padding: '0 6px', borderRadius: 4,
                fontSize: 9, fontWeight: 800,
                background: outcomeBg, color: outcomeColor, border: outcomeBorder,
              }}>
                <span style={{ paddingTop: 1 }}>{outcome}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── ROW 3: 4-col stats ── */}
      <div style={{
        display: 'flex', gap: 8, position: 'relative', zIndex: 1, marginTop: 2, marginBottom: 4
      }}>
        {[
          { label: '投入本金', value: `$${initialVal.toFixed(2)}`, color: '#a3aac4' },
          { label: '当前价值', value: `$${currentVal.toFixed(2)}`, color: '#fff', sub: `${isProfitable ? '+' : '-'}$${Math.abs(pnl).toFixed(2)} (${Math.abs(pnlPct).toFixed(1)}%)`, subColor: pnlColor },
          { label: '预期回报', value: `$${expectedReturn.toFixed(2)}`, color: '#a3aac4' },
          { label: '胜率变化', value: `${avgPct}%→${curPct}%`, color: '#fff', isWinRate: true },
        ].map((stat, i) => (
          <div key={i} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '8px 4px',
            border: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
          }}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#8b94a8', marginBottom: 4, letterSpacing: '0.04em', lineHeight: 1 }}>
              {stat.label}
            </div>
            {stat.isWinRate ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#a3aac4', lineHeight: 1 }}>{avgPct}%</span>
                <span style={{ fontSize: 9, color: '#4FC3F7', lineHeight: 1 }}>→</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#dee5ff', lineHeight: 1 }}>{curPct}%</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                {stat.sub && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: stat.subColor, marginTop: 4, lineHeight: 1 }}>{stat.sub}</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── ROW 4: Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 8, position: 'relative', zIndex: 1,
      }}>
        <div style={{ fontSize: 10, color: '#7a8398', fontWeight: 500, display: 'flex', alignItems: 'center', height: 16 }}>
          快来 SEER.SPORTS 一起预测！
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#ADFF2F', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', height: 16 }}>
          seer.sports
        </div>
      </div>
    </div>
  );
}
