import type { Zone } from '../lib/adventure';

interface BossAlertProps {
  zone: Zone;
}

export function BossAlert({ zone }: BossAlertProps) {
  return (
    <div
      style={{
        border: '1px solid #C53A1E',
        background: 'rgba(197,58,30,0.06)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes bossWarn { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes bossSlide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Left accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 2, height: '100%',
        background: '#C53A1E',
        boxShadow: '0 0 8px rgba(197,58,30,0.6)',
        animation: 'bossWarn 1.2s ease-in-out infinite',
      }} />

      <div className="px-4 py-3 pl-5" style={{ animation: 'bossSlide 0.4s cubic-bezier(0.16,1,0.3,1) both' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[9px] uppercase tracking-[0.35em]"
            style={{ color: '#C53A1E', animation: 'bossWarn 1.2s ease-in-out infinite' }}>
            ⚠ boss encounter
          </span>
          <span className="font-mono text-[8px]" style={{ color: '#3a2420' }}>
            — this release
          </span>
        </div>

        <div className="font-mono text-xs uppercase tracking-[0.15em] mb-1"
          style={{ color: '#e8c89a' }}>
          {zone.bossName}
        </div>

        <p className="font-serif italic text-xs leading-relaxed mb-2"
          style={{ color: '#5C4030' }}>
          "{zone.bossLore}"
        </p>

        <div className="font-mono text-[9px] uppercase tracking-widest"
          style={{ color: '#3a2420' }}>
          defeat condition: charge to {zone.bossRequiredCharge}%+
        </div>
      </div>
    </div>
  );
}
