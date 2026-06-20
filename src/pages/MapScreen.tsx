import { ZONES, type AdventureState } from '../lib/adventure';
import type { ShatterMode } from '../App';

interface MapScreenProps {
  count: number;
  selectedMode: ShatterMode;
  adventureState: AdventureState;
  onClose: () => void;
  onSelectZone: (mode: ShatterMode) => void;
}

export function MapScreen({ count, selectedMode, adventureState, onClose, onSelectZone }: MapScreenProps) {
  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto relative overflow-hidden"
      style={{ background: '#0d0907', color: '#F2EFE9' }}
    >
      <style>{`
        @keyframes mapFadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes zoneGlow { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes bossFlicker { 0%,100%{opacity:1} 50%{opacity:0.7} }
      `}</style>

      {/* Atmospheric fog overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 20%, rgba(197,58,30,0.04) 0%, transparent 60%)',
      }} />
      {/* Grid lines — subtle RPG map feel */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(242,239,233,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(242,239,233,0.015) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 pt-6 pb-4"
        style={{ borderBottom: '1px solid #1a1510' }}>
        <div>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: '#3a3020' }}>
            ◆ unsend games studio
          </div>
          <div className="font-mono text-xs tracking-[0.25em] uppercase mt-1" style={{ color: '#e8c89a' }}>
            World Map
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: '#3a3020' }}>
            {count} releases
          </span>
          <button
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-widest transition-all"
            style={{ color: '#5C5547', borderBottom: '1px solid #2a2820', paddingBottom: 1 }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F2EFE9'; e.currentTarget.style.borderBottomColor = '#F2EFE9'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#5C5547'; e.currentTarget.style.borderBottomColor = '#2a2820'; }}
          >
            ← back
          </button>
        </div>
      </header>

      {/* Subtitle */}
      <div className="px-6 py-3 relative z-10" style={{ borderBottom: '1px solid #120e0a' }}>
        <p className="font-serif italic text-xs" style={{ color: '#5C5547' }}>
          "Six realms await. Each holds a shadow of what was left unsaid."
        </p>
      </div>

      {/* Zone list */}
      <main className="flex-1 overflow-y-auto px-4 py-4 relative z-10 flex flex-col gap-3">
        {ZONES.map((zone, idx) => {
          const unlocked = count >= zone.unlockAt;
          const isActive = selectedMode === zone.modeId;
          const bossDefeated = adventureState.bossesDefeated.some(n => {
            const zoneIdx = Math.floor(n / 5) - 1;
            return zoneIdx === idx;
          });
          const bossAvailable = unlocked && count >= (idx + 1) * 5;

          return (
            <div
              key={zone.id}
              onClick={() => unlocked && onSelectZone(zone.modeId)}
              style={{
                border: isActive
                  ? `1px solid ${zone.color}`
                  : unlocked ? '1px solid #1e1a15' : '1px solid #120e0a',
                background: isActive
                  ? `${zone.color}0a`
                  : unlocked ? '#110d09' : '#0a0806',
                cursor: unlocked ? 'pointer' : 'default',
                animation: `mapFadeIn 0.5s ${idx * 0.06}s cubic-bezier(0.16,1,0.3,1) both`,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Active zone accent */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, width: 2, height: '100%',
                  background: zone.color,
                  boxShadow: `0 0 8px ${zone.color}88`,
                }} />
              )}

              <div className="px-4 py-4 flex gap-4 items-start">
                {/* Symbol */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-0.5">
                  <span style={{
                    fontSize: 22,
                    color: unlocked ? zone.color : '#2a2420',
                    filter: unlocked ? `drop-shadow(0 0 6px ${zone.color}66)` : 'none',
                    animation: isActive ? 'zoneGlow 2s ease-in-out infinite' : 'none',
                  }}>
                    {zone.symbol}
                  </span>
                  <span className="font-mono text-[8px] tracking-widest" style={{ color: '#2a2420' }}>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <span className="font-mono text-xs uppercase tracking-[0.15em]"
                      style={{ color: unlocked ? '#e8c89a' : '#2a2420' }}>
                      {zone.name}
                    </span>
                    {isActive && (
                      <span className="font-mono text-[8px] uppercase tracking-widest flex-shrink-0"
                        style={{ color: zone.color }}>
                        ← current
                      </span>
                    )}
                    {!unlocked && (
                      <span className="font-mono text-[8px] uppercase tracking-widest flex-shrink-0"
                        style={{ color: '#2a2420' }}>
                        locked at {zone.unlockAt}
                      </span>
                    )}
                  </div>

                  {unlocked ? (
                    <>
                      <p className="font-serif italic text-xs leading-relaxed mb-2"
                        style={{ color: '#5C5547' }}>
                        {zone.subtitle}
                      </p>
                      <p className="font-mono text-[10px] leading-relaxed mb-3"
                        style={{ color: '#3a3020' }}>
                        {zone.lore}
                      </p>

                      {/* Boss section */}
                      <div className="flex items-center gap-2 pt-2"
                        style={{ borderTop: '1px solid #1a1510' }}>
                        <span style={{
                          fontSize: 10,
                          color: bossDefeated ? zone.color : '#3a3020',
                        }}>
                          {bossDefeated ? '◆' : '◇'}
                        </span>
                        <span className="font-mono text-[9px] uppercase tracking-widest"
                          style={{ color: bossDefeated ? zone.color : '#3a3020' }}>
                          {bossDefeated
                            ? `${zone.bossName} — defeated`
                            : bossAvailable
                              ? `${zone.bossName} — awaits`
                              : `${zone.bossName} — boss`}
                        </span>
                        {bossAvailable && !bossDefeated && (
                          <span className="font-mono text-[8px]" style={{ color: '#C53A1E', animation: 'bossFlicker 1s ease-in-out infinite' }}>
                            ⚠
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="font-serif italic text-xs" style={{ color: '#2a2420' }}>
                      Reach {zone.unlockAt} releases to unlock this realm.
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-4 flex justify-between items-center"
        style={{ borderTop: '1px solid #120e0a' }}>
        <span className="font-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: '#1e1a15' }}>
          ◆ · story driven · emotional · experience · ◆
        </span>
      </footer>
    </div>
  );
}
