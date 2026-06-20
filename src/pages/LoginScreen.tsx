import React, { useState, useRef } from 'react';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

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
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto relative overflow-hidden"
      style={{ background: '#0d0907' }}
    >
      <style>{`
        @keyframes loginFadeUp {
          from { opacity:0; transform:translateY(20px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fogDrift {
          0%   { transform:translateX(0) scale(1.05); }
          50%  { transform:translateX(-8px) scale(1.08); }
          100% { transform:translateX(0) scale(1.05); }
        }
        @keyframes emblemPulse {
          0%,100% { opacity:0.6; }
          50% { opacity:1; }
        }
        @keyframes scanH {
          0%   { transform:translateY(-100%); opacity:0; }
          10%  { opacity:1; }
          90%  { opacity:0.4; }
          100% { transform:translateY(100vh); opacity:0; }
        }
      `}</style>

      {/* Background image */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'url(/bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
        animation: 'fogDrift 18s ease-in-out infinite',
        transformOrigin: 'center',
      }} />

      {/* Layered overlays for the dark sepia effect */}
      <div className="absolute inset-0" style={{
        background: 'linear-gradient(to bottom, rgba(13,9,7,0.55) 0%, rgba(13,9,7,0.3) 40%, rgba(13,9,7,0.75) 70%, rgba(13,9,7,0.97) 100%)',
      }} />
      <div className="absolute inset-0" style={{
        background: 'radial-gradient(ellipse at 50% 60%, transparent 20%, rgba(13,9,7,0.5) 100%)',
      }} />

      {/* Subtle scan line */}
      <div className="absolute inset-x-0 pointer-events-none" style={{
        height: 1,
        background: 'linear-gradient(to right, transparent, rgba(197,58,30,0.12), transparent)',
        animation: 'scanH 14s linear infinite',
        top: 0,
      }} />

      {/* Corner decorations */}
      <div className="absolute top-4 left-4 pointer-events-none" style={{ opacity: 0.3 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M2 2 L12 2 L2 12" stroke="#e8c89a" strokeWidth="1"/>
        </svg>
      </div>
      <div className="absolute top-4 right-4 pointer-events-none" style={{ opacity: 0.3 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M26 2 L16 2 L26 12" stroke="#e8c89a" strokeWidth="1"/>
        </svg>
      </div>
      <div className="absolute bottom-4 left-4 pointer-events-none" style={{ opacity: 0.3 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M2 26 L12 26 L2 16" stroke="#e8c89a" strokeWidth="1"/>
        </svg>
      </div>
      <div className="absolute bottom-4 right-4 pointer-events-none" style={{ opacity: 0.3 }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M26 26 L16 26 L26 16" stroke="#e8c89a" strokeWidth="1"/>
        </svg>
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex justify-between items-start px-6 pt-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 0 L10 5 L5 10 L0 5 Z" fill="#C53A1E" opacity="0.8"/>
            </svg>
            <span className="font-mono text-[8px] tracking-[0.4em] uppercase" style={{ color: '#8a7255' }}>
              Story driven · Emotional · Experience
            </span>
          </div>
        </div>
        <div className="font-mono text-[8px] tracking-[0.25em] uppercase text-right" style={{ color: '#4a3a2a' }}>
          <div>est.</div>
          <div style={{ color: '#6a5040' }}>2024</div>
        </div>
      </header>

      {/* Compass element top-right */}
      <div className="absolute top-12 right-6 pointer-events-none" style={{ opacity: 0.15, animation: 'emblemPulse 4s ease-in-out infinite' }}>
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
          <circle cx="26" cy="26" r="24" stroke="#e8c89a" strokeWidth="0.5"/>
          <circle cx="26" cy="26" r="18" stroke="#e8c89a" strokeWidth="0.3"/>
          <path d="M26 2 L28 24 L26 26 L24 24 Z" fill="#e8c89a"/>
          <path d="M26 50 L28 28 L26 26 L24 28 Z" fill="#e8c89a" opacity="0.4"/>
          <path d="M2 26 L24 28 L26 26 L24 24 Z" fill="#e8c89a" opacity="0.4"/>
          <path d="M50 26 L28 28 L26 26 L28 24 Z" fill="#e8c89a" opacity="0.4"/>
          <rect x="24.5" y="24.5" width="3" height="3" fill="#e8c89a" transform="rotate(45 26 26)"/>
        </svg>
      </div>

      {/* Center: UNSEND logo + tagline */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-6"
        style={{ animation: 'loginFadeUp 1s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Logo */}
        <div className="mb-2">
          <div style={{ lineHeight: 1, letterSpacing: '-0.02em' }}>
            <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontWeight: 700, fontSize: 'clamp(3.2rem,14vw,5rem)', color: '#C53A1E' }}>un</span>
            <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 'clamp(3.2rem,14vw,5rem)', color: '#F2EFE9', textDecoration: 'line-through', textDecorationColor: '#4a3a2a', textDecorationThickness: 2 }}>send</span>
          </div>
          <div className="font-mono tracking-[0.45em] uppercase"
            style={{ fontSize: '0.55rem', color: '#8a7255', marginTop: 4, letterSpacing: '0.45em' }}>
            Games Studio
          </div>
        </div>

        {/* Divider with diamond */}
        <div className="flex items-center gap-3 my-4" style={{ opacity: 0.4 }}>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to right, transparent, #8a7255)' }} />
          <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
            <path d="M3 0 L6 3 L3 6 L0 3 Z" fill="#C53A1E"/>
          </svg>
          <div style={{ flex: 1, height: 1, background: 'linear-gradient(to left, transparent, #8a7255)' }} />
        </div>

        {/* Tagline */}
        <p className="font-mono italic text-sm" style={{ color: '#6a5a40', letterSpacing: '0.05em', marginBottom: '2.5rem' }}>
          leave blank for the universe
        </p>

        {/* Feature list — left side, like the reference */}
        <div className="flex flex-col gap-3 mb-10" style={{ opacity: 0.85 }}>
          {[
            { icon: '◆', title: 'Original IP', sub: 'Unique stories from the heart' },
            { icon: '✦', title: 'Unique Worlds', sub: 'Rich realms, limitless release' },
            { icon: '◎', title: 'Meaningful Choices', sub: 'Your decisions shape the story' },
            { icon: '✦', title: 'Immersive Experience', sub: 'Emotional moments that stay with you' },
          ].map((f, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: '#C53A1E', opacity: 0.7 }}>{f.icon}</span>
              <div>
                <div className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: '#8a7255' }}>{f.title}</div>
                <div className="font-serif italic text-[10px]" style={{ color: '#4a3a2a' }}>{f.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Name entry */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="relative">
            <div className="font-mono text-[9px] uppercase tracking-[0.35em] mb-2" style={{ color: '#3a3020' }}>
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
          </div>

          <button
            type="submit"
            disabled={submitting || !username.trim()}
            className="relative font-mono text-xs uppercase tracking-[0.3em] py-3 px-6 transition-all"
            style={{
              background: submitting ? '#1a1410' : '#C53A1E',
              color: submitting ? '#4a3a2a' : '#F2EFE9',
              opacity: !username.trim() ? 0.4 : 1,
              border: '1px solid transparent',
              letterSpacing: '0.3em',
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
            {submitting ? 'entering the realm...' : 'begin the journey →'}
          </button>
        </form>
      </div>

      {/* Platform footer — like the reference */}
      <footer className="relative z-10 px-6 pb-6 pt-4 flex justify-between items-center"
        style={{ borderTop: '1px solid #1a1410' }}>
        <span className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: '#2a2218' }}>
          PC · Mobile · Web
        </span>
        <span className="font-mono text-[8px]" style={{ color: '#2a2218' }}>
          2026
        </span>
      </footer>
    </div>
  );
}
