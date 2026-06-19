import { useState, useRef, useCallback, useEffect } from 'react';
import { Wordmark } from '../components/Wordmark';

interface ComposeScreenProps {
  username: string;
  count: number;
  onLogout: () => void;
  onRelease: (message: string, chargeLevel: number) => void;
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
  { min: 0,  label: 'hold to charge',    color: '#8C8473' },
  { min: 20, label: 'warming up',         color: '#a04a2a' },
  { min: 50, label: 'building pressure',  color: '#C53A1E' },
  { min: 80, label: 'full send',          color: '#ff3300' },
];

export function ComposeScreen({ username, count, onLogout, onRelease }: ComposeScreenProps) {
  const [who, setWho] = useState('');
  const [message, setMessage] = useState('');
  const [charge, setCharge] = useState(0);          // 0-100
  const [isCharging, setIsCharging] = useState(false);
  const [released, setReleased] = useState(false);
  const chargeRef = useRef(0);
  const chargeTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const chargeStart = useRef(0);
  const isEnabled = message.trim().length > 0;

  const textIntensity = analyzeIntensity(message);

  const chargeLabel = CHARGE_LABELS.slice().reverse().find(l => charge >= l.min) ?? CHARGE_LABELS[0];

  const stopCharging = useCallback(() => {
    if (chargeTimer.current) {
      clearInterval(chargeTimer.current);
      chargeTimer.current = null;
    }
    setIsCharging(false);
  }, []);

  const startCharging = useCallback(() => {
    if (!isEnabled || released) return;
    setIsCharging(true);
    chargeStart.current = Date.now();

    chargeTimer.current = setInterval(() => {
      const elapsed = (Date.now() - chargeStart.current) / 1000;
      const raw = Math.min((elapsed / 2.2) * 100, 100);
      chargeRef.current = raw;
      setCharge(raw);
      if (raw >= 100) {
        stopCharging();
      }
    }, 16);
  }, [isEnabled, released, stopCharging]);

  const fireRelease = useCallback(() => {
    if (!isEnabled || released) return;
    stopCharging();
    const base = chargeRef.current;
    const final = Math.min(base + textIntensity, 100);
    setReleased(true);
    // Brief pause so user sees full charge, then fire
    setTimeout(() => onRelease(message.trim(), Math.round(final)), 80);
  }, [isEnabled, released, stopCharging, textIntensity, message, onRelease]);

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

  // Cleanup on unmount
  useEffect(() => () => { if (chargeTimer.current) clearInterval(chargeTimer.current); }, []);

  // Shake CSS class when near max
  const highCharge = charge >= 85;
  const screenGlow = isCharging ? Math.min(charge / 100, 1) : 0;

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto relative overflow-hidden"
      style={{ transition: 'box-shadow 0.1s', boxShadow: screenGlow > 0.1 ? `inset 0 0 ${60 * screenGlow}px rgba(197,58,30,${screenGlow * 0.35})` : 'none' }}
    >
      {/* Screen edge vignette when charging */}
      {isCharging && (
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: `radial-gradient(ellipse at center, transparent 50%, rgba(197,58,30,${screenGlow * 0.18}) 100%)`,
          }}
        />
      )}

      <header className="flex justify-between items-center p-6 border-b border-border relative z-20">
        <Wordmark />
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-muted-foreground" data-testid="text-count">
            {count > 0 && (
              <span style={{ color: count >= 10 ? '#C53A1E' : undefined }}>
                Released: {count}{count >= 10 ? ' 🔥' : ''}
              </span>
            )}
            {count === 0 && 'Released: 0'}
          </span>
          <button
            onClick={onLogout}
            className="text-xs font-mono uppercase tracking-widest hover:text-accent transition-colors"
            data-testid="button-logout"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-6 gap-10 relative z-20">
        <section className="flex flex-col gap-4 mt-6">
          <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
            01 — WHO
          </label>
          <input
            type="text"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder="Who is this for? (Optional)"
            className="w-full bg-transparent border-b border-border focus:border-foreground pb-2 text-base font-mono outline-none transition-colors rounded-none placeholder:text-muted-foreground"
            data-testid="input-who"
          />
        </section>

        <section className="flex flex-col gap-4 flex-1">
          <div className="flex justify-between items-center">
            <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
              02 — WHAT
            </label>
            {message.trim().length > 0 && (
              <span
                className="text-xs font-mono tracking-widest uppercase transition-all"
                style={{ color: textIntensity > 40 ? '#C53A1E' : '#8C8473' }}
              >
                {textIntensity > 50 ? '⚡ intense' : textIntensity > 25 ? '— charged' : '— calm'}
              </span>
            )}
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write what you never sent."
            className="w-full flex-1 min-h-[180px] bg-transparent border-b border-border focus:border-foreground pb-2 text-lg md:text-xl font-serif leading-relaxed outline-none transition-colors rounded-none resize-none placeholder:text-muted-foreground placeholder:italic"
            data-testid="input-message"
          />
        </section>

        {/* Hold-to-charge release button */}
        <div className="pb-8 select-none">
          {isEnabled ? (
            <div className="flex flex-col gap-3">
              {/* Charge bar */}
              <div className="w-full h-[1px] bg-border relative overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 transition-none"
                  style={{
                    width: `${charge}%`,
                    background: charge > 80 ? '#ff3300' : '#C53A1E',
                    transition: isCharging ? 'none' : 'width 0.3s ease-out',
                    boxShadow: charge > 50 ? `0 0 ${charge / 10}px rgba(197,58,30,0.8)` : 'none',
                  }}
                />
              </div>

              {/* Status label */}
              <div className="flex justify-between items-center">
                <span
                  className="text-xs font-mono tracking-widest uppercase transition-colors"
                  style={{ color: chargeLabel.color }}
                >
                  {chargeLabel.label}
                </span>
                {charge > 5 && (
                  <span className="text-xs font-mono" style={{ color: chargeLabel.color }}>
                    {Math.round(charge)}%
                  </span>
                )}
              </div>

              {/* The button itself */}
              <button
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                disabled={released}
                className="text-left font-serif italic transition-all touch-none"
                style={{
                  fontSize: 'clamp(2.2rem, 10vw, 3.2rem)',
                  color: charge > 5 ? (charge > 80 ? '#ff3300' : '#C53A1E') : '#C53A1E',
                  transform: highCharge
                    ? `translateX(${(Math.random() - 0.5) * 3}px) translateY(${(Math.random() - 0.5) * 2}px)`
                    : 'none',
                  textShadow: charge > 50 ? `0 0 ${charge / 8}px rgba(197,58,30,0.6)` : 'none',
                  opacity: released ? 0.4 : 1,
                  cursor: released ? 'default' : 'pointer',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                data-testid="button-release"
              >
                {released ? 'releasing...' : charge > 80 ? 'RELEASE NOW →' : 'Let it go →'}
              </button>

              {charge < 5 && !isCharging && (
                <p className="text-xs font-mono" style={{ color: '#5C5547' }}>
                  Press and hold to charge the release
                </p>
              )}
            </div>
          ) : (
            <span
              className="font-serif italic text-border"
              style={{ fontSize: 'clamp(2.2rem, 10vw, 3.2rem)' }}
            >
              Let it go →
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
