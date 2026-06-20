import React, { useState, useRef, useEffect } from 'react';

const REALMS = [
  { symbol: '◈', name: 'The Wasteland',          color: '#8C8473', sub: 'where forgotten words rest' },
  { symbol: '◉', name: 'The Inferno',             color: '#ff5a1a', sub: 'where anger burns forever' },
  { symbol: '◎', name: 'The Mirror Realm',        color: '#7ab8d4', sub: 'where reflections speak truth' },
  { symbol: '◷', name: 'Cathedral of Time',       color: '#b4a0d4', sub: 'where moments never end' },
  { symbol: '◌', name: 'The Vortex Nexus',        color: '#8855ff', sub: 'where everything spirals inward' },
  { symbol: '▣', name: 'The Glitch Matrix',       color: '#00cc66', sub: 'where reality corrupts' },
];

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [realmIdx, setRealmIdx] = useState(0);
  const [realmVisible, setRealmVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);

  // Particle animation
  useEffect(() => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    const W = canvas.width; const H = canvas.height;

    const glyphs = ['◆', '◇', '◈', '◉', '◌', '◎', '◷', '▣', '✦', '◊'];
    type Particle = { x: number; y: number; speed: number; size: number; opacity: number; glyph: string; drift: number; pulse: number };
    const particles: Particle[] = Array.from({ length: 40 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 0.12 + Math.random() * 0.28,
      size: 9 + Math.random() * 16,
      opacity: 0.025 + Math.random() * 0.065,
      glyph: glyphs[Math.floor(Math.random() * glyphs.length)],
      drift: (Math.random() - 0.5) * 0.14,
      pulse: Math.random() * Math.PI * 2,
    }));

    let raf: number;
    let frame = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      frame++;
      for (const p of particles) {
        p.y -= p.speed;
        p.x += p.drift;
        p.pulse += 0.018;
        if (p.y < -30) { p.y = H + 20; p.x = Math.random() * W; }
        if (p.x < -30) p.x = W + 20;
        if (p.x > W + 30) p.x = -20;
        const osc = Math.sin(p.pulse) * 0.3 + 0.7;
        ctx.globalAlpha = p.opacity * osc;
        ctx.fillStyle = '#e8c89a';
        ctx.font = `${p.size}px serif`;
        ctx.fillText(p.glyph, p.x, p.y);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  // Realm cycler
  useEffect(() => {
    const t = setInterval(() => {
      setRealmVisible(false);
      setTimeout(() => {
        setRealmIdx(i => (i + 1) % REALMS.length);
        setRealmVisible(true);
      }, 350);
    }, 2800);
    return () => clearInterval(t);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || submitting) return;
    setSubmitting(true);
    setTimeout(() => onLogin(username.trim()), 360);
  };

  const realm = REALMS[realmIdx];

  return (
    <div
      className="min-h-[100dvh] w-full relative overflow-hidden"
      style={{ background: '#0d0907' }}
    >
      <style>{`
        @keyframes loginFadeUp {
          from { opacity:0; transform:translateY(22px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fogDrift {
          0%   { transform:translateX(0) scale(1.05); }
          50%  { transform:translateX(-10px) scale(1.08); }
          100% { transform:translateX(0) scale(1.05); }
        }
        @keyframes scanH {
          0%   { transform:translateY(-100%); opacity:0; }
          10%  { opacity:1; }
          90%  { opacity:0.5; }
          100% { transform:translateY(100vh); opacity:0; }
        }
        @keyframes realmFadeIn {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes btnGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(197,58,30,0); }
          50%     { box-shadow: 0 0 18px 2px rgba(197,58,30,0.25); }
        }
        @keyframes compassSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes emblemPulse {
          0%,100% { opacity:0.5; }
          50% { opacity:1; }
        }
        @keyframes scanPulse {
          0%,100%{opacity:0.4} 50%{opacity:1}
        }
      `}</style>

      {/* Particle canvas — full screen, behind everything */}
      <canvas
        ref={particleCanvasRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Background image — full screen */}
      <div className="absolute inset-0 z-[1]" style={{
        backgroundImage: 'url(/bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        animation: 'fogDrift 20s ease-in-out infinite',
        transformOrigin: 'center',
        opacity: 0.72,
      }} />

      {/* Layered overlays — full screen */}
      <div className="absolute inset-0 z-[2]" style={{
        background: 'linear-gradient(to bottom, rgba(13,9,7,0.55) 0%, rgba(13,9,7,0.2) 35%, rgba(13,9,7,0.7) 65%, rgba(13,9,7,0.98) 100%)',
      }} />
      <div className="absolute inset-0 z-[2]" style={{
        background: 'radial-gradient(ellipse at 50% 55%, transparent 20%, rgba(13,9,7,0.55) 100%)',
      }} />

      {/* Scan line */}
      <div className="absolute inset-x-0 pointer-events-none z-[3]" style={{
        height: 1,
        background: 'linear-gradient(to right, transparent, rgba(197,58,30,0.18), transparent)',
        animation: 'scanH 16s linear infinite',
        top: 0,
      }} />

      {/* Content wrapper — centered 430px, full height */}
      <div className="relative z-[10] min-h-[100dvh] max-w-[430px] mx-auto flex flex-col">

        {/* Corner brackets */}
        {[['top-4 left-4','M2 2 L12 2 L2 12'],['top-4 right-4','M26 2 L16 2 L26 12'],
          ['bottom-4 left-4','M2 26 L12 26 L2 16'],['bottom-4 right-4','M26 26 L16 26 L26 16']].map(([cls, d], i) => (
          <div key={i} className={`absolute ${cls} pointer-events-none`} style={{ opacity: 0.35 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d={d} stroke="#e8c89a" strokeWidth="1"/>
            </svg>
          </div>
        ))}

        {/* Top bar */}
        <header className="flex justify-between items-start px-6 pt-6">
          <div className="flex items-center gap-2">
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M4 0 L8 4 L4 8 L0 4 Z" fill="#C53A1E" opacity="0.9"/>
            </svg>
            <span className="font-mono text-[8px] tracking-[0.4em] uppercase" style={{ color: '#6a5a40' }}>
              Story · Emotional · Adventure
            </span>
          </div>
          <div className="font-mono text-[8px] text-right" style={{ color: '#3a2a1a' }}>
            <div style={{ letterSpacing:'0.2em' }}>EST.</div>
            <div style={{ color: '#5a3a20', letterSpacing:'0.15em' }}>2024</div>
          </div>
        </header>

        {/* Compass */}
        <div className="absolute top-12 right-6 pointer-events-none"
          style={{ opacity: 0.18, animation: 'emblemPulse 5s ease-in-out infinite' }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="26" stroke="#e8c89a" strokeWidth="0.5"/>
            <circle cx="28" cy="28" r="19" stroke="#e8c89a" strokeWidth="0.3"/>
            <path d="M28 2 L30 26 L28 28 L26 26 Z" fill="#e8c89a"/>
            <path d="M28 54 L30 30 L28 28 L26 30 Z" fill="#e8c89a" opacity="0.4"/>
            <path d="M2 28 L26 30 L28 28 L26 26 Z" fill="#e8c89a" opacity="0.4"/>
            <path d="M54 28 L30 30 L28 28 L30 26 Z" fill="#e8c89a" opacity="0.4"/>
            <rect x="26.5" y="26.5" width="3" height="3" fill="#e8c89a" transform="rotate(45 28 28)"/>
          </svg>
        </div>

        {/* Hero content */}
        <div className="flex-1 flex flex-col justify-center px-6"
          style={{ animation: 'loginFadeUp 1s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>

          {/* Logo */}
          <div className="mb-3">
            <div style={{ lineHeight: 1, letterSpacing: '-0.02em' }}>
              <span style={{ fontFamily:'serif', fontStyle:'italic', fontWeight:700,
                fontSize:'clamp(3.4rem,14vw,5.5rem)', color:'#C53A1E',
                textShadow:'0 0 40px rgba(197,58,30,0.35)' }}>un</span>
              <span style={{ fontFamily:'serif', fontStyle:'italic',
                fontSize:'clamp(3.4rem,14vw,5.5rem)', color:'#F2EFE9',
                textDecoration:'line-through', textDecorationColor:'#3a2a1a', textDecorationThickness:2 }}>send</span>
            </div>
            <div className="font-mono tracking-[0.45em] uppercase"
              style={{ fontSize:'0.5rem', color:'#6a5040', marginTop:5 }}>
              Games Studio
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5" style={{ opacity: 0.4 }}>
            <div style={{ flex:1, height:1, background:'linear-gradient(to right, transparent, #8a7255)' }} />
            <svg width="5" height="5" viewBox="0 0 5 5" fill="none"><path d="M2.5 0 L5 2.5 L2.5 5 L0 2.5 Z" fill="#C53A1E"/></svg>
            <div style={{ flex:1, height:1, background:'linear-gradient(to left, transparent, #8a7255)' }} />
          </div>

          {/* Tagline */}
          <p className="font-serif italic text-sm mb-8" style={{ color: '#5a4a30', letterSpacing: '0.06em' }}>
            leave blank for the universe
          </p>

          {/* Realm cycler */}
          <div className="mb-8 flex flex-col gap-3">
            <div className="font-mono text-[8px] tracking-[0.4em] uppercase" style={{ color: '#2a2015' }}>
              ◆ six realms await
            </div>
            <div
              key={realmIdx}
              className="flex items-center gap-4 px-4 py-3"
              style={{
                border: `1px solid ${realm.color}30`,
                background: `${realm.color}08`,
                animation: realmVisible ? 'realmFadeIn 0.35s cubic-bezier(0.16,1,0.3,1) both' : 'none',
                opacity: realmVisible ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <span style={{
                fontSize: 28, color: realm.color, lineHeight: 1,
                filter: `drop-shadow(0 0 8px ${realm.color}66)`,
              }}>
                {realm.symbol}
              </span>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: realm.color }}>
                  {realm.name}
                </div>
                <div className="font-serif italic text-xs" style={{ color: '#3a3020' }}>
                  {realm.sub}
                </div>
              </div>
              <div className="ml-auto flex gap-1">
                {REALMS.map((_, i) => (
                  <div key={i} style={{
                    width: 4, height: 4,
                    borderRadius: '50%',
                    background: i === realmIdx ? realm.color : '#1e1a15',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Name entry */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <div className="font-mono text-[9px] uppercase tracking-[0.35em] mb-2" style={{ color: '#3a2a1a' }}>
                — enter your name, warrior
              </div>
              <input
                ref={inputRef}
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="your name"
                className="w-full bg-transparent pb-2 text-base font-mono outline-none rounded-none"
                style={{
                  color: '#F2EFE9',
                  borderBottom: `1px solid ${focused ? '#e8c89a' : '#2a2218'}`,
                  transition: 'border-color 0.3s',
                  caretColor: '#C53A1E',
                }}
                required
                autoComplete="off"
                data-testid="input-username"
              />
              {focused && username.trim() && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0,
                  height: 1, background: '#e8c89a',
                  width: `${Math.min(username.length * 10, 100)}%`,
                  transition: 'width 0.2s ease',
                  boxShadow: '0 0 6px #e8c89a66',
                }} />
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || !username.trim()}
              className="relative font-mono text-xs uppercase tracking-[0.3em] py-4 px-6 transition-all overflow-hidden"
              style={{
                background: submitting ? '#1a1410' : '#C53A1E',
                color: submitting ? '#4a3a2a' : '#F2EFE9',
                opacity: !username.trim() ? 0.3 : 1,
                border: '1px solid transparent',
                animation: username.trim() && !submitting ? 'btnGlow 2.5s ease-in-out infinite' : 'none',
              }}
              onMouseEnter={e => {
                if (!submitting && username.trim()) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#C53A1E';
                  e.currentTarget.style.color = '#C53A1E';
                }
              }}
              onMouseLeave={e => {
                if (!submitting && username.trim()) {
                  e.currentTarget.style.background = '#C53A1E';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.color = '#F2EFE9';
                }
              }}
              data-testid="button-login"
            >
              {submitting ? (
                <span style={{ letterSpacing: '0.25em' }}>entering the realm...</span>
              ) : (
                <span style={{ letterSpacing: '0.3em' }}>begin the journey →</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <footer className="px-6 pb-6 pt-4 flex justify-between items-center"
          style={{ borderTop: '1px solid #1a1410' }}>
          <div className="flex gap-3 items-center">
            <span className="font-mono text-[7px] tracking-[0.35em] uppercase" style={{ color: '#2a2015' }}>
              PC · Mobile · Web
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div style={{ width: 4, height: 4, borderRadius:'50%', background:'#C53A1E',
              animation: 'scanPulse 2s ease-in-out infinite' }} />
            <span className="font-mono text-[7px]" style={{ color: '#2a2015' }}>
              2026
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
