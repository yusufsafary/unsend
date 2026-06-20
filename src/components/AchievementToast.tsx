import { useEffect, useRef, useState } from 'react';
import { ALL_ACHIEVEMENTS } from '../lib/gameState';
import { playAchievement, playLevelUp, playQuestComplete, playXPGain } from '../lib/audio';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const showXP      = xpGained != null && xpGained > 0;
  const showLevelUp = !!levelUp;
  const showQuests  = questTitles.length > 0;
  const ach         = ALL_ACHIEVEMENTS.find(a => a.id === achievementIds[achIdx]);
  const questTitle  = questTitles[questIdx];

  // Sparkle animation for achievement
  useEffect(() => {
    if (phase !== 'achievement' || !ach) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = 320; canvas.height = 80;
    const particles: { x: number; y: number; vx: number; vy: number; life: number; size: number; color: string }[] = [];
    const colors = ['#C53A1E', '#ff6644', '#F2EFE9', '#e8c89a'];
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: Math.random() * 320, y: 40 + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 2.5 - 1,
        life: 1, size: 1.5 + Math.random() * 2.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    const tick = () => {
      ctx.clearRect(0, 0, 320, 80);
      let alive = false;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; p.life -= 0.022;
        if (p.life <= 0) continue;
        alive = true;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (alive) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, achIdx, ach]);

  const advance = (from: Phase) => {
    setVisible(false);
    setTimeout(() => {
      if (from === 'xp') {
        if (showLevelUp) setPhase('levelup');
        else if (showQuests) setPhase('quest');
        else setPhase('achievement');
      } else if (from === 'levelup') {
        if (showQuests) setPhase('quest');
        else setPhase('achievement');
      } else if (from === 'quest') {
        if (questIdx + 1 < questTitles.length) { setQuestIdx(i => i + 1); setPhase('quest'); }
        else setPhase('achievement');
      } else {
        if (achIdx + 1 < achievementIds.length) { setAchIdx(i => i + 1); setPhase('achievement'); }
        else { onDone(); return; }
      }
      setVisible(true);
    }, 320);
  };

  useEffect(() => {
    setVisible(true);
    let timeout: ReturnType<typeof setTimeout>;
    if (phase === 'xp') {
      if (!showXP) { advance('xp'); return; }
      playXPGain();
      timeout = setTimeout(() => advance('xp'), 1800);
    } else if (phase === 'levelup') {
      if (!showLevelUp) { advance('levelup'); return; }
      playLevelUp();
      timeout = setTimeout(() => advance('levelup'), 2600);
    } else if (phase === 'quest') {
      if (!questTitle) { advance('quest'); return; }
      playQuestComplete();
      timeout = setTimeout(() => advance('quest'), 2300);
    } else {
      if (!ach) { onDone(); return; }
      playAchievement();
      timeout = setTimeout(() => advance('achievement'), 2800);
    }
    return () => clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, achIdx, questIdx]);

  const pop: React.CSSProperties = {
    opacity: visible ? 1 : 0,
    transform: visible ? 'scale(1) translateY(0)' : 'scale(0.88) translateY(-8px)',
    transition: 'opacity 0.32s cubic-bezier(0.16,1,0.3,1), transform 0.32s cubic-bezier(0.16,1,0.3,1)',
  };

  const base: React.CSSProperties = {
    ...pop,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
    padding: '14px 24px', background: '#0a0806', position: 'relative', overflow: 'hidden',
    minWidth: 220,
  };

  return (
    <div className="absolute top-20 inset-x-0 z-50 flex justify-center pointer-events-none">

      {phase === 'xp' && showXP && (
        <div style={{ ...base, border: '1px solid #2a2010', boxShadow: '0 0 20px rgba(197,58,30,0.12)' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.4em]" style={{ color: '#4a3820' }}>xp earned</span>
          <span className="font-mono text-xl tabular-nums" style={{ color: '#C53A1E', letterSpacing: '0.05em' }}>
            +{xpGained} xp
          </span>
        </div>
      )}

      {phase === 'levelup' && showLevelUp && (
        <div style={{ ...base, border: '1px solid #C53A1E', boxShadow: '0 0 32px rgba(197,58,30,0.25), inset 0 0 20px rgba(197,58,30,0.04)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(197,58,30,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <span className="font-mono text-[9px] uppercase tracking-[0.4em]" style={{ color: '#5C5547' }}>◆ level up</span>
          <span className="font-mono tabular-nums" style={{ fontSize: '2rem', color: '#C53A1E', letterSpacing: '0.08em', lineHeight: 1.1 }}>
            LVL {levelUp}
          </span>
          <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2010' }}>new tier reached</span>
        </div>
      )}

      {phase === 'quest' && questTitle && (
        <div style={{ ...base, border: '1px solid #e8c89a44', boxShadow: '0 0 24px rgba(232,200,154,0.1)' }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.4em]" style={{ color: '#5C5547' }}>◆ quest complete</span>
          <span className="font-mono text-sm uppercase tracking-widest" style={{ color: '#e8c89a' }}>{questTitle}</span>
        </div>
      )}

      {phase === 'achievement' && ach && (
        <div style={{ ...base, border: '1px solid #C53A1E', boxShadow: '0 0 32px rgba(197,58,30,0.3), inset 0 0 24px rgba(197,58,30,0.05)' }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.6 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(197,58,30,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <span className="font-mono text-[9px] uppercase tracking-[0.4em] relative z-10" style={{ color: '#5C5547' }}>achievement unlocked</span>
          <span className="font-mono text-base uppercase tracking-widest relative z-10" style={{ color: '#C53A1E', textShadow: '0 0 12px rgba(197,58,30,0.5)' }}>
            {ach.icon} {ach.title}
          </span>
          <span className="font-mono text-[9px] relative z-10" style={{ color: '#4a3820', letterSpacing: 'normal', textTransform: 'none' }}>
            {ach.desc}
          </span>
        </div>
      )}
    </div>
  );
}
