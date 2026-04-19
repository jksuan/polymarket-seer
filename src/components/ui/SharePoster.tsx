import React, { forwardRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ParsedMatch } from './MatchCard';
import { Share2, Zap, TrendingUp, DollarSign } from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';

export interface SharePosterProps {
  match: ParsedMatch;
  userPosition?: any; // The user's holding for this match, if any
}

// “终极对决”炫耀海报 - The Combat Flex
export const SharePoster = forwardRef<HTMLDivElement, SharePosterProps>(
  ({ match, userPosition }, ref) => {
    // Determine the supported team based on the position
    // If no position, default to neutral
    let backedSide: 'home' | 'away' | 'draw' | null = null;
    let size = 0;
    
    if (userPosition && parseFloat(userPosition.size) > 0) {
      if (userPosition.asset === match.home.tokenId) backedSide = 'home';
      else if (userPosition.asset === match.away.tokenId) backedSide = 'away';
      else if (userPosition.asset === match.draw.tokenId) backedSide = 'draw';
      size = parseFloat(userPosition.size);
    }

    // Determine dominent colors
    const primaryColor = backedSide === 'home' ? match.home.style.primary 
                       : backedSide === 'away' ? match.away.style.primary 
                       : 'rgba(255,255,255,0.1)';
    const glowColor = backedSide === 'home' ? match.home.style.glow 
                    : backedSide === 'away' ? match.away.style.glow 
                    : 'rgba(0, 240, 255, 0.5)';

    const actionText = backedSide === 'home' ? `I BACKED ${match.home.name.toUpperCase()}`
                     : backedSide === 'away' ? `I BACKED ${match.away.name.toUpperCase()}`
                     : backedSide === 'draw' ? `DRAW IS INEVITABLE`
                     : `WHO WILL WIN?`;

    // Static poster dimensions: 1080x1920 (9:16)
    return (
      <div 
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          background: '#0B0F19',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'Inter, sans-serif',
          color: '#fff',
        }}
      >
        {/* Background glow effects */}
        <div 
          style={{
            position: 'absolute',
            top: '-20%',
            left: backedSide === 'away' ? '80%' : '-20%',
            width: '140%',
            height: '140%',
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 60%)`,
            opacity: 0.15,
            filter: 'blur(100px)',
          }}
        />

        {/* Content Container */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', padding: '100px 80px' }}>
          
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '32px', fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '8px' }}>
                FIFA World Cup 2026
              </div>
              <div style={{ fontSize: '48px', fontWeight: 900, color: glowColor, textShadow: `0 0 30px ${glowColor}` }}>
                POLYMARKET SEER
              </div>
            </div>
            {match.status === 'live' && (
              <div style={{ 
                background: 'linear-gradient(135deg, #FF2E00, #FF6B00)', 
                padding: '16px 32px', 
                borderRadius: '24px',
                fontSize: '32px',
                fontWeight: 900,
                boxShadow: '0 0 40px rgba(255,80,0,0.5)'
              }}>
                LIVE NOW
              </div>
            )}
          </div>

          {/* Core Typography Block */}
          <div style={{ marginTop: '140px', flex: 1 }}>
            <div style={{ fontSize: '110px', fontWeight: 900, fontStyle: 'italic', lineHeight: 1.1, textTransform: 'uppercase', width: '100%' }}>
              <span style={{ color: '#fff' }}>{actionText.split(' ')[0]} </span>
              <span style={{ color: glowColor, textShadow: `0 0 80px ${glowColor}` }}>
                {actionText.split(' ').slice(1).join(' ')}
              </span>
            </div>

            {/* Duel Area */}
            <div style={{ position: 'relative', height: '600px', marginTop: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Home Team */}
              <div style={{ 
                position: 'absolute', left: 0, 
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transform: backedSide === 'away' ? 'scale(0.8) translateY(100px)' : 'scale(1.1) translateY(-40px)',
                opacity: backedSide === 'away' ? 0.3 : 1,
                zIndex: backedSide === 'home' ? 30 : 10,
                transition: 'all 0.5s',
              }}>
                <img 
                  src={getCountryFlagUrl(match.home.name, 'svg')} 
                  style={{ width: '400px', height: '400px', borderRadius: '50%', objectFit: 'cover', border: `8px solid ${match.home.style.accent}`, boxShadow: `0 0 100px ${match.home.style.glow}` }}
                  alt={match.home.name}
                  crossOrigin="anonymous"
                />
                <div style={{ fontSize: '64px', fontWeight: 900, marginTop: '40px' }}>{match.home.name}</div>
                <div style={{ fontSize: '48px', fontWeight: 900, color: match.home.style.accent, marginTop: '10px' }}>
                  {(100 / match.home.probability).toFixed(2)}x
                </div>
              </div>

              {/* VS Logo */}
              <div style={{ zIndex: 20, position: 'relative' }}>
                <div style={{ background: '#0B0F19', padding: '40px', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.1)' }}>
                  <Zap size={120} color="#fff" fill="#fff" />
                </div>
              </div>

              {/* Away Team */}
              <div style={{ 
                position: 'absolute', right: 0, 
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                transform: backedSide === 'home' ? 'scale(0.8) translateY(100px)' : 'scale(1.1) translateY(-40px)',
                opacity: backedSide === 'home' ? 0.3 : 1,
                zIndex: backedSide === 'away' ? 30 : 10,
                transition: 'all 0.5s',
              }}>
                <img 
                  src={getCountryFlagUrl(match.away.name, 'svg')} 
                  style={{ width: '400px', height: '400px', borderRadius: '50%', objectFit: 'cover', border: `8px solid ${match.away.style.accent}`, boxShadow: `0 0 100px ${match.away.style.glow}` }}
                  alt={match.away.name}
                  crossOrigin="anonymous"
                />
                <div style={{ fontSize: '64px', fontWeight: 900, marginTop: '40px' }}>{match.away.name}</div>
                <div style={{ fontSize: '48px', fontWeight: 900, color: match.away.style.accent, marginTop: '10px' }}>
                  {(100 / match.away.probability).toFixed(2)}x
                </div>
              </div>
            </div>
          </div>

          {/* Stats Glass Panel */}
          {size > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(30px)',
              border: '2px solid rgba(255,255,255,0.1)',
              borderRadius: '48px',
              padding: '60px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '60px',
              boxShadow: '0 30px 100px rgba(0,0,0,0.5)'
            }}>
              <div>
                <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '16px' }}>POSITION STAKED</div>
                <div style={{ fontSize: '64px', color: '#fff', fontWeight: 900, display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                  {size.toFixed(2)} <span style={{ fontSize: '40px', color: glowColor }}>SHARES</span>
                </div>
              </div>
              <div style={{ width: '4px', height: '120px', background: 'rgba(255,255,255,0.1)' }} />
              <div>
                <div style={{ fontSize: '32px', color: 'rgba(255,255,255,0.5)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '16px', textAlign: 'right' }}>MARKET VOLUME</div>
                <div style={{ fontSize: '64px', color: '#fff', fontWeight: 900, textAlign: 'right' }}>
                  ${(match.volume / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          )}

          {/* Footer / QR Code */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '2px solid rgba(255,255,255,0.1)', paddingTop: '60px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '48px', fontWeight: 900, color: '#fff' }}>Think you know better?</div>
              <div style={{ fontSize: '32px', fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>Scan to challenge my prediction on Polymarket</div>
            </div>
            <div style={{ background: '#fff', padding: '24px', borderRadius: '32px' }}>
              <QRCodeSVG 
                value={`https://polymarket.com/event/${match.id}`} 
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
          </div>

        </div>
      </div>
    );
  }
);
SharePoster.displayName = 'SharePoster';
