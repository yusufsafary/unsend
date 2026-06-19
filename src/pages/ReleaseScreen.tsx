import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface ReleaseScreenProps {
  message: string;
  onComplete: () => void;
  onClose: () => void;
}

const CLOSURE_LINES = [
  "It is done.",
  "The space is yours again.",
  "No response needed.",
  "Silence is an answer.",
  "Let the ink dry."
];

interface Fragment {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  glowIntensity: number;
}

export function ReleaseScreen({ message, onComplete, onClose }: ReleaseScreenProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number>(0);
  const fragmentsRef = useRef<Fragment[]>([]);
  const shatteringRef = useRef(false);
  const [shatterStage, setShatterStage] = useState<'idle' | 'shattering' | 'done'>('idle');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const closureLine = useMemo(() => CLOSURE_LINES[Math.floor(Math.random() * CLOSURE_LINES.length)], []);

  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x16140F, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Lighting — single hard directional light, editorial
    const dirLight = new THREE.DirectionalLight(0xF2EFE9, 3);
    dirLight.position.set(-4, 6, 5);
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x16140F, 0.5);
    fillLight.position.set(4, -2, 3);
    scene.add(fillLight);

    // Build message plane from Voronoi-like irregular fragments
    // We use a grid-based approach with randomized offsets for irregular look
    const COLS = 7;
    const ROWS = 9;
    const PW = 5.0;
    const PH = 6.5;
    const CW = PW / COLS;
    const CH = PH / ROWS;

    const BONE = new THREE.Color(0xF2EFE9);
    const CARBON = new THREE.Color(0x16140F);
    const CLAY = new THREE.Color(0xC53A1E);

    // Create canvas texture with the message text
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 512;
    texCanvas.height = 640;
    const ctx = texCanvas.getContext('2d')!;
    ctx.fillStyle = '#F2EFE9';
    ctx.fillRect(0, 0, 512, 640);
    ctx.fillStyle = '#16140F';
    ctx.font = 'italic 22px "Newsreader", Georgia, serif';
    ctx.textAlign = 'left';
    // Word wrap
    const words = message.split(' ');
    let line = '';
    const lines: string[] = [];
    const maxWidth = 460;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    const lineH = 34;
    const totalH = lines.length * lineH;
    const startY = (640 - totalH) / 2 + 22;
    lines.forEach((l, i) => {
      ctx.fillText(l, 26, startY + i * lineH);
    });
    const texture = new THREE.CanvasTexture(texCanvas);

    const fragments: Fragment[] = [];

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Irregular offsets for Voronoi feel
        const jitter = 0.05;
        const ox = (Math.random() - 0.5) * jitter;
        const oy = (Math.random() - 0.5) * jitter;
        const sw = CW * (0.88 + Math.random() * 0.12);
        const sh = CH * (0.88 + Math.random() * 0.12);

        const x = -PW / 2 + col * CW + CW / 2 + ox;
        const y = -PH / 2 + row * CH + CH / 2 + oy;

        // UV for this fragment
        const u0 = col / COLS;
        const v0 = row / ROWS;
        const u1 = (col + 1) / COLS;
        const v1 = (row + 1) / ROWS;

        const geo = new THREE.PlaneGeometry(sw, sh);
        // Remap UVs
        const uvAttr = geo.attributes.uv;
        const uvData = [u0, v1, u1, v1, u0, v0, u1, v0];
        for (let i = 0; i < 4; i++) {
          uvAttr.setXY(i, uvData[i * 2], uvData[i * 2 + 1]);
        }
        uvAttr.needsUpdate = true;

        const isEdge = col === 0 || col === COLS - 1 || row === 0 || row === ROWS - 1;
        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          color: isEdge ? BONE : BONE,
          metalness: 0.0,
          roughness: 0.9,
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, 0);
        scene.add(mesh);

        const speed = 0.4 + Math.random() * 0.6;
        fragments.push({
          mesh,
          vx: (Math.random() - 0.5) * speed * 2,
          vy: -(0.5 + Math.random() * 1.5) * speed,
          vz: (Math.random() - 0.5) * speed * 0.5,
          rx: (Math.random() - 0.5) * 0.06,
          ry: (Math.random() - 0.5) * 0.06,
          rz: (Math.random() - 0.5) * 0.04,
          glowIntensity: 1.0,
        });
      }
    }

    // Thin clay fracture lines overlay
    const crackMat = new THREE.LineBasicMaterial({ color: CLAY, transparent: true, opacity: 0 });
    const crackLines: THREE.Line[] = [];
    for (let i = 0; i < 12; i++) {
      const pts = [];
      const sx = (Math.random() - 0.5) * PW;
      const sy = (Math.random() - 0.5) * PH;
      pts.push(new THREE.Vector3(sx, sy, 0.01));
      pts.push(new THREE.Vector3(sx + (Math.random() - 0.5) * 1.5, sy + (Math.random() - 0.5) * 1.5, 0.01));
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(geo, crackMat.clone());
      scene.add(line);
      crackLines.push(line);
    }

    fragmentsRef.current = fragments;

    let elapsed = 0;
    let crackElapsed = 0;
    let fallElapsed = 0;
    let phase: 'reading' | 'cracking' | 'falling' | 'done' = 'reading';

    // Camera z drift — very slight push-in
    const cameraDrift = { z: 8, target: 7.5 };

    const animate = (dt: number) => {
      elapsed += dt;

      // Gentle camera push-in
      cameraDrift.z += (cameraDrift.target - cameraDrift.z) * 0.002;
      camera.position.z = cameraDrift.z;

      if (phase === 'reading' && elapsed > 1.5) {
        phase = 'cracking';
        crackElapsed = 0;
        shatteringRef.current = true;
        // Flash crack lines
        crackLines.forEach(l => {
          (l.material as THREE.LineBasicMaterial).opacity = 1.0;
        });
      }

      if (phase === 'cracking') {
        crackElapsed += dt;
        const t = Math.min(crackElapsed / 0.45, 1);
        // Fade crack glow
        crackLines.forEach(l => {
          (l.material as THREE.LineBasicMaterial).opacity = (1 - t) * 0.9;
        });
        // Slight fragment tremble
        fragments.forEach(f => {
          f.mesh.rotation.z += Math.sin(crackElapsed * 30 + f.mesh.position.x) * 0.001;
        });
        if (crackElapsed > 0.45) {
          phase = 'falling';
          fallElapsed = 0;
        }
      }

      if (phase === 'falling') {
        fallElapsed += dt;
        fragments.forEach(f => {
          // Gravity
          f.vy -= dt * 4.5;
          f.mesh.position.x += f.vx * dt;
          f.mesh.position.y += f.vy * dt;
          f.mesh.position.z += f.vz * dt;
          f.mesh.rotation.x += f.rx;
          f.mesh.rotation.y += f.ry;
          f.mesh.rotation.z += f.rz;
          // Fade out as they fall
          const mat = f.mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = Math.max(0, 1 - Math.max(0, f.mesh.position.y + PH / 2) * -0.15);
          mat.transparent = true;
        });

        if (fallElapsed > 2.2 && phase !== 'done') {
          phase = 'done';
          setShatterStage('done');
          onComplete();
        }
      }

      renderer.render(scene, camera);
    };

    let lastTime = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!prefersReducedMotion) {
        animate(dt);
      } else {
        // Reduced motion: quick fade
        elapsed += dt;
        if (elapsed > 0.5) {
          fragments.forEach(f => {
            const mat = f.mesh.material as THREE.MeshStandardMaterial;
            mat.opacity = Math.max(0, mat.opacity - dt * 1.5);
            mat.transparent = true;
          });
          if (elapsed > 1.2) {
            setShatterStage('done');
            onComplete();
          }
        }
        renderer.render(scene, camera);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    const handleResize = () => {
      const nW = container.clientWidth;
      const nH = container.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      texture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      fragments.forEach(f => {
        f.mesh.geometry.dispose();
        (f.mesh.material as THREE.Material).dispose();
      });
    };
  }, [message, prefersReducedMotion, onComplete]);

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#16140F' }}>
      <div ref={canvasRef} className="absolute inset-0 z-0" />

      {shatterStage === 'done' && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6"
          style={{ background: 'rgba(22,20,15,0.92)', animation: 'fadeInUp 0.6s ease forwards' }}>
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(12px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          <h2
            className="font-serif italic text-center max-w-[380px] leading-tight"
            style={{ fontSize: 'clamp(2rem, 8vw, 3.5rem)', color: '#F2EFE9', marginBottom: '4rem' }}
          >
            {closureLine}
          </h2>
          <div style={{ display: 'flex', gap: '3rem' }}>
            <button
              onClick={onClose}
              className="font-mono text-xs uppercase tracking-widest transition-colors"
              style={{ color: '#8C8473', borderBottom: '1px solid transparent', paddingBottom: '2px' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#F2EFE9'; (e.target as HTMLElement).style.borderBottomColor = '#F2EFE9'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#8C8473'; (e.target as HTMLElement).style.borderBottomColor = 'transparent'; }}
              data-testid="button-write-another"
            >
              Write another
            </button>
            <button
              onClick={() => { localStorage.removeItem('unsend_user'); localStorage.removeItem('unsend_count'); window.location.reload(); }}
              className="font-mono text-xs uppercase tracking-widest transition-colors"
              style={{ color: '#8C8473', borderBottom: '1px solid transparent', paddingBottom: '2px' }}
              onMouseEnter={e => { (e.target as HTMLElement).style.color = '#F2EFE9'; (e.target as HTMLElement).style.borderBottomColor = '#F2EFE9'; }}
              onMouseLeave={e => { (e.target as HTMLElement).style.color = '#8C8473'; (e.target as HTMLElement).style.borderBottomColor = 'transparent'; }}
              data-testid="button-done"
            >
              Done for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
