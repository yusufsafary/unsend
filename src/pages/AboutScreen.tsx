import { ZONES } from '../lib/adventure';

interface AboutScreenProps {
  onClose: () => void;
}

export function AboutScreen({ onClose }: AboutScreenProps) {
  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto overflow-y-auto"
      style={{ background: '#0d0907', color: '#F2EFE9' }}
    >
      <style>{`
        @keyframes aboutFade { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
        style={{ background: '#0d0907', borderBottom: '1px solid #1a1510' }}>
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontWeight: 700, fontSize: '1.1rem', color: '#C53A1E' }}>un</span>
          <span style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '1.1rem', color: '#F2EFE9', textDecoration: 'line-through', textDecorationColor: '#3a3020' }}>send</span>
          <span className="font-mono text-[8px] tracking-[0.4em] uppercase" style={{ color: '#3a3020' }}>about</span>
        </div>
        <button onClick={onClose}
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: '#5C5547', borderBottom: '1px solid #2a2418', paddingBottom: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F2EFE9'; e.currentTarget.style.borderBottomColor = '#F2EFE9'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5547'; e.currentTarget.style.borderBottomColor = '#2a2418'; }}>
          ← back
        </button>
      </header>

      <main className="flex flex-col" style={{ animation: 'aboutFade 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Hero */}
        <section className="px-6 py-10" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[8px] tracking-[0.45em] uppercase mb-4" style={{ color: '#3a3020' }}>
            ◆ · story driven · emotional · experience · ◆
          </div>
          <h1 style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 'clamp(2.8rem, 12vw, 4.5rem)', lineHeight: 1.02, letterSpacing: '-0.02em', marginBottom: '1.5rem' }}>
            <span style={{ color: '#C53A1E' }}>un</span>
            <span style={{ color: '#F2EFE9', textDecoration: 'line-through', textDecorationColor: '#2a2418', textDecorationThickness: 2 }}>send</span>
          </h1>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-6" style={{ color: '#5C5547' }}>
            Games Studio · EST. 2024
          </div>
          <p className="font-serif italic text-lg leading-relaxed mb-4" style={{ color: '#8a7255' }}>
            "Some words were never meant to be read."
          </p>
          <p className="font-mono text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
            unsend is an emotional adventure game about releasing the words you never sent.
            Six realms. Thirteen quests. Countless shadows waiting to be shattered.
          </p>
        </section>

        {/* What it is */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-6" style={{ color: '#3a3020' }}>
            ◆ the game
          </div>
          <div className="flex flex-col gap-5">
            {[
              {
                icon: '◇',
                title: 'Write the unsaid',
                body: 'Type the message you never sent. To a person, a place, a version of yourself. There\'s no limit on what you can say here — no one will ever read it.'
              },
              {
                icon: '◎',
                title: 'Choose your realm',
                body: 'Six shatter modes, each with its own physics, atmosphere, and emotional register. Classic, Fire, Mirror, Slow-Mo, Vortex, Glitch. Each one unlocks as you go deeper.'
              },
              {
                icon: '◉',
                title: 'Hold. Charge. Release.',
                body: 'Press and hold the release button. Feel the tension build. The longer you hold, the more powerful the shatter. Let go when you\'re ready — or when you can\'t hold it anymore.'
              },
              {
                icon: '◈',
                title: 'Watch it break',
                body: 'Your words shatter into three-dimensional fragments and scatter. They don\'t go anywhere. That\'s the point. They just stop existing as something that weighs on you.'
              },
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <span style={{ color: '#C53A1E', fontSize: 14, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.25em] mb-1" style={{ color: '#e8c89a' }}>{item.title}</div>
                  <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* The Six Realms */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-6" style={{ color: '#3a3020' }}>
            ◆ the six realms
          </div>
          <div className="flex flex-col gap-5">
            {ZONES.map((zone) => (
              <div key={zone.id} className="flex gap-4 pb-5" style={{ borderBottom: '1px solid #120e0a' }}>
                <span style={{ color: zone.color, fontSize: 18, flexShrink: 0, marginTop: 1,
                  filter: `drop-shadow(0 0 4px ${zone.color}55)` }}>
                  {zone.symbol}
                </span>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] mb-0.5"
                    style={{ color: zone.color }}>
                    {zone.name}
                    <span className="font-mono text-[8px] ml-2 tracking-widest"
                      style={{ color: '#2a2418' }}>
                      {zone.unlockAt > 0 ? `— unlocks at ${zone.unlockAt}` : '— starting realm'}
                    </span>
                  </div>
                  <p className="font-serif italic text-xs leading-relaxed mb-1" style={{ color: '#5C5547' }}>
                    {zone.subtitle}
                  </p>
                  <p className="font-mono text-xs leading-relaxed" style={{ color: '#3a3020' }}>
                    {zone.lore}
                  </p>
                  <div className="mt-2 font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2418' }}>
                    boss: {zone.bossName}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why it exists — Maker's Note */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-6" style={{ color: '#3a3020' }}>
            ◆ maker's note
          </div>
          <div className="flex flex-col gap-5">
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#6a5a40' }}>
              I built this because I had things I needed to say and no safe place to say them.
            </p>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              Not a journal — too permanent. Not a text I'd actually send — too risky. Not therapy — not yet. Just somewhere to put the weight of words that had nowhere to go.
            </p>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              The shatter animation came first. I wanted the act of letting go to <em>feel</em> like something. Not just delete, not just close the tab — a real, physical release. Fragments flying. Glass breaking. Something your body could feel even if the other person never would.
            </p>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              The adventure layer came after, because I noticed people kept coming back. So I asked — what if returning meant something? What if each release was a step deeper into a world built entirely from the things we never said?
            </p>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#6a5a40' }}>
              That's unsend. A game about the conversations you never finished.
            </p>
            <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#3a3020' }}>
              — Yusuf, unsend Games Studio
            </div>
          </div>
        </section>

        {/* What we want to know */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-5" style={{ color: '#3a3020' }}>
            ◆ what we want to know
          </div>
          <div className="flex flex-col gap-3">
            {[
              'Does the shatter animation actually feel like release — or does it feel hollow?',
              'Is there a realm you wish existed? A mode that matches how you carry the unsaid?',
              'Did you type something real? You don\'t have to tell us what. Just — did it help?',
              'What made you stop playing? What made you come back?',
            ].map((q, i) => (
              <div key={i} className="flex gap-3">
                <span className="font-mono text-[9px] flex-shrink-0 mt-0.5" style={{ color: '#C53A1E' }}>◆</span>
                <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>{q}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Studio footer */}
        <section className="px-6 py-8 flex flex-col gap-3">
          <div className="font-mono text-[8px] tracking-[0.45em] uppercase" style={{ color: '#2a2418' }}>
            ◆ · unsend games studio · est. 2024 · ◆
          </div>
          <div className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: '#1e1a15' }}>
            PC · Mobile · Web
          </div>
          <p className="font-serif italic text-xs" style={{ color: '#2a2418' }}>
            "leave blank for the universe."
          </p>
        </section>

      </main>
    </div>
  );
}
