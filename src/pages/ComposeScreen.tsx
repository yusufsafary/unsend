import { useState, useRef, useCallback, useEffect } from 'react';
import { Wordmark } from '../components/Wordmark';
import type { ShatterMode } from '../App';
import { getXPProgress, getDailyPrompt, isDailyCompleted, type GameState } from '../lib/gameState';

interface ComposeScreenProps {
  username: string;
  count: number;
  streak: number;
  selectedMode: ShatterMode;
  gameState: GameState;
  onModeChange: (mode: ShatterMode) => void;
  onLogout: () => void;
  onRelease: (message: string, chargeLevel: number, isRage: boolean, messageLength: number) => void;
  onOpenStats: () => void;
  onDailyUsed: () => void;
}

function playTypeClick() {
  try {
    const ctx = new AudioContext();
    const len = Math.floor(ctx.sampleRate * 0.007);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4) * 0.06;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 1;
    src.connect(g); g.connect(ctx.destination); src.start();
    setTimeout(() => ctx.close(), 200);
  } catch { /* silence */ }
}

function haptic(pattern: number | number[]) {
  try { navigator.vibrate(pattern); } catch { /* no vibrate api */ }
}

function analyzeIntensity(text: string): number {
  if (!text) return 0;
  let score = 0;
  const upper = (text.match(/[A-Z]/g) || []).length;
  const lower = (text.match(/[a-z]/g) || []).length;
  if (lower > 0) score += Math.min((upper / lower) * 60, 30);
  score += Math.min((text.match(/[!?]/g) || []).length * 8, 25);
  score += Math.min(text.split(/\s+/).length * 0.8, 20);
  score += Math.min(text.length * 0.05, 15);
  return Math.min(Math.round(score), 60);
}

const CHARGE_LABELS = [
  { min: 0,  label: 'press + hold',      color: '#8C8473' },
  { min: 20, label: 'warming up',        color: '#a04a2a' },
  { min: 50, label: 'pressure building', color: '#C53A1E' },
  { min: 80, label: '— release —',       color: '#ff3300' },
];

const MODES: { id: ShatterMode; label: string; icon: string; unlockAt: number; desc: string; color: string }[] = [
  { id: 'default', label: 'Classic',  icon: '◈', unlockAt: 0,  desc: 'Standard shatter',          color: '#8C8473' },
  { id: 'fire',    label: 'Fire',     icon: '◉', unlockAt: 3,  desc: 'Ember explosion',           color: '#ff5a1a' },
  { id: 'mirror',  label: 'Mirror',   icon: '◎', unlockAt: 6,  desc: 'Symmetrical burst',         color: '#7ab8d4' },
  { id: 'slowmo',  label: 'Slow-Mo',  icon: '◷', unlockAt: 10, desc: 'Cinematic 0.3× time',       color: '#b4a0d4' },
  { id: 'vortex',  label: 'Vortex',   icon: '◌', unlockAt: 15, desc: 'Spiral tornado burst',      color: '#8855ff' },
  { id: 'glitch',  label: 'Glitch',   icon: '▣', unlockAt: 20, desc: 'Digital signal collapse',   color: '#00cc66' },
];

export function ComposeScreen({ username, count, streak, selectedMode, gameState, onModeChange, onLogout, onRelease, onOpenStats, onDailyUsed }: ComposeScreenProps) {
  const [who, setWho] = useState('');
  const [message, setMessage] = useState('');
  const [charge, setCharge] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [released, setReleased] = useState(false);
  const [unlockToast, setUnlockToast] = useState<string | null>(null);
  const [dailyExpanded, setDailyExpanded] = useState(false);
  const chargeRef   = useRef(0);
  const chargeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargeStart = useRef(0);
  const isEnabled = message.trim().length > 0;
  const textIntensity = analyzeIntensity(message);
  const chargeLabel = CHARGE_LABELS.slice().reverse().find(l => charge >= l.min) ?? CHARGE_LABELS[0];

  const alphaChars = message.replace(/[^a-zA-Z]/g, '');
  const isRageMode = alphaChars.length > 8 && (message.match(/[A-Z]/g) || []).length / alphaChars.length > 0.6;

  const { xp, level } = gameState;
  const progress = getXPProgress(xp, level);
  const dailyPrompt = getDailyPrompt();
  const isDailyDone = isDailyCompleted(gameState);

  // Show unlock toast when count hits thresholds
  useEffect(() => {
    const found = MODES.find(m => m.unlockAt === count);
    if (found && found.unlockAt > 0) {
      setUnlockToast(`${found.icon} ${found.label} mode unlocked`);
      const t = setTimeout(() => setUnlockToast(null), 3200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [count]);

  const stopCharging = useCallback(() => {
    if (chargeTimer.current) { clearInterval(chargeTimer.current); chargeTimer.current = null; }
    setIsCharging(false);
  }, []);

  const fireRelease = useCallback(() => {
    if (!isEnabled || released) return;
    stopCharging();
    const base  = chargeRef.current;
    const final = Math.min(base + textIntensity, 100);
    setReleased(true);
    haptic(final > 80 ? [80, 30, 80, 30, 120] : final > 50 ? [60, 20, 80] : [40, 20, 60]);
    setTimeout(() => onRelease(message.trim(), Math.round(final), isRageMode, message.trim().length), 80);
  }, [isEnabled, released, stopCharging, textIntensity, message, isRageMode, onRelease]);

  const startCharging = useCallback(() => {
    if (!isEnabled || released) return;
    setIsCharging(true);
    chargeStart.current = Date.now();
    haptic([20]);
    chargeTimer.current = setInterval(() => {
      const raw = Math.min(((Date.now() - chargeStart.current) / 1000 / 2.2) * 100, 100);
      chargeRef.current = raw;
      setCharge(raw);
      if (raw >= 50 && raw < 51) haptic([30]);
      if (raw >= 80 && raw < 81) haptic([50, 20, 30]);
      if (raw >= 100) stopCharging();
    }, 16);
  }, [isEnabled, released, stopCharging]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    if (!isEnabled || released) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    chargeRef.current = 0;
    setCharge(0);
    startCharging();
  }, [isEnabled, released, startCharging]);

  const handlePointerUp = useCallback(() => {
    if (!isCharging && chargeRef.current < 2) return;
    fireRelease();
  }, [isCharging, fireRelease]);

  useEffect(() => () => { if (chargeTimer.current) clearInterval(chargeTimer.current); }, []);

  const highCharge  = charge >= 85;
  const screenGlow  = isCharging ? Math.min(charge / 100, 1) : 0;
  const modeColor   = MODES.find(m => m.id === selectedMode)?.color ?? '#8C8473';

  const glowColor = selectedMode === 'fire'   ? `rgba(255,90,26,${screenGlow * 0.35})`
                  : selectedMode === 'mirror'  ? `rgba(122,184,212,${screenGlow * 0.25})`
                  : selectedMode === 'slowmo'  ? `rgba(180,160,212,${screenGlow * 0.25})`
                  : selectedMode === 'vortex'  ? `rgba(136,85,255,${screenGlow * 0.3})`
                  : selectedMode === 'glitch'  ? `rgba(0,204,102,${screenGlow * 0.25})`
                  : `rgba(197,58,30,${screenGlow * 0.35})`;

  // Combo indicator
  const withinCombo = (Date.now() - gameState.lastReleaseTime) < 60000;
  const combo = withinCombo ? gameState.comboCount : 0;

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto relative overflow-hidden"
      style={{ boxShadow: screenGlow > 0.1 ? `inset 0 0 ${60 * screenGlow}px ${glowColor}` : 'none' }}
    >
      <style>{`
        @keyframes ragePulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        @keyframes fadeInUp { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes xpPulse { 0%,100%{opacity:1;transform:scaleX(1)} 50%{opacity:0.8;transform:scaleX(0.998)} }
        @keyframes glitchFlicker { 0%,100%{opacity:1} 50%{opacity:0.85} 75%{opacity:0.95} }
      `}</style>

      {/* Rage mode overlay pulse */}
      {isRageMode && !isCharging && (
        <div className="absolute inset-0 pointer-events-none z-5"
          style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(197,58,30,0.08) 100%)',
            animation: 'ragePulse 1s ease-in-out infinite' }} />
      )}

      {/* Glitch mode: scanline flicker */}
      {selectedMode === 'glitch' && (
        <div className="absolute inset-0 pointer-events-none z-5"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,204,102,0.02) 3px, rgba(0,204,102,0.02) 4px)',
            animation: 'glitchFlicker 0.8s linear infinite' }} />
      )}

      {/* Vortex mode: subtle radial */}
      {selectedMode === 'vortex' && (
        <div className="absolute inset-0 pointer-events-none z-5"
          style={{ background: 'radial-gradient(ellipse at center, rgba(136,85,255,0.04) 0%, transparent 70%)',
            animation: 'ragePulse 2s ease-in-out infinite' }} />
      )}

      {/* Vignette on charging */}
      {isCharging && (
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background: `radial-gradient(ellipse at center, transparent 50%, ${glowColor} 100%)` }} />
      )}

      {/* Unlock toast */}
      {unlockToast && (
        <div className="absolute top-20 inset-x-0 z-50 flex justify-center pointer-events-none">
          <div className="font-mono text-xs uppercase tracking-widest px-5 py-3"
            style={{ border: `1px solid ${modeColor}`, color: modeColor, background: '#16140F', animation: 'fadeInUp 0.4s ease forwards' }}>
            {unlockToast}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-border relative z-20">
        <Wordmark />
        <div className="flex items-center gap-4">
          {combo >= 2 && (
            <span className="text-xs font-mono tracking-widest" style={{ color: modeColor }} title={`${combo}× combo!`}>
              ×{combo} combo
            </span>
          )}
          {streak >= 2 && (
            <span className="text-xs font-mono tracking-widest" style={{ color: streak >= 7 ? '#C53A1E' : '#a04a2a' }}
              title={`${streak} day streak`}>
              {streak >= 7 ? '🔥' : '◈'} {streak}d
            </span>
          )}
          <span className="text-xs font-mono text-muted-foreground" data-testid="text-count">
            <span style={{ color: count >= 10 ? '#C53A1E' : undefined }}>× {count}</span>
          </span>
          <button onClick={onOpenStats}
            className="text-xs font-mono uppercase tracking-widest transition-colors"
            style={{ color: '#5C5547' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#F2EFE9'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#5C5547'; }}
            title="Stats & Achievements">
            lvl {gameState.level}
          </button>
          <button onClick={onLogout} className="text-xs font-mono uppercase tracking-widest hover:text-accent transition-colors" data-testid="button-logout">
            Log out
          </button>
        </div>
      </header>

      {/* XP Progress bar */}
      <div className="relative z-20 px-6 py-2 border-b" style={{ borderColor: '#1a1815' }}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3530' }}>
            xp · level {gameState.level}
          </span>
          <span className="font-mono text-[9px]" style={{ color: '#3a3530' }}>
            {gameState.xp} / {progress.needed + (gameState.xp - progress.current)} xp
          </span>
        </div>
        <div className="w-full h-[1px] relative" style={{ background: '#1a1815' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: `${progress.pct}%`,
            background: modeColor,
            boxShadow: progress.pct > 80 ? `0 0 4px ${modeColor}88` : 'none',
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      <main className="flex-1 flex flex-col p-6 gap-8 relative z-20">

        {/* Daily Challenge */}
        <section className="flex flex-col gap-2">
          <button
            onClick={() => setDailyExpanded(d => !d)}
            className="flex justify-between items-center w-full text-left"
          >
            <label className="text-xs font-mono tracking-widest uppercase pointer-events-none"
              style={{ color: isDailyDone ? '#3a3530' : '#C53A1E' }}>
              — daily challenge {isDailyDone ? '✓' : '+50xp'}
            </label>
            <span className="font-mono text-[10px]" style={{ color: '#3a3530' }}>
              {dailyExpanded ? '▲' : '▼'}
            </span>
          </button>
          {dailyExpanded && (
            <div className="py-3 px-4 border-l-2 transition-all"
              style={{ borderColor: isDailyDone ? '#2a2820' : '#C53A1E', background: '#1a1815' }}>
              <p className="font-serif italic text-sm leading-relaxed"
                style={{ color: isDailyDone ? '#5C5547' : '#8C8473' }}>
                "{dailyPrompt}"
              </p>
              {!isDailyDone && (
                <button
                  className="mt-3 text-[10px] font-mono uppercase tracking-widest"
                  style={{ color: '#C53A1E' }}
                  onClick={() => {
                    setMessage(prev => prev ? prev : '');
                    onDailyUsed();
                  }}
                >
                  use as prompt →
                </button>
              )}
              {isDailyDone && (
                <p className="mt-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3530' }}>
                  completed today
                </p>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">— to</label>
          <input type="text" value={who} onChange={e => setWho(e.target.value)}
            placeholder="leave blank for the universe"
            className="w-full bg-transparent border-b border-border focus:border-foreground pb-2 text-base font-mono outline-none transition-colors rounded-none placeholder:text-muted-foreground placeholder:italic"
            data-testid="input-who" />
        </section>

        <section className="flex flex-col gap-4 flex-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">— the unsaid</label>
            {message.trim().length > 0 && (
              <span className="text-xs font-mono tracking-widest uppercase transition-all"
                style={{ color: textIntensity > 40 ? '#C53A1E' : '#8C8473' }}>
                {isRageMode ? '⚡ rage' : textIntensity > 50 ? '— charged' : textIntensity > 25 ? '— loaded' : '— calm'}
              </span>
            )}
          </div>
          <textarea value={message} onChange={e => { setMessage(e.target.value); playTypeClick(); }}
            placeholder="say what you never could."
            className="w-full flex-1 min-h-[140px] bg-transparent border-b pb-2 text-lg md:text-xl font-serif leading-relaxed outline-none transition-colors rounded-none resize-none placeholder:text-muted-foreground placeholder:italic"
            style={{
              borderColor: isRageMode ? '#C53A1E' : undefined,
              color: isRageMode ? '#ff4422' : undefined,
              textShadow: isRageMode ? '0 0 12px rgba(197,58,30,0.4)' : undefined,
              animation: isRageMode ? 'ragePulse 1.2s ease-in-out infinite' : undefined,
            }}
            data-testid="input-message" />
        </section>

        {/* Mode selector — 2 rows for 6 modes */}
        <section className="flex flex-col gap-3">
          <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">— destroy it</label>
          <div className="grid grid-cols-3 gap-2">
            {MODES.map(m => {
              const unlocked = count >= m.unlockAt;
              const active   = selectedMode === m.id;
              return (
                <button key={m.id}
                  onClick={() => unlocked && onModeChange(m.id)}
                  title={unlocked ? m.desc : `Unlocks at ${m.unlockAt} releases`}
                  disabled={!unlocked}
                  className="flex flex-col items-center gap-1 py-3 transition-all"
                  style={{
                    border: active ? `1px solid ${m.color}` : '1px solid #2a2820',
                    color: active ? m.color : unlocked ? '#5C5547' : '#2a2820',
                    cursor: unlocked ? 'pointer' : 'not-allowed',
                    background: active ? `${m.color}12` : 'transparent',
                  }}
                  data-testid={`mode-${m.id}`}
                >
                  <span className="text-base leading-none" style={{ filter: unlocked ? 'none' : 'grayscale(1)', opacity: unlocked ? 1 : 0.3 }}>
                    {m.icon}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest leading-none">{m.label}</span>
                  {!unlocked && (
                    <span className="text-[8px] font-mono italic" style={{ color: '#2a2820' }}>at {m.unlockAt}</span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedMode !== 'default' && (
            <p className="text-xs font-mono" style={{ color: modeColor, opacity: 0.7 }}>
              {MODES.find(m => m.id === selectedMode)?.desc}
            </p>
          )}
        </section>

        {/* Hold-to-charge button */}
        <div className="pb-6 select-none">
          {isEnabled ? (
            <div className="flex flex-col gap-3">
              <div className="w-full h-[1px] bg-border relative overflow-hidden">
                <div className="absolute inset-y-0 left-0"
                  style={{
                    width: `${charge}%`,
                    background: charge > 80 ? '#ff3300' : modeColor,
                    transition: isCharging ? 'none' : 'width 0.3s ease-out',
                    boxShadow: charge > 50 ? `0 0 ${charge / 10}px ${modeColor}cc` : 'none',
                  }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono tracking-widest uppercase transition-colors"
                  style={{ color: charge > 5 ? (charge > 80 ? '#ff3300' : modeColor) : chargeLabel.color }}>
                  {chargeLabel.label}
                </span>
                {charge > 5 && (
                  <span className="text-xs font-mono" style={{ color: modeColor }}>{Math.round(charge)}%</span>
                )}
              </div>
              <button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                disabled={released}
                className="text-left font-serif italic transition-all touch-none"
                style={{
                  fontSize: 'clamp(2.2rem, 10vw, 3rem)',
                  color: charge > 5 ? (charge > 80 ? '#ff3300' : modeColor) : '#C53A1E',
                  textShadow: charge > 50 ? `0 0 ${charge / 8}px ${modeColor}99` : 'none',
                  opacity: released ? 0.4 : 1,
                  cursor: released ? 'default' : 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  transform: highCharge ? `translateX(${(Math.random()-0.5)*3}px)` : 'none',
                }}
                data-testid="button-release"
              >
                {released ? 'releasing...' : charge > 80 ? 'RELEASE NOW →' : 'Let it go →'}
              </button>
              {charge < 5 && !isCharging && (
                <p className="text-xs font-mono tracking-widest" style={{ color: '#2d2b26' }}>— hold —</p>
              )}
            </div>
          ) : (
            <span className="font-serif italic text-border" style={{ fontSize: 'clamp(2.2rem, 10vw, 3rem)' }}>
              Let it go →
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
