import React, { useState, useEffect, useRef } from 'react';
import { Wordmark } from '../components/Wordmark';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

// Floating ember/particle for background atmosphere
function Particle({ delay, x, size, dur }: { delay: number; x: number; size: number; dur: number }) {
  return (
    <div style={{
      position: 'absolute',
      left: `${x}%`,
      bottom: '-10px',
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'rgba(197,58,30,0.35)',
      boxShadow: '0 0 6px rgba(197,58,30,0.5)',
      animation: `rise ${dur}s ${delay}s ease-in infinite`,
      pointerEvents: 'none',
    }} />
  );
}

const PARTICLES = [
  { x: 12, size: 2, dur: 9, delay: 0 },
  { x: 28, size: 1.5, dur: 12, delay: 2 },
  { x: 45, size: 2.5, dur: 8, delay: 4 },
  { x: 62, size: 1, dur: 11, delay: 1 },
  { x: 78, size: 2, dur: 10, delay: 3 },
  { x: 88, size: 1.5, dur: 14, delay: 5 },
  { x: 5,  size: 1,  dur: 13, delay: 6 },
  { x: 55, size: 2,  dur: 9,  delay: 7 },
];

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || submitting) return;
    setSubmitting(true);
    setTimeout(() => onLogin(username.trim()), 320);
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto relative overflow-hidden"
      style={{ background: '#16140F' }}>

      <style>{`
        @keyframes rise {
          0%   { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
          10%  { opacity: 1; }
          80%  { opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(${Math.random() > 0.5 ? 20 : -20}px) scale(0.3); opacity: 0; }
        }
        @keyframes scanH {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Background: SVG crack network */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.07 }}>
        <svg viewBox="0 0 430 932" preserveAspectRatio="xMidYMid slice"
          style={{ width: '100%', height: '100%' }} fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="#F2EFE9">
            <line x1="215" y1="466" x2="0"   y2="80"  strokeWidth="0.8"/>
            <line x1="215" y1="466" x2="430" y2="130" strokeWidth="0.6"/>
            <line x1="215" y1="466" x2="30"  y2="820" strokeWidth="0.7"/>
            <line x1="215" y1="466" x2="410" y2="850" strokeWidth="0.5"/>
            <line x1="215" y1="466" x2="215" y2="0"   strokeWidth="0.9"/>
            <line x1="215" y1="466" x2="215" y2="932" strokeWidth="0.6"/>
            <line x1="215" y1="466" x2="0"   y2="500" strokeWidth="0.5"/>
            <line x1="215" y1="466" x2="430" y2="420" strokeWidth="0.6"/>
            {/* Branches */}
            <line x1="105" y1="238" x2="40"  y2="170" strokeWidth="0.5"/>
            <line x1="105" y1="238" x2="75"  y2="300" strokeWidth="0.4"/>
            <line x1="345" y1="265" x2="415" y2="195" strokeWidth="0.5"/>
            <line x1="345" y1="265" x2="390" y2="340" strokeWidth="0.3"/>
            <line x1="110" y1="660" x2="45"  y2="740" strokeWidth="0.5"/>
            <line x1="110" y1="660" x2="70"  y2="610" strokeWidth="0.3"/>
            <line x1="330" y1="680" x2="415" y2="760" strokeWidth="0.4"/>
            <line x1="215" y1="180" x2="155" y2="90"  strokeWidth="0.4"/>
            <line x1="215" y1="740" x2="280" y2="870" strokeWidth="0.3"/>
            <line x1="215" y1="740" x2="160" y2="850" strokeWidth="0.3"/>
          </g>
          {/* Center impact point */}
          <circle cx="215" cy="466" r="2" fill="#C53A1E" opacity="0.4"/>
          <circle cx="215" cy="466" r="8" stroke="#C53A1E" strokeWidth="0.5" opacity="0.2"/>
          <circle cx="215" cy="466" r="18" stroke="#C53A1E" strokeWidth="0.3" opacity="0.1"/>
        </svg>
      </div>

      {/* Atmospheric vignette */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(22,20,15,0.75) 100%)',
      }} />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}
      </div>

      {/* Scan line — very subtle */}
      <div className="absolute inset-x-0 pointer-events-none" style={{
        height: '1px',
        background: 'linear-gradient(to right, transparent, rgba(197,58,30,0.08), transparent)',
        animation: 'scanH 12s linear infinite',
        top: 0,
      }} />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6">
        <Wordmark />
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase"
          style={{ color: '#2a2820' }}>vol. i</span>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-12 relative z-10"
        style={{ animation: 'fadeUp 0.8s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Hero text */}
        <div className="mb-16">
          <h1 className="font-serif italic leading-[1.02]"
            style={{ fontSize: 'clamp(2.6rem,11vw,3.8rem)', color: '#F2EFE9', letterSpacing: '-0.01em' }}>
            Some words<br />
            were never<br />
            meant to be<br />
            read.
          </h1>
          <p className="font-mono text-xs mt-6 tracking-widest uppercase"
            style={{ color: '#3a3530' }}>
            write it — shatter it — release it
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="your name"
              className="w-full bg-transparent pb-3 text-lg font-mono outline-none rounded-none placeholder:italic"
              style={{
                color: '#F2EFE9',
                borderBottom: `1px solid ${focused ? '#F2EFE9' : '#2a2820'}`,
                transition: 'border-color 0.3s',
                caretColor: '#C53A1E',
              }}
              required
              autoComplete="off"
              data-testid="input-username"
            />
            {username.length > 0 && (
              <div className="absolute right-0 bottom-3 font-mono text-xs"
                style={{ color: '#3a3530' }}>
                ↵
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="relative overflow-hidden font-mono text-sm uppercase tracking-[0.25em] py-4 px-6 w-full transition-all"
            style={{
              background: submitting ? '#1e1c18' : '#F2EFE9',
              color: submitting ? '#3a3530' : '#16140F',
              border: '1px solid transparent',
              opacity: submitting ? 0.6 : 1,
            }}
            onMouseEnter={e => {
              if (!submitting) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#F2EFE9';
                e.currentTarget.style.borderColor = '#F2EFE9';
              }
            }}
            onMouseLeave={e => {
              if (!submitting) {
                e.currentTarget.style.background = '#F2EFE9';
                e.currentTarget.style.color = '#16140F';
                e.currentTarget.style.borderColor = 'transparent';
              }
            }}
            data-testid="button-login"
          >
            {submitting ? 'entering...' : 'enter —'}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 pb-6 flex justify-between items-center"
        style={{ borderTop: '1px solid #1a1815', paddingTop: '1rem' }}>
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color: '#272420' }}>
          unsend.games
        </span>
        <span className="font-mono text-[10px]" style={{ color: '#272420' }}>
          2026
        </span>
      </footer>
    </div>
  );
}
