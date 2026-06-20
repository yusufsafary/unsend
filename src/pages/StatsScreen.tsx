import { Wordmark } from '../components/Wordmark';
import { ALL_ACHIEVEMENTS, getLevelFromXP, getXPProgress, type GameState } from '../lib/gameState';
import { LEVEL_THRESHOLDS } from '../lib/gameState';

interface StatsScreenProps {
  gameState: GameState;
  count: number;
  streak: number;
  onClose: () => void;
}

export function StatsScreen({ gameState, count, streak, onClose }: StatsScreenProps) {
  const { xp, level, achievements } = gameState;
  const progress = getXPProgress(xp, level);
  const isMaxLevel = level >= LEVEL_THRESHOLDS.length;
  const unlockedCount = Object.keys(achievements).length;

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto overflow-y-auto"
      style={{ background: '#16140F', color: '#F2EFE9' }}
    >
      <style>{`
        @keyframes barFill { from { width: 0 } to { width: var(--bar-w) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <header className="flex justify-between items-center p-6 border-b" style={{ borderColor: '#1a1815' }}>
        <Wordmark />
        <button
          onClick={onClose}
          className="font-mono text-xs uppercase tracking-widest transition-colors"
          style={{ color: '#5C5547' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F2EFE9'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5547'; }}
        >
          ← back
        </button>
      </header>

      <main className="flex flex-col gap-8 p-6" style={{ animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Level & XP */}
        <section className="flex flex-col gap-4">
          <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase" style={{ color: '#3a3530' }}>
            — rank
          </label>
          <div className="flex items-end justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#5C5547' }}>level</span>
              <div className="font-serif italic" style={{ fontSize: '3.5rem', color: '#C53A1E', lineHeight: 1 }}>
                {level}
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs" style={{ color: '#5C5547' }}>{xp.toLocaleString()} xp total</span>
            </div>
          </div>

          {/* XP progress bar */}
          <div>
            <div className="w-full h-[2px] relative" style={{ background: '#1a1815' }}>
              <div
                style={{
                  position: 'absolute', inset: 0,
                  width: `${progress.pct}%`,
                  background: '#C53A1E',
                  boxShadow: progress.pct > 80 ? '0 0 6px #C53A1E88' : 'none',
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[9px]" style={{ color: '#3a3530' }}>
                {isMaxLevel ? 'max level' : `${progress.current} / ${progress.needed} xp`}
              </span>
              <span className="font-mono text-[9px]" style={{ color: '#3a3530' }}>
                {isMaxLevel ? '' : `lvl ${level + 1}`}
              </span>
            </div>
          </div>
        </section>

        {/* Stats grid */}
        <section className="flex flex-col gap-4">
          <label className="text-xs font-mono tracking-widest uppercase" style={{ color: '#3a3530' }}>— stats</label>
          <div className="grid grid-cols-3 gap-px" style={{ background: '#1a1815' }}>
            {[
              { label: 'releases', value: count },
              { label: 'streak',   value: `${streak}d` },
              { label: 'badges',   value: `${unlockedCount}/${ALL_ACHIEVEMENTS.length}` },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-5"
                style={{ background: '#16140F', gap: 4 }}>
                <span className="font-serif italic" style={{ fontSize: '1.8rem', color: '#F2EFE9', lineHeight: 1 }}>
                  {s.value}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3530' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Achievements */}
        <section className="flex flex-col gap-4 pb-10">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono tracking-widest uppercase" style={{ color: '#3a3530' }}>— achievements</label>
            <span className="font-mono text-[9px]" style={{ color: '#3a3530' }}>
              {unlockedCount} / {ALL_ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="flex flex-col gap-px" style={{ background: '#1a1815' }}>
            {ALL_ACHIEVEMENTS.map(ach => {
              const unlocked = !!achievements[ach.id];
              return (
                <div key={ach.id}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{
                    background: '#16140F',
                    opacity: unlocked ? 1 : 0.4,
                  }}>
                  <span className="font-mono text-base" style={{ color: unlocked ? '#C53A1E' : '#2a2820', minWidth: 20 }}>
                    {ach.icon}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs uppercase tracking-widest"
                      style={{ color: unlocked ? '#F2EFE9' : '#3a3530' }}>
                      {ach.title}
                    </span>
                    <span className="font-mono text-[9px]" style={{ color: '#3a3530', textTransform: 'none', letterSpacing: 'normal' }}>
                      {ach.desc}
                    </span>
                  </div>
                  {unlocked && (
                    <span className="ml-auto font-mono text-[9px]" style={{ color: '#C53A1E' }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
