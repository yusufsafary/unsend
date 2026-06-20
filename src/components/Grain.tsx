export function Grain() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        pointerEvents: 'none', overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', inset: '-100%',
        width: '300%', height: '300%',
        opacity: 0.042,
        animation: 'grain 0.38s steps(1) infinite',
        backgroundImage: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.78' numOctaves='4' stitchTiles='stitch'/></filter><rect width='220' height='220' filter='url(%23n)'/></svg>")`,
        willChange: 'transform',
      }} />
    </div>
  );
}
