'use client';

/**
 * Reusable placeholder screen for tabs that are not yet implemented.
 * Renders a centered icon + title + "Coming Soon" label.
 */
export function PlaceholderScreen({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: 'rgba(255,215,0,0.1)', border: '1.5px solid rgba(255,215,0,0.2)' }}
      >
        {icon}
      </div>
      <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: '15px', color: 'rgba(255,255,255,0.6)' }}>
        {title}
      </div>
      <div style={{ fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>
        敬请期待 · Coming Soon
      </div>
    </div>
  );
}
