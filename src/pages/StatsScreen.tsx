import { Wordmark } from '../components/Wordmark';
import { ALL_ACHIEVEMENTS, getLevelFromXP, getXPProgress, type GameState, LEVEL_THRESHOLDS } from '../lib/gameState';
import { QUESTS, type AdventureState } from '../lib/adventure';

interface StatsScreenProps {
  gameState: GameState;
  adventureState: AdventureState;
  count: number;
  streak: number;
  username: string;
  onClose: () => void;
}

const LEVEL_TITLES = [
  'The Wanderer',
  'The Searcher',
  'The Rager',
  'The Confessor',
  'The Mirror Walker',
  'The Time Keeper',
  'The Spiral Seeker',
  'The Glitch',
  'The Void Traveler',
  'The Shadow Breaker',
  'The Unsent',
];

export function StatsScreen({ gameState, adventureState, count, streak, username, onClose }: StatsScreenProps) {
  const { xp, level, achievements, dailyChallengesCompleted } = gameState;
  const progress = getXPProgress(xp, level);
  const isMaxLevel = level >= LEVEL_THRESHOLDS.length;
  const unlockedAchs = Object.keys(achievements).length;
  const completedQuestCount = adventureState.completedQuests.length;
  const bossesDefeated = adventureState.bossesDefeated.length;
  const levelTitle = LEVEL_TITLES[Math.min(level - 1, LEVEL_TITLES.length - 1)] ?? 'The Wanderer';

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto overflow-y-auto"
      style={{ background: '#0d0907', color: '#F2EFE9' }}
    >
      <style>{`
        @keyframes barGrow { from{width:0} to{width:var(--w)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes chroniclePulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 flex justify-between items-center px-6 py-4"
        style={{ background: '#0d0907', borderBottom: '1px solid #1a1510' }}>
        <div>
          <div className="font-mono text-[8px] tracking-[0.45em] uppercase" style={{ color: '#3a3020' }}>chronicle</div>
        </div>
        <button onClick={onClose}
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: '#5C5547', borderBottom: '1px solid #2a2418', paddingBottom: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F2EFE9'; e.currentTarget.style.borderBottomColor = '#F2EFE9'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5547'; e.currentTarget.style.borderBottomColor = '#2a2418'; }}>
          ← back
        </button>
      </header>

      <main className="flex flex-col" style={{ animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Character identity */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[8px] tracking-[0.4em] uppercase mb-2" style={{ color: '#3a3020' }}>
            ◆ warrior
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.2em] mb-1" style={{ color: '#e8c89a' }}>
            {username}
          </div>
          <div className="font-serif italic" style={{ color: '#5C5547', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            {levelTitle}
          </div>

          {/* Level + XP */}
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-widest mb-1" style={{ color: '#3a3020' }}>level</div>
              <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 'clamp(3rem,12vw,4.5rem)', color: '#C53A1E', lineHeight: 1 }}>
                {level}
              </div>
            </div>
            <div className="text-right pb-2">
              <div className="font-mono text-xs" style={{ color: '#5C5547' }}>{xp.toLocaleString()} xp total</div>
              {!isMaxLevel && (
                <div className="font-mono text-[9px]" style={{ color: '#3a3020' }}>
                  {progress.needed - progress.current} xp to lv{level + 1}
                </div>
              )}
            </div>
          </div>

          {/* XP Bar */}
          <div className="w-full h-[3px] relative mb-2" style={{ background: '#1a1510' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              width: `${isMaxLevel ? 100 : progress.pct}%`,
              background: '#C53A1E',
              boxShadow: progress.pct > 80 ? '0 0 8px #C53A1E66' : 'none',
              transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
            }} />
          </div>
          <div className="flex justify-between">
            <span className="font-mono text-[8px]" style={{ color: '#2a2418' }}>
              {isMaxLevel ? '✦ max level reached' : `${progress.current} / ${progress.needed} xp`}
            </span>
            {!isMaxLevel && (
              <span className="font-mono text-[8px]" style={{ color: '#2a2418' }}>lv{level + 1}</span>
            )}
          </div>
        </section>

        {/* Stats grid */}
        <section className="px-6 py-6" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-4" style={{ color: '#3a3020' }}>
            ◆ stats
          </div>
          <div className="grid grid-cols-3 gap-px" style={{ background: '#1a1510' }}>
            {[
              { label: 'releases', value: count, sub: 'total' },
              { label: 'streak', value: streak, sub: 'days' },
              { label: 'bosses', value: bossesDefeated, sub: 'defeated' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-5 gap-1"
                style={{ background: '#0d0907' }}>
                <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '2rem', color: '#F2EFE9', lineHeight: 1 }}>
                  {s.value}
                </div>
                <div className="font-mono text-[7px] uppercase tracking-widest" style={{ color: '#3a3020' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-px mt-px" style={{ background: '#1a1510' }}>
            {[
              { label: 'quests done', value: completedQuestCount, total: QUESTS.length },
              { label: 'achievements', value: unlockedAchs, total: ALL_ACHIEVEMENTS.length },
              { label: 'daily challenges', value: dailyChallengesCompleted, total: null },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center py-5 gap-1"
                style={{ background: '#0d0907' }}>
                <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '1.6rem', color: '#8a7255', lineHeight: 1 }}>
                  {s.value}{s.total ? `/${s.total}` : ''}
                </div>
                <div className="font-mono text-[7px] uppercase tracking-widest text-center" style={{ color: '#3a3020' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quests */}
        <section className="px-6 py-6" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="flex justify-between items-center mb-4">
            <div className="font-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: '#3a3020' }}>◆ quests</div>
            <span className="font-mono text-[8px]" style={{ color: '#2a2418' }}>
              {completedQuestCount}/{QUESTS.length} complete
            </span>
          </div>
          <div className="flex flex-col gap-px" style={{ background: '#1a1510' }}>
            {QUESTS.map(quest => {
              const done = adventureState.completedQuests.includes(quest.id);
              return (
                <div key={quest.id}
                  className="flex items-start gap-3 px-4 py-3"
                  style={{ background: '#0d0907', opacity: done ? 1 : 0.45 }}>
                  <span className="font-mono text-xs flex-shrink-0 mt-0.5"
                    style={{ color: done ? '#C53A1E' : '#2a2418' }}>
                    {done ? '◆' : '◇'}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-widest"
                        style={{ color: done ? '#e8c89a' : '#3a3020' }}>
                        {quest.title}
                      </span>
                      <span className="font-mono text-[7px] uppercase flex-shrink-0" style={{ color: '#2a2418' }}>
                        ch.{quest.chapter}
                      </span>
                    </div>
                    <p className="font-serif italic text-xs" style={{ color: '#3a3020' }}>
                      {quest.objective}
                    </p>
                  </div>
                  {done && <span className="font-mono text-[9px] flex-shrink-0" style={{ color: '#C53A1E' }}>✓</span>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Achievements */}
        <section className="px-6 py-6 pb-12">
          <div className="flex justify-between items-center mb-4">
            <div className="font-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: '#3a3020' }}>◆ achievements</div>
            <span className="font-mono text-[8px]" style={{ color: '#2a2418' }}>
              {unlockedAchs}/{ALL_ACHIEVEMENTS.length}
            </span>
          </div>
          <div className="flex flex-col gap-px" style={{ background: '#1a1510' }}>
            {ALL_ACHIEVEMENTS.map(ach => {
              const unlocked = !!achievements[ach.id];
              return (
                <div key={ach.id}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ background: '#0d0907', opacity: unlocked ? 1 : 0.35 }}>
                  <span style={{ fontSize: 16, color: unlocked ? '#C53A1E' : '#2a2418', minWidth: 20 }}>
                    {ach.icon}
                  </span>
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="font-mono text-[9px] uppercase tracking-widest"
                      style={{ color: unlocked ? '#F2EFE9' : '#3a3020' }}>
                      {ach.title}
                    </span>
                    <span className="font-serif italic text-xs" style={{ color: '#2a2418' }}>
                      {ach.desc}
                    </span>
                  </div>
                  {unlocked && <span className="font-mono text-[9px]" style={{ color: '#C53A1E' }}>✓</span>}
                </div>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
