import { useState, useRef, useCallback, useEffect } from 'react';
import { Wordmark } from '../components/Wordmark';
import { BossAlert } from '../components/BossAlert';
import { ItemBar } from '../components/ItemBar';
import { NavMenu } from '../components/NavMenu';
import type { ShatterMode } from '../App';
import { getXPProgress, getDailyPrompt, isDailyCompleted, type GameState } from '../lib/gameState';
import { type AdventureState, type Zone, type Quest } from '../lib/adventure';
import {
  playTypeClick, playModeSelect, playModeUnlock,
  startCharge, updateCharge, stopCharge,
  startAmbient, stopAmbient,
} from '../lib/audio';

interface ComposeScreenProps {
  username: string;
  count: number;
  streak: number;
  selectedMode: ShatterMode;
  gameState: GameState;
  adventureState: AdventureState;
  currentZone: Zone;
  isBossNext: boolean;
  nextBossZone: Zone | null;
  activeQuests: Quest[];
  onModeChange: (mode: ShatterMode) => void;
  onLogout: () => void;
  onRelease: (message: string, chargeLevel: number, isRage: boolean, messageLength: number) => void;
  onOpenStats: () => void;
  onOpenMap: () => void;
  onOpenAbout: () => void;
  onOpenHowToPlay: () => void;
  onDailyUsed: () => void;
  onUseItem: (itemId: string) => void;
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
  { min: 0,  label: 'press + hold',      color: '#8a7255' },
  { min: 20, label: 'warming up',        color: '#a04a2a' },
  { min: 50, label: 'pressure building', color: '#C53A1E' },
  { min: 80, label: '— release —',       color: '#ff3300' },
];

const MODES: { id: ShatterMode; label: string; icon: string; unlockAt: number; desc: string; color: string; zoneName: string }[] = [
  { id: 'default', label: 'Classic',  icon: '◈', unlockAt: 0,  desc: 'Standard shatter',        color: '#8C8473', zoneName: 'Wasteland' },
  { id: 'fire',    label: 'Fire',     icon: '◉', unlockAt: 3,  desc: 'Ember explosion',         color: '#ff5a1a', zoneName: 'Inferno' },
  { id: 'mirror',  label: 'Mirror',   icon: '◎', unlockAt: 6,  desc: 'Symmetrical burst',       color: '#7ab8d4', zoneName: 'Mirror Realm' },
  { id: 'slowmo',  label: 'Slow-Mo',  icon: '◷', unlockAt: 10, desc: 'Cinematic 0.3× time',     color: '#b4a0d4', zoneName: 'Cathedral of Time' },
  { id: 'vortex',  label: 'Vortex',   icon: '◌', unlockAt: 15, desc: 'Spiral tornado burst',    color: '#8855ff', zoneName: 'Vortex Nexus' },
  { id: 'glitch',  label: 'Glitch',   icon: '▣', unlockAt: 20, desc: 'Digital signal collapse', color: '#00cc66', zoneName: 'Glitch Matrix' },
];

export function ComposeScreen({
  username, count, streak, selectedMode, gameState, adventureState,
  currentZone, isBossNext, nextBossZone, activeQuests,
  onModeChange, onLogout, onRelease, onOpenStats, onOpenMap, onOpenAbout, onOpenHowToPlay, onDailyUsed, onUseItem,
}: ComposeScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const hasChargeSpeed = adventureState.activeItemEffects.includes('charge_speed');
  const hasRageCrystal = adventureState.activeItemEffects.includes('rage');

  const isEnabled = message.trim().length > 0;
  const textIntensity = analyzeIntensity(message);
  const chargeLabel = CHARGE_LABELS.slice().reverse().find(l => charge >= l.min) ?? CHARGE_LABELS[0];

  const alphaChars = message.replace(/[^a-zA-Z]/g, '');
  const naturalRage = alphaChars.length > 8 && (message.match(/[A-Z]/g) || []).length / alphaChars.length > 0.6;
  const isRageMode = naturalRage || hasRageCrystal;

  const { xp, level } = gameState;
  const progress = getXPProgress(xp, level);
  const dailyPrompt = getDailyPrompt();
  const isDailyDone = isDailyCompleted(gameState);

  // Zone ambient — start on mount and when mode changes
  useEffect(() => {
    startAmbient(selectedMode);
    return () => stopAmbient();
  }, [selectedMode]);

  // Mode unlock toast
  useEffect(() => {
    const found = MODES.find(m => m.unlockAt === count);
    if (found && found.unlockAt > 0) {
      setUnlockToast(`${found.icon} ${found.label} unlocked — ${found.zoneName}`);
      playModeUnlock(found.id as import('../App').ShatterMode);
      const t = setTimeout(() => setUnlockToast(null), 3500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [count]);

  const stopCharging = useCallback(() => {
    if (chargeTimer.current) { clearInterval(chargeTimer.current); chargeTimer.current = null; }
    stopCharge();
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
    startCharge(selectedMode);
    const speedDivisor = hasChargeSpeed ? 1.1 : 2.2;
    chargeTimer.current = setInterval(() => {
      const raw = Math.min(((Date.now() - chargeStart.current) / 1000 / speedDivisor) * 100, 100);
      chargeRef.current = raw;
      setCharge(raw);
      updateCharge(raw, selectedMode);
      if (raw >= 50 && raw < 51) haptic([30]);
      if (raw >= 80 && raw < 81) haptic([50, 20, 30]);
      if (raw >= 100) stopCharging();
    }, 16);
  }, [isEnabled, released, stopCharging, hasChargeSpeed, selectedMode]);

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

  const withinCombo = (Date.now() - gameState.lastReleaseTime) < 60000;
  const combo = withinCombo ? gameState.comboCount : 0;

  // First active quest for display
  const featuredQuest = activeQuests[0] ?? null;

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
        @keyframes zonePulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
        @keyframes bossWarn { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>

      {/* Rage mode overlay */}
      {isRageMode && !isCharging && (
        <div className="absolute inset-0 pointer-events-none z-5"
          style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(197,58,30,0.08) 100%)',
            animation: 'ragePulse 1s ease-in-out infinite' }} />
      )}

      {/* Glitch scanlines */}
      {selectedMode === 'glitch' && (
        <div className="absolute inset-0 pointer-events-none z-5"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,204,102,0.02) 3px, rgba(0,204,102,0.02) 4px)',
            animation: 'glitchFlicker 0.8s linear infinite' }} />
      )}

      {/* Vortex ambient */}
      {selectedMode === 'vortex' && (
        <div className="absolute inset-0 pointer-events-none z-5"
          style={{ background: 'radial-gradient(ellipse at center, rgba(136,85,255,0.04) 0%, transparent 70%)',
            animation: 'ragePulse 2s ease-in-out infinite' }} />
      )}

      {/* Charge vignette */}
      {isCharging && (
        <div className="absolute inset-0 pointer-events-none z-10"
          style={{ background: `radial-gradient(ellipse at center, transparent 50%, ${glowColor} 100%)` }} />
      )}

      {/* Unlock toast */}
      {unlockToast && (
        <div className="absolute top-20 inset-x-0 z-50 flex justify-center pointer-events-none">
          <div className="font-mono text-xs uppercase tracking-widest px-5 py-3"
            style={{ border: `1px solid ${modeColor}`, color: modeColor, background: '#0d0907',
              animation: 'fadeInUp 0.4s ease forwards' }}>
            {unlockToast}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex justify-between items-center px-5 py-4 relative z-20"
        style={{ borderBottom: '1px solid #1a1510' }}>
        <Wordmark />
        <div className="flex items-center gap-3">
          {combo >= 2 && (
            <span className="text-xs font-mono tracking-widest" style={{ color: modeColor }}>
              ×{combo}
            </span>
          )}
          {streak >= 2 && (
            <span className="text-xs font-mono" style={{ color: streak >= 7 ? '#C53A1E' : '#8a7255' }}>
              {streak >= 7 ? '🔥' : '◈'}{streak}d
            </span>
          )}
          <span className="text-xs font-mono" style={{ color: count >= 10 ? '#C53A1E' : '#3a3020' }}>
            ×{count}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3020' }}>
            lv{gameState.level}
          </span>
          <button
            onClick={() => setMenuOpen(true)}
            className="font-mono text-lg leading-none transition-all"
            style={{ color: '#5C5547', padding: '2px 4px' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F2EFE9'}
            onMouseLeave={e => e.currentTarget.style.color = '#5C5547'}
            title="Menu"
          >
            ≡
          </button>
        </div>
      </header>

      {/* Zone banner */}
      <div className="relative z-20 px-5 py-2 flex items-center gap-3"
        style={{ background: `${currentZone.color}08`, borderBottom: `1px solid ${currentZone.color}22` }}>
        <span style={{ color: currentZone.color, fontSize: 14, animation: 'zonePulse 3s ease-in-out infinite' }}>
          {currentZone.symbol}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-[8px] uppercase tracking-[0.35em]"
              style={{ color: currentZone.color }}>
              {currentZone.name}
            </span>
            <span className="font-mono text-[7px]" style={{ color: '#2a2418' }}>
              · {currentZone.subtitle}
            </span>
          </div>
        </div>
        <span className="font-mono text-[7px] uppercase tracking-widest flex-shrink-0"
          style={{ color: '#2a2418' }}>
          realm {String(MODES.findIndex(m => m.id === selectedMode) + 1).padStart(2, '0')}/06
        </span>
      </div>

      {/* XP Progress bar */}
      <div className="relative z-20 px-5 py-2" style={{ borderBottom: '1px solid #120e0a' }}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-mono text-[8px] uppercase tracking-[0.3em]" style={{ color: '#2a2418' }}>
            xp · lv{gameState.level}
          </span>
          <span className="font-mono text-[8px]" style={{ color: '#2a2418' }}>
            {gameState.xp} xp
          </span>
        </div>
        <div className="w-full h-[1px] relative" style={{ background: '#1a1510' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, height: '100%',
            width: `${progress.pct}%`,
            background: modeColor,
            boxShadow: progress.pct > 80 ? `0 0 4px ${modeColor}88` : 'none',
            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      <main className="flex-1 flex flex-col px-5 py-4 gap-6 relative z-20 overflow-y-auto">

        {/* Boss Alert */}
        {isBossNext && nextBossZone && (
          <BossAlert zone={nextBossZone} />
        )}

        {/* Daily Challenge */}
        <section className="flex flex-col gap-2">
          <button
            onClick={() => setDailyExpanded(d => !d)}
            className="flex justify-between items-center w-full text-left"
          >
            <label className="text-[9px] font-mono tracking-[0.35em] uppercase pointer-events-none"
              style={{ color: isDailyDone ? '#2a2418' : '#C53A1E' }}>
              ◆ daily challenge {isDailyDone ? '✓' : '+50xp'}
            </label>
            <span className="font-mono text-[9px]" style={{ color: '#2a2418' }}>
              {dailyExpanded ? '▲' : '▼'}
            </span>
          </button>
          {dailyExpanded && (
            <div className="py-2 px-3 border-l-2 transition-all"
              style={{ borderColor: isDailyDone ? '#1e1a15' : '#C53A1E', background: '#110d09' }}>
              <p className="font-serif italic text-sm leading-relaxed"
                style={{ color: isDailyDone ? '#3a3020' : '#6a5a40' }}>
                "{dailyPrompt}"
              </p>
              {!isDailyDone && (
                <button className="mt-2 text-[9px] font-mono uppercase tracking-widest"
                  style={{ color: '#C53A1E' }}
                  onClick={() => { onDailyUsed(); setDailyExpanded(false); }}>
                  use as prompt →
                </button>
              )}
              {isDailyDone && (
                <p className="mt-1 font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2418' }}>
                  completed today
                </p>
              )}
            </div>
          )}
        </section>

        {/* To field */}
        <section className="flex flex-col gap-2">
          <label className="text-[9px] font-mono tracking-[0.35em] uppercase" style={{ color: '#3a3020' }}>
            — to
          </label>
          <input type="text" value={who} onChange={e => setWho(e.target.value)}
            placeholder="leave blank for the universe"
            className="w-full bg-transparent border-b pb-2 text-sm font-mono outline-none transition-colors rounded-none"
            style={{ borderColor: '#1e1a15', color: '#F2EFE9', caretColor: '#C53A1E' }}
            data-testid="input-who" />
        </section>

        {/* Message field */}
        <section className="flex flex-col gap-2 flex-1">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-mono tracking-[0.35em] uppercase" style={{ color: '#3a3020' }}>
              — the unsaid
            </label>
            {message.trim().length > 0 && (
              <span className="text-[9px] font-mono tracking-widest uppercase"
                style={{ color: textIntensity > 40 ? '#C53A1E' : '#5C5547' }}>
                {isRageMode
                  ? (hasRageCrystal ? '◉ rage crystal' : '⚡ rage')
                  : textIntensity > 50 ? '— charged'
                  : textIntensity > 25 ? '— loaded'
                  : '— calm'}
              </span>
            )}
          </div>
          <textarea value={message}
            onChange={e => { setMessage(e.target.value); playTypeClick(selectedMode); }}
            placeholder="say what you never could."
            className="w-full flex-1 min-h-[130px] bg-transparent border-b pb-2 text-lg font-serif leading-relaxed outline-none transition-colors rounded-none resize-none"
            style={{
              borderColor: isRageMode ? '#C53A1E' : '#1e1a15',
              color: isRageMode ? '#ff4422' : '#F2EFE9',
              textShadow: isRageMode ? '0 0 12px rgba(197,58,30,0.4)' : undefined,
              animation: isRageMode ? 'ragePulse 1.2s ease-in-out infinite' : undefined,
              caretColor: '#C53A1E',
            }}
            data-testid="input-message" />
        </section>

        {/* Mode selector */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-[9px] font-mono tracking-[0.35em] uppercase" style={{ color: '#3a3020' }}>
              — choose your realm
            </label>
            <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: modeColor }}>
              {MODES.find(m => m.id === selectedMode)?.zoneName}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {MODES.map(m => {
              const unlocked = count >= m.unlockAt;
              const active   = selectedMode === m.id;
              const moods: Record<string, string> = {
                default: 'Let go quietly',
                fire:    'Burn it all',
                mirror:  'Face the truth',
                slowmo:  'Linger in it',
                vortex:  'Spiral inward',
                glitch:  'Corrupt the signal',
              };
              return (
                <button key={m.id}
                  onClick={() => { if (unlocked) { playModeSelect(m.id); onModeChange(m.id); } }}
                  title={unlocked ? `${m.zoneName} — ${m.desc}` : `Unlocks at ${m.unlockAt} releases`}
                  disabled={!unlocked}
                  className="relative flex items-start gap-3 px-3 py-3 text-left transition-all"
                  style={{
                    border: active ? `1px solid ${m.color}` : unlocked ? '1px solid #1e1a15' : '1px solid #120e0a',
                    background: active ? `${m.color}12` : unlocked ? '#100c08' : '#0a0806',
                    cursor: unlocked ? 'pointer' : 'default',
                    minHeight: 68,
                  }}
                  data-testid={`mode-${m.id}`}
                  onMouseEnter={e => { if (unlocked && !active) { e.currentTarget.style.background = '#181410'; e.currentTarget.style.borderColor = `${m.color}44`; } }}
                  onMouseLeave={e => { if (unlocked && !active) { e.currentTarget.style.background = '#100c08'; e.currentTarget.style.borderColor = '#1e1a15'; } }}
                >
                  {/* Active accent bar */}
                  {active && (
                    <div style={{ position:'absolute', top:0, left:0, bottom:0, width:2,
                      background: m.color, boxShadow:`0 0 8px ${m.color}88` }} />
                  )}
                  {/* Locked overlay */}
                  {!unlocked && (
                    <div className="absolute inset-0 flex items-end justify-end p-2" style={{ pointerEvents:'none' }}>
                      <span className="font-mono text-[7px] uppercase tracking-widest"
                        style={{ color:'#1e1a15' }}>
                        at {m.unlockAt} →
                      </span>
                    </div>
                  )}
                  {/* Symbol */}
                  <span style={{
                    fontSize: 20, lineHeight: 1, flexShrink: 0,
                    color: unlocked ? m.color : '#2a2418',
                    filter: active ? `drop-shadow(0 0 7px ${m.color}bb)` : unlocked ? `drop-shadow(0 0 2px ${m.color}33)` : 'none',
                    marginTop: 1,
                  }}>
                    {m.icon}
                  </span>
                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] mb-0.5"
                      style={{ color: unlocked ? (active ? '#e8c89a' : '#5C5547') : '#2a2418' }}>
                      {m.label}
                    </div>
                    <div className="font-serif italic text-[10px] leading-tight"
                      style={{ color: unlocked ? (active ? `${m.color}bb` : '#3a3020') : '#1e1a15' }}>
                      {moods[m.id]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Active Quest */}
        {featuredQuest && (
          <section style={{
            border: '1px solid #1e1a15',
            background: '#0d0a07',
            padding: '10px 12px',
          }}>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[8px] uppercase tracking-[0.35em]" style={{ color: '#e8c89a', opacity: 0.6 }}>
                ◆ active quest · ch.{featuredQuest.chapter}
              </span>
              <span className="font-mono text-[7px] uppercase tracking-widest" style={{ color: '#2a2418' }}>
                {activeQuests.length} pending
              </span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest mb-0.5" style={{ color: '#e8c89a' }}>
              {featuredQuest.title}
            </div>
            <div className="font-serif italic text-xs mb-1" style={{ color: '#3a3020' }}>
              {featuredQuest.desc}
            </div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2418' }}>
                {featuredQuest.objective}
              </span>
              <span className="font-mono text-[8px]" style={{ color: '#C53A1E' }}>
                +{featuredQuest.reward.xp} xp{featuredQuest.reward.item ? ' + item' : ''}
              </span>
            </div>
          </section>
        )}

        {/* Inventory */}
        {(adventureState.inventory.length > 0 || count >= 5) && (
          <ItemBar
            inventory={adventureState.inventory}
            activeEffects={adventureState.activeItemEffects}
            onToggleItem={onUseItem}
          />
        )}

        {/* Hold-to-charge */}
        <div className="pb-4 select-none">
          {isEnabled ? (
            <div className="flex flex-col gap-3">

              {/* Charge bar — thick with glowing dot */}
              <div className="w-full relative" style={{ height: 5, background: '#1a1510', borderRadius: 0 }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, height: '100%',
                  width: `${charge}%`,
                  background: charge > 80
                    ? `linear-gradient(to right, #C53A1E, #ff3300)`
                    : `linear-gradient(to right, ${modeColor}88, ${modeColor})`,
                  transition: isCharging ? 'none' : 'width 0.3s ease-out',
                  boxShadow: charge > 30 ? `0 0 ${8 + charge / 8}px ${charge > 80 ? '#ff3300' : modeColor}88` : 'none',
                }} />
                {/* Glowing dot at end of bar */}
                {charge > 3 && (
                  <div style={{
                    position: 'absolute', top: '50%',
                    left: `${Math.min(charge, 99)}%`,
                    transform: 'translate(-50%, -50%)',
                    width: charge > 80 ? 8 : 6,
                    height: charge > 80 ? 8 : 6,
                    borderRadius: '50%',
                    background: charge > 80 ? '#ff3300' : modeColor,
                    boxShadow: `0 0 ${6 + charge / 8}px ${charge > 80 ? '#ff3300cc' : `${modeColor}cc`}`,
                    transition: isCharging ? 'none' : 'left 0.3s ease-out',
                  }} />
                )}
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono tracking-widest uppercase"
                  style={{ color: charge > 5 ? (charge > 80 ? '#ff3300' : modeColor) : chargeLabel.color }}>
                  {chargeLabel.label}
                  {hasChargeSpeed && charge < 5 ? ' — amplified' : ''}
                </span>
                {charge > 5 && (
                  <span className="text-[9px] font-mono tabular-nums"
                    style={{ color: charge > 80 ? '#ff3300' : modeColor }}>
                    {Math.round(charge)}%
                  </span>
                )}
              </div>

              {/* Release button with ring effects */}
              <div className="relative">
                {/* Expanding rings when high charge */}
                {isCharging && charge > 45 && (
                  <>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        position: 'absolute',
                        inset: -(8 + i * 10),
                        borderRadius: 0,
                        border: `1px solid ${charge > 80 ? '#ff3300' : modeColor}`,
                        opacity: Math.max(0, ((charge - 45) / 55) * (0.35 - i * 0.1)),
                        pointerEvents: 'none',
                        transition: 'opacity 0.2s',
                      }} />
                    ))}
                  </>
                )}
                <button
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  disabled={released}
                  className="text-left font-serif italic transition-all touch-none w-full"
                  style={{
                    fontSize: 'clamp(2.4rem, 10vw, 3.2rem)',
                    color: charge > 5 ? (charge > 80 ? '#ff3300' : modeColor) : '#C53A1E',
                    textShadow: charge > 40
                      ? `0 0 ${8 + charge / 6}px ${charge > 80 ? '#ff3300' : modeColor}88`
                      : charge > 0 ? `0 0 8px rgba(197,58,30,0.3)` : 'none',
                    opacity: released ? 0.4 : 1,
                    cursor: released ? 'default' : 'pointer',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    letterSpacing: '-0.01em',
                    transform: highCharge ? `translateX(${(Math.random() - 0.5) * 4}px)` : 'none',
                    display: 'block',
                  }}
                  data-testid="button-release"
                >
                  {released
                    ? 'releasing...'
                    : charge > 80
                      ? '◆ RELEASE NOW →'
                      : charge > 0
                        ? 'Let it go →'
                        : 'Let it go →'}
                </button>
              </div>

              {isBossNext && charge > 0 && (
                <div className="font-mono text-[8px] uppercase tracking-widest"
                  style={{ color: '#C53A1E', animation: 'bossWarn 1s ease-in-out infinite' }}>
                  boss: charge {nextBossZone?.bossRequiredCharge}%+ to defeat
                </div>
              )}
              {charge < 5 && !isCharging && (
                <p className="text-[9px] font-mono tracking-[0.4em] uppercase"
                  style={{ color: '#1e1a15' }}>
                  — hold to charge —
                </p>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="w-full" style={{ height: 1, background: '#120e0a' }} />
              <span className="font-serif italic"
                style={{ fontSize: 'clamp(2.4rem, 10vw, 3.2rem)', color: '#1e1a15' }}>
                Let it go →
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Nav Menu overlay */}
      {menuOpen && (
        <NavMenu
          username={username}
          count={count}
          level={gameState.level}
          currentZone={currentZone}
          onClose={() => setMenuOpen(false)}
          onNavigate={(dest) => {
            if (dest === 'map') onOpenMap();
            else if (dest === 'stats') onOpenStats();
            else if (dest === 'about') onOpenAbout();
            else if (dest === 'howtoplay') onOpenHowToPlay();
          }}
          onLogout={onLogout}
        />
      )}
    </div>
  );
}
