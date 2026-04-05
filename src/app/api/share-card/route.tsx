import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { readFileSync } from 'fs';
import path from 'path';

let interRegular: ArrayBuffer | null = null;
let interBold: ArrayBuffer | null = null;
let notoFont: ArrayBuffer | null = null;

function loadFonts() {
  if (!interRegular) {
    const buf = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'Inter-Regular.ttf'));
    interRegular = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  if (!interBold) {
    const buf = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'Inter-Bold.ttf'));
    interBold = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  if (!notoFont) {
    const buf = readFileSync(path.join(process.cwd(), 'public', 'fonts', 'NotoSansSC-Regular.woff'));
    notoFont = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  return { interRegular, interBold, notoFont };
}

function StatBox({ label, value, valueColor, sub, subColor }: {
  label: string; value: string; valueColor: string; sub?: string; subColor?: string;
}) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      background: '#1a1e30', borderRadius: 10, padding: '12px 6px',
      borderWidth: 1, borderStyle: 'solid', borderColor: '#252a40',
    }}>
      <div style={{ fontSize: 17, color: '#c3ccdf', marginBottom: 8, display: 'flex' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: valueColor, display: 'flex' }}>{value}</div>
      {sub && <div style={{ fontSize: 17, fontWeight: 700, color: subColor || '#fff', marginTop: 4, display: 'flex' }}>{sub}</div>}
    </div>
  );
}

export async function POST(req: NextRequest) {
  try {
    const { interRegular: regularData, interBold: boldData, notoFont: notoData } = loadFonts();
    const body = await req.json();
    const {
      type, title = 'Unknown Market', iconBase64, outcome,
      initialValue = 0, currentValue = 0, pnl = 0, pnlPct = 0,
      avgPrice = 0, curPrice = 0, expectedReturn = 0,
      usdcAmt = 0, entryPct, holdingStr, timeStr,
    } = body;

    const displayTitle = title.replace(/\.+$/, '');
    const isProfitable = pnl >= 0;
    const pnlColor = isProfitable ? '#ADFF2F' : '#ff6b6b';

    const outLower = (outcome || '').toLowerCase();
    const outcomeBg = outLower === 'yes' ? '#1b3f26' : outLower === 'no' ? '#3f1b1b' : '#1b2d3f';
    const outcomeColor = outLower === 'yes' ? '#6bff8f' : outLower === 'no' ? '#ff6b6b' : '#60a5fa';
    const outcomeBorderColor = outLower === 'yes' ? '#2d5f3a' : outLower === 'no' ? '#5f2d2d' : '#2d3d5f';

    const avgPctStr = (avgPrice * 100).toFixed(1);
    const curPctStr = (curPrice * 100).toFixed(1);
    const bgColor = type === 'position' ? '#141831' : '#14261a';
    const badgeBg = type === 'position' ? (isProfitable ? '#1a2d14' : '#2d1414') : '#1a2d14';
    const badgeBorderColor = type === 'position' ? (isProfitable ? '#3a5a1f' : '#5a1f1f') : '#3a5a1f';
    const badgeColor = type === 'position' ? pnlColor : '#ADFF2F';
    const badgeText = type === 'position' ? (isProfitable ? '浮盈' : '浮亏') : '胜利战报';

    const statsContent = type === 'position' ? (
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <StatBox label="投入本金" value={`$${Number(initialValue).toFixed(2)}`} valueColor="#a3aac4" />
        <StatBox label="当前价值" value={`$${Number(currentValue).toFixed(2)}`} valueColor="#fff"
          sub={`${isProfitable ? '+' : '-'}$${Math.abs(Number(pnl)).toFixed(2)} (${Math.abs(Number(pnlPct)).toFixed(1)}%)`}
          subColor={pnlColor} />
        <StatBox label="预期回报" value={`$${Number(expectedReturn).toFixed(2)}`} valueColor="#a3aac4" />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: '#1a1e30', borderRadius: 10, padding: '12px 6px',
          borderWidth: 1, borderStyle: 'solid', borderColor: '#252a40',
        }}>
          <div style={{ fontSize: 17, color: '#c3ccdf', marginBottom: 8, display: 'flex' }}>胜率变化</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 21, fontWeight: 700, color: '#a3aac4' }}>{avgPctStr}%</span>
            <span style={{ fontSize: 18, color: '#4FC3F7' }}>→</span>
            <span style={{ fontSize: 21, fontWeight: 700, color: '#dee5ff' }}>{curPctStr}%</span>
          </div>
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          background: '#1a2d14', borderRadius: 10, padding: '12px 20px', minWidth: 160,
          borderWidth: 1, borderStyle: 'solid', borderColor: '#3a5a1f',
        }}>
          <div style={{ fontSize: 17, color: '#8bcc5a', marginBottom: 8, display: 'flex' }}>净盈利</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: '#ADFF2F', display: 'flex' }}>+${Number(usdcAmt).toFixed(2)}</div>
        </div>
        <StatBox label="入场胜率" value={entryPct != null ? `@ ${entryPct}%` : '—'} valueColor="#dee5ff" />
        <StatBox label="持仓历时" value={holdingStr || '—'} valueColor="#dee5ff" />
        <StatBox label="时间" value={timeStr ? timeStr.split(' ')[0] : '—'} valueColor="#dee5ff" />
      </div>
    );

    const footerText = type === 'position' ? '快来 SEER.SPORTS 一起预测！' : '来 SEER.SPORTS 挑战我！';

    return new ImageResponse(
      (
        <div style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          justifyContent: 'space-between', padding: '30px 40px',
          background: bgColor, color: '#fff', fontFamily: 'Inter, Noto Sans SC',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Decorative circles (solid color, no gradient) */}
          <div style={{ position: 'absolute', top: -80, right: -40, width: 250, height: 250, borderRadius: 125, background: type === 'position' ? '#1f2a45' : '#1f3525', opacity: 0.6 }} />
          <div style={{ position: 'absolute', bottom: -50, left: -30, width: 200, height: 200, borderRadius: 100, background: '#152535', opacity: 0.5 }} />

          {/* ROW 1: Brand + Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 18, background: '#ADFF2F' }}>
                <div style={{ width: 26, height: 26, borderRadius: 13, background: bgColor, display: 'flex' }} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, marginLeft: 10, display: 'flex', alignItems: 'center' }}>
                SEER<span style={{ color: '#ADFF2F' }}>.</span>SPORTS
              </div>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '6px 16px', borderRadius: 20,
              background: badgeBg, borderWidth: 1, borderStyle: 'solid', borderColor: badgeBorderColor,
              fontSize: 20, fontWeight: 700, color: badgeColor,
            }}>
              {badgeText}
            </div>
          </div>

          {/* ROW 2: Icon + Title + Outcome */}
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
            {iconBase64 && (
              <img src={iconBase64} width={56} height={56} style={{ borderRadius: 12, objectFit: 'cover', background: '#fff', borderWidth: 1, borderStyle: 'solid', borderColor: '#333' }} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', marginLeft: iconBase64 ? 16 : 0, flex: 1 }}>
              <div style={{ fontSize: 26, fontWeight: 600, color: '#dee5ff', lineHeight: 1.3, display: 'flex', maxHeight: 68, overflow: 'hidden' }}>
                {displayTitle}
              </div>
              {outcome && (
                <div style={{ display: 'flex', marginTop: 8 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '4px 10px', borderRadius: 6,
                    fontSize: 18, fontWeight: 700,
                    background: outcomeBg, color: outcomeColor,
                    borderWidth: 1, borderStyle: 'solid', borderColor: outcomeBorderColor,
                  }}>
                    {outcome}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ROW 3: Stats */}
          {statsContent}

          {/* ROW 4: Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderTop: '1px solid #1f2540', paddingTop: 16, marginTop: 12,
          }}>
            <div style={{ fontSize: 20, color: '#9eacc7', fontWeight: 500, display: 'flex' }}>{footerText}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#ADFF2F', display: 'flex' }}>seer.sports</div>
          </div>
        </div>
      ),
      {
        width: 800,
        height: 418,
        fonts: [
          { name: 'Inter', data: regularData!, style: 'normal' as const, weight: 400 },
          { name: 'Inter', data: boldData!, style: 'normal' as const, weight: 700 },
          { name: 'Noto Sans SC', data: notoData!, style: 'normal' as const, weight: 400 },
        ],
      }
    );
  } catch (e: any) {
    console.error('Share card generation failed:', e);
    return new Response(`Failed: ${e.message}`, { status: 500 });
  }
}
