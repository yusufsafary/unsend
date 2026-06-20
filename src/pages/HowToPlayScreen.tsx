import { ZONES } from '../lib/adventure';

interface HowToPlayScreenProps {
  onClose: () => void;
}

function Step({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4 pb-6" style={{ borderBottom: '1px solid #120e0a' }}>
      <div className="flex-shrink-0">
        <div className="font-mono text-[8px] tracking-[0.3em] uppercase" style={{ color: '#2a2418' }}>step</div>
        <div style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: '2rem', color: '#C53A1E', lineHeight: 1 }}>{num}</div>
      </div>
      <div className="flex-1 pt-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: '#e8c89a' }}>{title}</div>
        <div className="flex flex-col gap-2">{children}</div>
      </div>
    </div>
  );
}

function Tip({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex gap-3 py-3 px-3" style={{ background: '#100c08', border: '1px solid #1e1a15' }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
      <div>
        <div className="font-mono text-[9px] uppercase tracking-widest mb-1" style={{ color: '#e8c89a' }}>{title}</div>
        <p className="font-serif italic text-xs leading-relaxed" style={{ color: '#4a3a28' }}>{body}</p>
      </div>
    </div>
  );
}

export function HowToPlayScreen({ onClose }: HowToPlayScreenProps) {
  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto overflow-y-auto"
      style={{ background: '#0d0907', color: '#F2EFE9' }}
    >
      <style>{`
        @keyframes htpFade { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4"
        style={{ background: '#0d0907', borderBottom: '1px solid #1a1510' }}>
        <div>
          <div className="font-mono text-[8px] tracking-[0.45em] uppercase" style={{ color: '#3a3020' }}>how to play</div>
        </div>
        <button onClick={onClose}
          className="font-mono text-xs uppercase tracking-widest"
          style={{ color: '#5C5547', borderBottom: '1px solid #2a2418', paddingBottom: 1 }}
          onMouseEnter={e => { e.currentTarget.style.color = '#F2EFE9'; e.currentTarget.style.borderBottomColor = '#F2EFE9'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#5C5547'; e.currentTarget.style.borderBottomColor = '#2a2418'; }}>
          ← back
        </button>
      </header>

      <main className="flex flex-col" style={{ animation: 'htpFade 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>

        {/* Intro */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <h1 style={{ fontFamily: 'serif', fontStyle: 'italic', fontSize: 'clamp(1.8rem, 8vw, 2.8rem)', lineHeight: 1.1, color: '#F2EFE9', marginBottom: '1rem' }}>
            Your first<br />30 seconds.
          </h1>
          <p className="font-serif italic text-sm leading-relaxed mb-4" style={{ color: '#5C5547' }}>
            You don't need to understand the whole game. Just follow these steps and something real will happen.
          </p>
          {/* Core loop visual */}
          <div className="flex items-center gap-2 flex-wrap">
            {['Write', '→', 'Choose', '→', 'Charge', '→', 'Release', '→', 'Shatter'].map((t, i) => (
              <span key={i} className={t === '→' ? 'font-mono text-xs' : 'font-mono text-[9px] uppercase tracking-widest px-2 py-1'}
                style={{
                  color: t === '→' ? '#2a2418' : '#e8c89a',
                  background: t === '→' ? 'transparent' : '#1a1510',
                  border: t === '→' ? 'none' : '1px solid #2a2418',
                }}>
                {t}
              </span>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="px-6 py-8 flex flex-col gap-6" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: '#3a3020' }}>
            ◆ the steps
          </div>

          <Step num="01" title="Enter your name">
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              On the opening screen, type any name — your real name, a username, anything. Press "begin the journey" to enter.
            </p>
          </Step>

          <Step num="02" title="Write the message">
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              In the <span style={{ color: '#e8c89a' }}>— to</span> field: who is this for? A person, a feeling, the universe. You can leave it blank.
            </p>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              In the <span style={{ color: '#e8c89a' }}>— the unsaid</span> field: write what you never said. One word or a hundred. There's no wrong answer.
            </p>
            <div className="font-mono text-[8px] uppercase tracking-widest py-2 px-3" style={{ background: '#1a1510', color: '#3a3020' }}>
              Pro tip: write in ALL CAPS to activate Rage Mode — fragments glow red and shatter more violently.
            </div>
          </Step>

          <Step num="03" title="Choose your realm">
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              You start in <span style={{ color: '#8C8473' }}>◈ The Wasteland</span> (Classic mode). As you release more messages, new realms unlock — each with different physics, colors, and atmosphere.
            </p>
            <div className="flex flex-col gap-1 mt-1">
              {ZONES.map(z => (
                <div key={z.id} className="flex items-center gap-2">
                  <span style={{ color: z.color, fontSize: 11 }}>{z.symbol}</span>
                  <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: z.color }}>{z.name}</span>
                  <span className="font-mono text-[7px]" style={{ color: '#2a2418' }}>
                    {z.unlockAt > 0 ? `unlocks at ${z.unlockAt}` : 'starter'}
                  </span>
                </div>
              ))}
            </div>
          </Step>

          <Step num="04" title="Hold to charge">
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              Once you've written something, the <span style={{ color: '#C53A1E' }}>Let it go →</span> button appears. Press and hold it. Watch the charge bar fill.
            </p>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              The longer you hold, the more powerful the shatter. Full charge (100%) creates maximum explosion force.
            </p>
            <div className="font-mono text-[8px] py-2 px-3" style={{ background: '#1a1510', color: '#3a3020' }}>
              Charge bar fills in ~2 seconds. At 50% you'll feel a vibration. At 80% the button text changes to RELEASE NOW.
            </div>
          </Step>

          <Step num="05" title="Release">
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              Lift your finger. The message shatters into 3D fragments and scatters into nothing. They're gone. Not sent. Just... released.
            </p>
            <p className="font-serif italic text-sm leading-relaxed" style={{ color: '#4a3a28' }}>
              You'll earn XP and see your results. Then you can write another — or close the app and carry a little less.
            </p>
          </Step>
        </section>

        {/* Systems */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-6" style={{ color: '#3a3020' }}>
            ◆ the systems
          </div>
          <div className="flex flex-col gap-4">

            <div style={{ border: '1px solid #1e1a15', background: '#100c08' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a1510' }}>
                <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#C53A1E' }}>
                  ⚡ Rage Mode
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="font-serif italic text-xs leading-relaxed" style={{ color: '#4a3a28' }}>
                  Type your message in CAPS — or use a Rage Crystal from your inventory. In rage mode, fragments glow red and shatter with extra violence. You get bonus XP and a special animation. It's cathartic.
                </p>
              </div>
            </div>

            <div style={{ border: '1px solid #1e1a15', background: '#100c08' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a1510' }}>
                <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#e8c89a' }}>
                  ◆ Boss Battles
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="font-serif italic text-xs leading-relaxed mb-2" style={{ color: '#4a3a28' }}>
                  Every 5th release triggers a boss encounter. A shadow named after your unspoken feelings stands between you and progress. You'll see their name and lore before you release.
                </p>
                <p className="font-serif italic text-xs leading-relaxed" style={{ color: '#4a3a28' }}>
                  To defeat a boss, charge past their required threshold (shown in the alert). Defeat them and earn +200 XP plus a rare item. Fail and they remain for next time.
                </p>
              </div>
            </div>

            <div style={{ border: '1px solid #1e1a15', background: '#100c08' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a1510' }}>
                <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#e8c89a' }}>
                  ◆ Quest System
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="font-serif italic text-xs leading-relaxed mb-2" style={{ color: '#4a3a28' }}>
                  13 quests organized into 6 chapters tell the story of your emotional journey. Each quest has a clear objective — use a specific mode, reach a streak, charge to full power.
                </p>
                <p className="font-serif italic text-xs leading-relaxed" style={{ color: '#4a3a28' }}>
                  Your active quest is shown on the compose screen. Complete it for bonus XP and sometimes a rare item.
                </p>
              </div>
            </div>

            <div style={{ border: '1px solid #1e1a15', background: '#100c08' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a1510' }}>
                <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#e8c89a' }}>
                  ◆ Item Inventory
                </div>
              </div>
              <div className="px-4 py-3">
                <div className="flex flex-col gap-2">
                  {[
                    { icon: '◉', name: 'Rage Crystal', rarity: 'common', desc: 'Auto-activates rage mode for your next release.' },
                    { icon: '⚡', name: 'Charge Amplifier', rarity: 'rare', desc: 'Your charge fills 2× faster — reach 100% in about a second.' },
                    { icon: '◎', name: 'Echo Stone', rarity: 'rare', desc: 'Doubles the fragment count on release — more chaos, more catharsis.' },
                    { icon: '◌', name: 'Void Shard', rarity: 'legendary', desc: 'Fragments defy gravity and rise upward instead of falling.' },
                  ].map(item => (
                    <div key={item.name} className="flex gap-2 items-start">
                      <span style={{ fontSize: 13, flexShrink: 0 }}>{item.icon}</span>
                      <div>
                        <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: '#e8c89a' }}>{item.name} </span>
                        <span className="font-mono text-[7px] uppercase" style={{ color: item.rarity === 'legendary' ? '#8855ff' : item.rarity === 'rare' ? '#7ab8d4' : '#5C5547' }}>[{item.rarity}]</span>
                        <p className="font-serif italic text-xs" style={{ color: '#3a3020' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="font-serif italic text-xs mt-3" style={{ color: '#2a2418' }}>
                  Tap an item slot on the compose screen to activate it before releasing. It's consumed after use.
                </p>
              </div>
            </div>

            <div style={{ border: '1px solid #1e1a15', background: '#100c08' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #1a1510' }}>
                <div className="font-mono text-[9px] uppercase tracking-widest" style={{ color: '#e8c89a' }}>
                  ◆ XP & Levels
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="font-serif italic text-xs leading-relaxed mb-2" style={{ color: '#4a3a28' }}>
                  Every release earns XP based on how much you wrote, how long you charged, whether you were in rage mode, and your streak. 11 levels to climb, each with its own title.
                </p>
                <p className="font-serif italic text-xs leading-relaxed" style={{ color: '#4a3a28' }}>
                  Combo: release multiple messages within 60 seconds for an XP multiplier. Daily challenges give +50 XP bonus.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pro Tips */}
        <section className="px-6 py-8" style={{ borderBottom: '1px solid #120e0a' }}>
          <div className="font-mono text-[9px] tracking-[0.4em] uppercase mb-5" style={{ color: '#3a3020' }}>
            ◆ pro tips
          </div>
          <div className="flex flex-col gap-3">
            <Tip icon="◈" title="Daily Challenge" body="A new prompt appears every day — a theme or question to write to. Using it gives you +50 XP. Over time these stack into streaks that unlock achievements." />
            <Tip icon="⚡" title="Combo Window" body="Release multiple messages within 60 seconds of each other to build a combo multiplier. The counter shows in your header. Fast, consecutive releases = more XP per release." />
            <Tip icon="◉" title="Full Charge = More Everything" body="Releasing at 100% charge gives a bigger explosion, more XP, and counts toward the 'Full Charge' quest. Hold until the button says RELEASE NOW, then let go." />
            <Tip icon="◌" title="The Map Is Your Guide" body="Tap 'map' in the header to see all six realms and your boss progress. You can also switch your active realm directly from the map — tap any unlocked zone." />
            <Tip icon="◷" title="Slow-Mo For Heavy Things" body="When you have something particularly heavy to say, try Slow-Mo mode. The shatter happens at 0.3× speed and the fragments drift longer. It changes the feeling completely." />
          </div>
        </section>

        {/* Final note */}
        <section className="px-6 py-10">
          <p className="font-serif italic text-base leading-relaxed" style={{ color: '#4a3a28' }}>
            There's no wrong way to play this. There's no leaderboard. No one sees your messages. The only goal is to mean it when you type it — and feel something when it breaks.
          </p>
          <div className="mt-6 font-mono text-[8px] uppercase tracking-widest" style={{ color: '#2a2418' }}>
            — unsend games studio
          </div>
        </section>

      </main>
    </div>
  );
}
