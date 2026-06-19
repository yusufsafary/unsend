import React, { useState } from 'react';
import { Wordmark } from '../components/Wordmark';

interface ComposeScreenProps {
  username: string;
  count: number;
  onLogout: () => void;
  onRelease: (message: string) => void;
}

export function ComposeScreen({ username, count, onLogout, onRelease }: ComposeScreenProps) {
  const [who, setWho] = useState('');
  const [message, setMessage] = useState('');

  const handleRelease = () => {
    if (message.trim()) {
      onRelease(message.trim());
    }
  };

  const isEnabled = message.trim().length > 0;

  return (
    <div className="min-h-[100dvh] w-full flex flex-col max-w-[430px] mx-auto">
      <header className="flex justify-between items-center p-6 border-b border-border">
        <Wordmark />
        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-muted-foreground" data-testid="text-count">
            Released: {count}
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

      <main className="flex-1 flex flex-col p-6 gap-12">
        <section className="flex flex-col gap-4 mt-8">
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
          <label className="text-xs font-mono text-muted-foreground tracking-widest uppercase">
            02 — WHAT
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write what you never sent."
            className="w-full flex-1 min-h-[200px] bg-transparent border-b border-border focus:border-foreground pb-2 text-lg md:text-xl font-serif leading-relaxed outline-none transition-colors rounded-none resize-none placeholder:text-muted-foreground placeholder:italic"
            data-testid="input-message"
          />
        </section>

        <button
          onClick={handleRelease}
          disabled={!isEnabled}
          className={`pb-12 text-left font-serif italic text-4xl md:text-5xl transition-colors ${
            isEnabled ? 'text-accent hover:opacity-80' : 'text-border cursor-not-allowed'
          }`}
          data-testid="button-release"
        >
          Let it go →
        </button>
      </main>
    </div>
  );
}
