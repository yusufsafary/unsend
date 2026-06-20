import type { Zone } from '../lib/adventure';

interface NavMenuProps {
  username: string;
  count: number;
  level: number;
  currentZone: Zone;
  onClose: () => void;
  onNavigate: (dest: 'map' | 'stats' | 'about' | 'howtoplay') => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  {
    id: 'map' as const,
    icon: '◎',
    label: 'World Map',
    sub: 'Six realms. Your current position.',
  },
  {
    id: 'stats' as const,
    icon: '◈',
    label: 'Chronicle',
    sub: 'Your level, XP, quests, and achievements.',
  },
  {
    id: 'howtoplay' as const,
    icon: '◷',
    label: 'How to Play',
    sub: 'Steps, systems, tips, and boss guide.',
  },
  {
    id: 'about' as const,
    icon: '◌',
    label: 'About',
    sub: 'The game, the realms, the maker\'s note.',
  },
];

export function NavMenu({ username, count, level, currentZone, onClose, onNavigate, onLogout }: NavMenuProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex flex-col max-w-[430px] mx-auto"
      style={{ background: '#0d0907' }}
    >
      <style>{`
        @keyframes menuSlide { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes menuItemFade { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-5"
        style={{ borderBottom: '1px solid #1a1510' }}>
        <div style={{ animation: 'menuSlide 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase" style={{ color: '#3a3020' }}>
            ◆ unsend games
          </div>
          <div className="font-mono text-xs uppercase tracking-widest mt-0.5" style={{ color: '#e8c89a' }}>
            {username}
          </div>
        </div>
        <button
          onClick={onClose}
          className="font-mono text-xl"
          style={{ color: '#3a3020', lineHeight: 1 }}
          onMouseEnter={e => e.currentTarget.style.color = '#F2EFE9'}
          onMouseLeave={e => e.currentTarget.style.color = '#3a3020'}
        >
          ×
        </button>
      </div>

      {/* Current status */}
      <div className="px-6 py-4 flex gap-4 items-center"
        style={{ borderBottom: '1px solid #120e0a', background: '#100c08' }}>
        <span style={{ color: currentZone.color, fontSize: 20, filter: `drop-shadow(0 0 6px ${currentZone.color}55)` }}>
          {currentZone.symbol}
        </span>
        <div>
          <div className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2418' }}>current realm</div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: currentZone.color }}>
            {currentZone.name}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2418' }}>rank</div>
          <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '1.4rem', color: '#C53A1E', lineHeight: 1 }}>{level}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2418' }}>releases</div>
          <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '1.4rem', color: '#F2EFE9', lineHeight: 1 }}>{count}</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col px-6 py-6 gap-2">
        {NAV_ITEMS.map((item, i) => (
          <button
            key={item.id}
            onClick={() => { onNavigate(item.id); onClose(); }}
            className="flex items-center gap-4 py-4 px-4 text-left w-full transition-all"
            style={{
              border: '1px solid #1e1a15',
              background: 'transparent',
              animation: `menuItemFade 0.4s ${i * 0.06 + 0.1}s cubic-bezier(0.16,1,0.3,1) both`,
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = '#1a1510';
              (e.currentTarget as HTMLElement).style.borderColor = '#2a2418';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.borderColor = '#1e1a15';
            }}
          >
            <span style={{ fontSize: 18, color: '#C53A1E', flexShrink: 0 }}>{item.icon}</span>
            <div className="flex-1">
              <div className="font-mono text-xs uppercase tracking-[0.2em] mb-0.5" style={{ color: '#F2EFE9' }}>
                {item.label}
              </div>
              <div className="font-serif italic text-xs" style={{ color: '#3a3020' }}>
                {item.sub}
              </div>
            </div>
            <span className="font-mono text-sm" style={{ color: '#2a2418' }}>→</span>
          </button>
        ))}
      </nav>

      {/* Bottom: logout + studio */}
      <div className="px-6 py-5 flex items-center justify-between"
        style={{ borderTop: '1px solid #120e0a' }}>
        <button
          onClick={onLogout}
          className="font-mono text-xs uppercase tracking-widest transition-all"
          style={{ color: '#2a2418' }}
          onMouseEnter={e => e.currentTarget.style.color = '#C53A1E'}
          onMouseLeave={e => e.currentTarget.style.color = '#2a2418'}
        >
          leave realm →
        </button>
        <div className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: '#1e1a15' }}>
          unsend.games · 2024
        </div>
      </div>
    </div>
  );
}
