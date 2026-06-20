import { useEffect, useState } from 'react';
import { ALL_ACHIEVEMENTS } from '../lib/gameState';

interface AchievementToastProps {
  achievementIds: string[];
  xpGained?: number;
  levelUp?: number | null;
  questTitles?: string[];
  onDone: () => void;
}

export function AchievementToast({ achievementIds, xpGained, levelUp, questTitles = [], onDone }: AchievementToastProps) {
  type Phase = 'xp' | 'levelup' | 'quest' | 'achievement';
  const [phase, setPhase] = useState<Phase>('xp');
  const [achIdx, setAchIdx] = useState(0);
  const [questIdx, setQuestIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const showXP        = xpGained != null && xpGained > 0;
  const showLevelUp   = !!levelUp;
  const showQuests    = questTitles.length > 0;
  const ach           = ALL_ACHIEVEMENTS.find(a => a.id === achievementIds[achIdx]);
  const questTitle    = questTitles[questIdx];

  const advance = (from: Phase) => {
    setVisible(false);
    setTimeout(() => {
      if (from === 'xp') {
        if (showLevelUp) { setPhase('levelup'); }
        else if (showQuests) { setPhase('quest'); }
        else { setPhase('achievement'); }
      } else if (from === 'levelup') {
        if (showQuests) { setPhase('quest'); }
        else { setPhase('achievement'); }
      } else if (from === 'quest') {
        if (questIdx + 1 < questTitles.length) {
          setQuestIdx(i => i + 1);
          setPhase('quest');
        } else {
          setPhase('achievement');
        }
      } else {
        if (achIdx + 1 < achievementIds.length) {
          setAchIdx(i => i + 1);
          setPhase('achievement');
        } else {
          onDone();
          return;
        }
      }
      setVisible(true);
    }, 350);
  };

  useEffect(() => {
    setVisible(true);
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === 'xp') {
      if (!showXP) { advance('xp'); return; }
      timeout = setTimeout(() => advance('xp'), 1800);
    } else if (phase === 'levelup') {
      if (!showLevelUp) { advance('levelup'); return; }
      timeout = setTimeout(() => advance('levelup'), 2400);
    } else if (phase === 'quest') {
      if (!questTitle) { advance('quest'); return; }
      timeout = setTimeout(() => advance('quest'), 2200);
    } else {
      if (!ach) { onDone(); return; }
      timeout = setTimeout(() => advance('achievement'), 2600);
    }
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, achIdx, questIdx]);

  const base: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(-10px)',
    transition: 'opacity 0.35s ease, transform 0.35s ease',
    border: '1px solid',
    background: '#0d0907',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 20px',
  };

  return (
    <div className="absolute top-20 inset-x-0 z-50 flex justify-center pointer-events-none">
      {phase === 'xp' && showXP && (
        <div style={{ ...base, borderColor: '#3a3020', color: '#8a7255' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em]">xp earned</span>
          <span className="font-mono text-base" style={{ color: '#C53A1E' }}>+{xpGained} xp</span>
        </div>
      )}
      {phase === 'levelup' && showLevelUp && (
        <div style={{ ...base, borderColor: '#C53A1E', color: '#F2EFE9' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em]" style={{ color: '#5C5547' }}>
            ◆ level up
          </span>
          <span className="font-mono text-xl" style={{ color: '#C53A1E', letterSpacing: '0.1em' }}>
            LVL {levelUp}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#3a3020' }}>
            new tier reached
          </span>
        </div>
      )}
      {phase === 'quest' && questTitle && (
        <div style={{ ...base, borderColor: '#e8c89a', color: '#e8c89a' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em]" style={{ color: '#5C5547' }}>
            ◆ quest complete
          </span>
          <span className="font-mono text-xs uppercase tracking-widest">{questTitle}</span>
        </div>
      )}
      {phase === 'achievement' && ach && (
        <div style={{ ...base, borderColor: '#C53A1E', color: '#C53A1E' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.35em]" style={{ color: '#5C5547' }}>
            achievement unlocked
          </span>
          <span className="font-mono text-xs uppercase tracking-widest">{ach.icon} {ach.title}</span>
          <span className="font-mono text-[9px]" style={{ color: '#5C5547', letterSpacing: 'normal', textTransform: 'none' }}>
            {ach.desc}
          </span>
        </div>
      )}
    </div>
  );
}
