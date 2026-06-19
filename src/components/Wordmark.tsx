import React from 'react';

export function Wordmark() {
  return (
    <div className="font-serif italic text-2xl tracking-tight select-none">
      <span className="text-accent">un</span>
      <span className="text-foreground relative">
        send
        <span className="absolute top-1/2 left-0 w-full h-[1px] bg-foreground block transform -translate-y-1/2"></span>
      </span>
    </div>
  );
}
