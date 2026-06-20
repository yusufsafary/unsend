import { useEffect, useState } from 'react';
import { ALL_ACHIEVEMENTS } from '../lib/gameState';

interface AchievementToastProps {
  achievementIds: string[];
  xpGained?: number;
  levelUp?: number | null;
  onDone: () => void;
}

export function AchievementToast({ achievementIds, xpGained, levelUp, onDone }: AchievementToastProps) {
  const [phase, setPhase] = useState<'xp' | 'levelup' | 'achievement'>('xp');
  const [achIdx, setAchIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const showXP = xpGained != null && xpGained > 0;
  const showLevelUp = !!levelUp;
  const ach = ALL_ACHIEVEMENTS.find(a => a.id === achievementIds[achIdx]);

  useEffect(() => {
    setVisible(true);
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'xp') {
      if (!showXP) { setPhase(showLevelUp ? 'levelup' : 'achievement'); return; }
      timeout = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          setPhase(showLevelUp ? 'levelup' : 'achievement');
          setVisible(true);
        }, 350);
      }, 1800);
    } else if (phase === 'levelup') {
      if (!showLevelUp) { setPhase('achievement'); return; }
      timeout = setTimeout(() => {
        setVisible(false);
        setTimeout(() => { setPhase('achievement'); setVisible(true); }, 350);
      }, 2400);
    } else {
      if (!ach) { onDone(); return; }
      timeout = setTimeout(() => {
        setVisible(false);
        setTimeout(() => {
          if (achIdx + 1 < achievementIds.length) {
            setAchIdx(i => i + 1);
            setVisible(true);
          } else {
            onDone();
          }
        }, 350);
      }, 2600);
    }
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, achIdx]);

  const style: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(-10px)',
    transition: 'opacity 0.35s ease, transform 0.35s ease',
    border: '1px solid',
    background: '#16140F',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 20px',
  };

  return (
    <div className="absolute top-20 inset-x-0 z-50 flex justify-center pointer-events-none">
      {phase === 'xp' && showXP && (
        <div style={{ ...style, borderColor: '#3a3530', color: '#8C8473' }}>
          <span className="font-mono text-[10px] uppercase tracking-widest">xp earned</span>
          <span className="font-mono text-base" style={{ color: '#C53A1E' }}>+{xpGained} xp</span>
        </div>
      )}
      {phase === 'levelup' && showLevelUp && (
        <div style={{ ...style, borderColor: '#C53A1E', color: '#F2EFE9' }}>
          <span className="font-mono text-[10px] uppercase tracking-widest" style={{ color: '#8C8473' }}>level up</span>
          <span className="font-mono text-xl" style={{ color: '#C53A1E', letterSpacing: '0.1em' }}>LVL {levelUp}</span>
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3530' }}>new tier reached</span>
        </div>
      )}
      {phase === 'achievement' && ach && (
        <div style={{ ...style, borderColor: '#C53A1E', color: '#C53A1E' }}>
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#5C5547' }}>achievement unlocked</span>
          <span className="font-mono text-xs uppercase tracking-widest">{ach.icon} {ach.title}</span>
          <span className="font-mono text-[9px]" style={{ color: '#5C5547', textTransform: 'none', letterSpacing: 'normal' }}>
            {ach.desc}
          </span>
        </div>
      )}
    </div>
  );
}
