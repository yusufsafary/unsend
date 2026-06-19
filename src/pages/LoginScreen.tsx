import React, { useState } from 'react';
import { Wordmark } from '../components/Wordmark';

interface LoginScreenProps {
  onLogin: (username: string) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col p-6 md:p-12 max-w-[430px] mx-auto">
      <header className="mb-auto">
        <Wordmark />
      </header>

      <main className="flex flex-col gap-12 mb-auto mt-24">
        <h1 className="font-serif italic text-4xl md:text-5xl leading-[1.1] text-foreground">
          Some words were meant to be written,<br />
          but never read.
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-transparent border-b border-border focus:border-foreground pb-2 text-base font-mono outline-none transition-colors rounded-none placeholder:text-muted-foreground"
              required
              data-testid="input-username"
            />
            <span className="text-xs text-muted-foreground font-mono">Demo mode — no password needed.</span>
          </div>

          <button
            type="submit"
            className="bg-foreground text-background font-mono py-4 px-6 text-sm uppercase tracking-widest hover:bg-background hover:text-foreground border border-transparent hover:border-foreground transition-colors duration-0 rounded-none w-full"
            data-testid="button-login"
          >
            Continue
          </button>
        </form>
      </main>
    </div>
  );
}
