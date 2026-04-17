'use client';

import { getCountryFlagUrl } from '@/lib/countryFlags';
import { KnockoutMatch, BRACKET_2022, BRACKET_2018, BRACKET_2014, BRACKET_2026_TBD, KnockoutNode } from '@/lib/mockKnockout';
import { HistoricYear } from '@/lib/mockStandings';

function flattenMatches(node: KnockoutNode, stage: string): KnockoutNode[] {
  let matches: KnockoutNode[] = [];
  if (node.stage === stage) matches.push(node);
  if (node.children) {
    node.children.forEach(child => {
      matches = matches.concat(flattenMatches(child, stage));
    });
  }
  return matches;
}

const H_TOTAL = 720;
const H_R16 = H_TOTAL / 8;
const H_QF = H_TOTAL / 4;
const H_SF = H_TOTAL / 2;
const H_FINAL = H_TOTAL;

const COL_WIDTH = 150;
const GAP_X = 40;

function BezierConnector({ start, end, isHighlight }: { start: [number, number]; end: [number, number], isHighlight?: boolean }) {
  const [x1, y1] = start;
  const [x2, y2] = end;
  
  //... rest of the file logic starts unchanged ...
  const cp1X = x1 + (x2 - x1) * 0.5;
  const cp2X = x1 + (x2 - x1) * 0.5;
  
  const pathData = `M ${x1} ${y1} C ${cp1X} ${y1}, ${cp2X} ${y2}, ${x2} ${y2}`;

  return (
    <>
      <path 
        d={pathData} 
        fill="none" 
        stroke={isHighlight ? '#00F0FF' : 'rgba(255, 255, 255, 0.1)'} 
        strokeWidth={isHighlight ? 2 : 1.5} 
        style={{ filter: isHighlight ? 'drop-shadow(0 0 4px rgba(0,240,255,0.8))' : 'none', transition: 'all 0.3s ease' }}
      />
    </>
  );
}

function MatchCard({ node }: { node: KnockoutNode }) {
  if (!node.match) {
    return (
      <div className="w-full h-[68px] rounded-lg border border-white/5 bg-white/5 flex flex-col justify-center items-center opacity-50 relative shrink-0">
        <span style={{ fontFamily: 'Inter', fontSize: '11px', fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.05em' }}>TBD</span>
      </div>
    );
  }

  const m = node.match;
  
  return (
    <div 
      className="w-full rounded-[10px] overflow-hidden flex flex-col shrink-0 relative transition-transform hover:scale-[1.02]"
      style={{ 
        background: 'rgba(15, 20, 30, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
      }}
    >
      <div className="flex justify-between items-center px-2 py-1 border-b border-white/5" style={{ background: 'rgba(0,0,0,0.4)' }}>
        <span style={{ fontSize: '9px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>{m.dateStr}</span>
        {m.isPenalties && <span style={{ fontSize: '9px', fontWeight: 800, color: '#FFD700' }}>FT (P)</span>}
        {m.isAfterExtraTime && <span style={{ fontSize: '9px', fontWeight: 800, color: '#ADFF2F' }}>AET</span>}
      </div>

      <div className="flex flex-col p-2 gap-1.5">
        {[m.home, m.away].map((team, idx) => (
          <div key={idx} className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-[18px] h-[12px] rounded-[2px] overflow-hidden shrink-0 border border-white/10 opacity-90">
                <img src={getCountryFlagUrl(team.name)} className="w-full h-full object-cover" />
              </div>
              <span 
                style={{ 
                  fontFamily: 'Inter', 
                  fontSize: '12px', 
                  fontWeight: team.winner ? 800 : 500, 
                  color: team.winner ? '#fff' : 'rgba(255,255,255,0.5)',
                  width: '74px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {team.name}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {team.penalties !== undefined && (
                <span style={{ fontSize: '9px', fontWeight: 600, color: team.winner ? '#00F0FF' : 'rgba(255,255,255,0.3)' }}>
                  ({team.penalties})
                </span>
              )}
              <span style={{ fontFamily: 'Inter', fontSize: '13px', fontWeight: team.winner ? 900 : 600, color: team.winner ? '#fff' : 'rgba(255,255,255,0.3)' }}>
                {team.score}
              </span>
              <div className="w-1 h-3 rounded-full flex-shrink-0" style={{ background: team.winner ? '#00F0FF' : 'transparent', boxShadow: team.winner ? '0 0 6px #00F0FF' : 'none' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function KnockoutBracketView({ year }: { year: HistoricYear }) {
  let root = BRACKET_2022;
  if (year === '2026') root = BRACKET_2026_TBD;
  else if (year === '2018') root = BRACKET_2018;
  else if (year === '2014') root = BRACKET_2014;

  // Flatten lists to render columns
  const r16Nodes = flattenMatches(root, 'r16');
  const qfNodes = flattenMatches(root, 'qf');
  const sfNodes = flattenMatches(root, 'sf');
  const finalNode = [root]; // root is 'final'

  // Coordinates calculation for SVG Lines
  const colWidthWithGap = COL_WIDTH + GAP_X;

  const renderLines = () => {
    const lines = [];
    
    // Connect R16 to QF
    for (let i = 0; i < 8; i++) {
      const qfIdx = Math.floor(i / 2);
      const isTopChild = i % 2 === 0; // True if home, false if away in the backend QF structure
      const startX = COL_WIDTH;
      const startY = (i + 0.5) * H_R16;
      const endX = colWidthWithGap;
      const endY = (qfIdx + 0.5) * H_QF;
      
      const r16Match = r16Nodes[i]?.match;
      const qfMatch = qfNodes[qfIdx]?.match;
      let isHighlight = false;
      
      if (r16Match && qfMatch) {
        // If the R16 winner matches the QF home/away
        const advancingTeamCode = r16Match.home.winner ? r16Match.home.code : (r16Match.away.winner ? r16Match.away.code : null);
        const qfTeamCode = isTopChild ? qfMatch.home.code : qfMatch.away.code;
        if (advancingTeamCode && advancingTeamCode === qfTeamCode) isHighlight = true;
      }

      lines.push(<BezierConnector key={`r16-qf-${i}`} start={[startX, startY]} end={[endX, endY]} isHighlight={isHighlight} />);
    }

    // Connect QF to SF
    for (let i = 0; i < 4; i++) {
      const sfIdx = Math.floor(i / 2);
      const isTopChild = i % 2 === 0;
      const startX = COL_WIDTH + colWidthWithGap;
      const startY = (i + 0.5) * H_QF;
      const endX = colWidthWithGap + colWidthWithGap;
      const endY = (sfIdx + 0.5) * H_SF;

      const qfMatch = qfNodes[i]?.match;
      const sfMatch = sfNodes[sfIdx]?.match;
      let isHighlight = false;
      
      if (qfMatch && sfMatch) {
         const advancingTeamCode = qfMatch.home.winner ? qfMatch.home.code : (qfMatch.away.winner ? qfMatch.away.code : null);
         const sfTeamCode = isTopChild ? sfMatch.home.code : sfMatch.away.code;
         if (advancingTeamCode && advancingTeamCode === sfTeamCode) isHighlight = true;
      }

      lines.push(<BezierConnector key={`qf-sf-${i}`} start={[startX, startY]} end={[endX, endY]} isHighlight={isHighlight} />);
    }

    // Connect SF to Final
    for (let i = 0; i < 2; i++) {
      const isTopChild = i % 2 === 0;
      const startX = COL_WIDTH + colWidthWithGap * 2;
      const startY = (i + 0.5) * H_SF;
      const endX = colWidthWithGap * 2 + colWidthWithGap;
      const endY = 0.5 * H_FINAL;

      const sfMatch = sfNodes[i]?.match;
      const fMatch = finalNode[0]?.match;
      let isHighlight = false;

      if (sfMatch && fMatch) {
         const advancingTeamCode = sfMatch.home.winner ? sfMatch.home.code : (sfMatch.away.winner ? sfMatch.away.code : null);
         const fTeamCode = isTopChild ? fMatch.home.code : fMatch.away.code;
         if (advancingTeamCode && advancingTeamCode === fTeamCode) isHighlight = true;
      }

      lines.push(<BezierConnector key={`sf-f-${i}`} start={[startX, startY]} end={[endX, endY]} isHighlight={isHighlight} />);
    }

    return lines;
  };

  return (
    <div className="w-full relative rounded-xl" style={{ height: `${H_TOTAL}px` }}>
      
      {/* ── Desktop/Mobile Swipe Container ── */}
      <div 
        className="w-full h-full overflow-x-auto overflow-y-hidden no-scrollbar"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
      >
        <div className="relative flex" style={{ width: `${COL_WIDTH * 4 + GAP_X * 3}px`, height: '100%', paddingLeft: '1px', paddingRight: '20px' }}>
          
          {/* SVG Overlay for Connections */}
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
            {renderLines()}
          </svg>

          {/* R16 */}
          <div className="flex flex-col justify-around shrink-0 relative z-10" style={{ width: `${COL_WIDTH}px`, height: '100%', scrollSnapAlign: 'start' }}>
            {r16Nodes.map((n, i) => (
               <div key={i} className="flex flex-col justify-center" style={{ height: `${H_R16}px` }}>
                 <MatchCard node={n} />
               </div>
            ))}
          </div>

          <div style={{ width: `${GAP_X}px`, flexShrink: 0 }} />

          {/* QF */}
          <div className="flex flex-col justify-around shrink-0 relative z-10" style={{ width: `${COL_WIDTH}px`, height: '100%', scrollSnapAlign: 'start' }}>
            {qfNodes.map((n, i) => (
               <div key={i} className="flex flex-col justify-center" style={{ height: `${H_QF}px` }}>
                 <MatchCard node={n} />
               </div>
            ))}
          </div>

          <div style={{ width: `${GAP_X}px`, flexShrink: 0 }} />

          {/* SF */}
          <div className="flex flex-col justify-around shrink-0 relative z-10" style={{ width: `${COL_WIDTH}px`, height: '100%', scrollSnapAlign: 'start' }}>
            {sfNodes.map((n, i) => (
               <div key={i} className="flex flex-col justify-center" style={{ height: `${H_SF}px` }}>
                 <MatchCard node={n} />
               </div>
            ))}
          </div>

          <div style={{ width: `${GAP_X}px`, flexShrink: 0 }} />

          {/* Final */}
          <div className="flex flex-col justify-around shrink-0 relative z-10" style={{ width: `${COL_WIDTH}px`, height: '100%', scrollSnapAlign: 'center' }}>
            <div className="flex flex-col justify-center" style={{ height: `${H_FINAL}px` }}>
              <div className="text-center mb-3">
                 <span className="text-sm font-black tracking-[0.2em] text-[#FFD700] uppercase drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">World Cup Final</span>
              </div>
              <MatchCard node={finalNode[0]} />
              
              {/* Champion Crown / Trophy if finished */}
              {finalNode[0].match && (
                 <div className="flex justify-center mt-3 animate-bounce">
                   <div className="px-3 py-1 bg-[#FFD700]/20 border border-[#FFD700]/40 rounded-full flex items-center gap-2">
                     <span style={{ fontSize: '12px' }}>👑</span>
                     <span className="text-[#FFD700] text-xs font-bold tracking-widest">CHAMPION</span>
                   </div>
                 </div>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
