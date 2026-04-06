'use client';

import React from 'react';
import type { ShareCardData } from '@/hooks/useShareCard';

export function HistoryShareCard({ data }: { data: ShareCardData }) {
  const displayTitle = (data.title || '未知市场').replace(/\.+$/, '');
  const netProfit = data.netProfit || 0;
  const entryPct = data.entryPct;
  const holdingStr = data.holdingStr || '';
  const timeStr = data.timeStr || '';
  const outcome = data.outcome || '';

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
        background: 'linear-gradient(160deg, #1E2D24 0%, #111A1B 100%)',
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
      <div style={{ position: 'absolute', top: -50, right: -30, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(173,255,47,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -20, width: 120, height: 120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,240,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── ROW 1: Brand + Badge ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 22, height: 22, borderRadius: '50%',
            background: 'linear-gradient(135deg, #ADFF2F, #00F0FF)'
          }}>
            <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#1E2D24' }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: -0.3, color: '#fff', display: 'flex', alignItems: 'center', height: 22 }}>
            SEER<span style={{ color: '#ADFF2F' }}>.</span>SPORTS
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: 22, padding: '0 10px',
          borderRadius: 20,
          background: 'rgba(173,255,47,0.15)',
          border: '1px solid rgba(173,255,47,0.3)',
          fontSize: 10, fontWeight: 800, color: '#ADFF2F',
        }}>
          <span style={{ paddingTop: 1 }}>胜利战报</span>
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

      {/* ── ROW 3: Big profit number + detail stats ── */}
      <div style={{
        display: 'flex', gap: 8, alignItems: 'stretch',
        position: 'relative', zIndex: 1, marginTop: 2, marginBottom: 4
      }}>
        <div style={{
          flex: '0 0 auto',
          background: 'linear-gradient(135deg, rgba(173,255,47,0.15), rgba(0,240,255,0.1))',
          borderRadius: 10, padding: '8px 14px',
          border: '1px solid rgba(173,255,47,0.3)',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center',
          minWidth: 100,
        }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(173,255,47,0.8)', marginBottom: 6, letterSpacing: '0.06em', lineHeight: 1 }}>
            净盈利
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#ADFF2F', letterSpacing: -1, lineHeight: 1 }}>
            +${netProfit.toFixed(2)}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', gap: 8 }}>
          {[
            { label: '入场胜率', value: entryPct != null ? `@ ${entryPct}%` : '—' },
            { label: '持仓历时', value: holdingStr || '—' },
            { label: '时间', value: timeStr ? timeStr.split(' ')[0] : '—' },
          ].map((stat, i) => (
            <div key={i} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '8px 4px',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'
            }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: '#8b94a8', marginBottom: 6, letterSpacing: '0.04em', lineHeight: 1 }}>{stat.label}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#dee5ff', whiteSpace: 'nowrap', lineHeight: 1 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── ROW 4: Footer ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 8, position: 'relative', zIndex: 1,
      }}>
        <div style={{ fontSize: 10, color: '#7a8398', fontWeight: 500, display: 'flex', alignItems: 'center', height: 16 }}>
          来 SEER.SPORTS 挑战我！
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#ADFF2F', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', height: 16 }}>
          seer.sports
        </div>
      </div>
    </div>
  );
}
