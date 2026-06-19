import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface ReleaseScreenProps {
  message: string;
  chargeLevel: number;   // 0-100
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

// ---------- Voronoi helpers ----------
function seededRandom(seed: number) {
  let s = seed + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function clipPolygon(poly: number[][], nx: number, ny: number, d: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = a[0] * nx + a[1] * ny - d, db = b[0] * nx + b[1] * ny - d;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

function voronoiCell(sites: number[][], i: number, b: number[]): number[][] {
  let poly: number[][] = [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]];
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue;
    const mx = (sites[i][0] + sites[j][0]) / 2, my = (sites[i][1] + sites[j][1]) / 2;
    const nx = sites[j][0] - sites[i][0], ny = sites[j][1] - sites[i][1];
    poly = clipPolygon(poly, nx, ny, mx * nx + my * ny);
    if (!poly.length) break;
  }
  return poly;
}

function triangulatePoly(poly: number[][]): number[] {
  const v: number[] = [];
  for (let i = 1; i < poly.length - 1; i++) {
    v.push(poly[0][0], poly[0][1], 0, poly[i][0], poly[i][1], 0, poly[i+1][0], poly[i+1][1], 0);
  }
  return v;
}

function centroid(poly: number[][]): [number, number] {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p[0]; cy += p[1]; }
  return [cx / poly.length, cy / poly.length];
}

// ---------- Audio ----------
function playCrackSound(intensity: number) {
  try {
    const ctx = new AudioContext();
    const vol = 0.3 + intensity * 0.007;
    const pitchBias = 0.5 + intensity * 0.005;

    const bufLen = Math.floor(ctx.sampleRate * (0.1 + intensity * 0.001));
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.5) * (1 + Math.sin(i * pitchBias * 0.12)) * vol;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400 + intensity * 4;
    const gain = ctx.createGain(); gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    src.connect(hp); hp.connect(gain); gain.connect(ctx.destination); src.start();

    // Bass thud — heavier at high charge
    if (intensity > 30) {
      const bl = Math.floor(ctx.sampleRate * 0.4);
      const bb = ctx.createBuffer(1, bl, ctx.sampleRate);
      const bd = bb.getChannelData(0);
      for (let i = 0; i < bl; i++) {
        const t = i / bl;
        bd[i] = Math.sin(2 * Math.PI * (55 + intensity * 0.3) * (i / ctx.sampleRate)) * Math.pow(1 - t, 1.8) * (vol * 0.7);
      }
      const bs = ctx.createBufferSource(); bs.buffer = bb;
      const bg = ctx.createGain(); bg.gain.setValueAtTime(vol * 0.8, ctx.currentTime);
      bg.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      bs.connect(bg); bg.connect(ctx.destination); bs.start(ctx.currentTime + 0.01);
    }
  } catch { /* silence */ }
}

// ---------- Types ----------
interface FragData {
  mesh: THREE.Mesh;
  cx: number; cy: number;
  vx: number; vy: number; vz: number;
  rx: number; ry: number; rz: number;
  delay: number;
}

interface UserCrack {
  points: [number, number][];
  line: THREE.Mesh | null;
}

// ---------- Component ----------
export function ReleaseScreen({ message, chargeLevel, onComplete, onClose }: ReleaseScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasOverlayRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<'drawing' | 'cracking' | 'falling' | 'done'>('drawing');
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [drawHint, setDrawHint] = useState(true);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const closureLine = useMemo(() => CLOSURE_LINES[Math.floor(Math.random() * CLOSURE_LINES.length)], []);

  // Intensity derived from charge
  const intensity = Math.max(chargeLevel, 10);
  const nFragments = Math.round(28 + intensity * 0.22);    // 28–50 fragments
  const particleCount = Math.round(180 + intensity * 2.2); // 180–400 particles
  const shakeStrength = 0.08 + intensity * 0.0022;
  const baseSpeed = 0.6 + intensity * 0.022;

  // User-drawn cracks (on 2D canvas overlay)
  const userCracksRef = useRef<UserCrack[]>([]);
  const isDrawingRef = useRef(false);
  const currentCrackRef = useRef<[number, number][]>([]);
  const autoTriggerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const overlay = canvasOverlayRef.current;
    if (!container || !overlay) return;

    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;
    overlay.width = W;
    overlay.height = H;

    // ---------- Three.js Setup ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x16140F, 1);
    container.insertBefore(renderer.domElement, overlay);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x16140F, 0.09);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 9);

    // Lights
    const mainLight = new THREE.DirectionalLight(0xF2EFE9, 4);
    mainLight.position.set(-5, 8, 5);
    scene.add(mainLight);
    const rimLight = new THREE.DirectionalLight(0xC53A1E, 0);
    rimLight.position.set(6, -4, 2);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0x16140F, 0.5));
    const flashLight = new THREE.PointLight(0xC53A1E, 0, 10);
    flashLight.position.set(0, 0, 4);
    scene.add(flashLight);

    // ---------- Message texture ----------
    const tc = document.createElement('canvas');
    tc.width = 640; tc.height = 800;
    const tx = tc.getContext('2d')!;
    tx.fillStyle = '#F2EFE9'; tx.fillRect(0, 0, 640, 800);
    for (let i = 0; i < 2500; i++) {
      tx.fillStyle = `rgba(22,20,15,${Math.random() * 0.025})`;
      tx.fillRect(Math.random() * 640, Math.random() * 800, 1, 1);
    }
    tx.fillStyle = '#16140F';
    tx.font = 'italic 500 24px "Newsreader", Georgia, serif';
    tx.textAlign = 'left';
    const words = message.split(' ');
    let line = '', lines: string[] = [];
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (tx.measureText(test).width > 575 && line) { lines.push(line); line = w; }
      else line = test;
    }
    if (line) lines.push(line);
    const lh = 40, totalH = lines.length * lh;
    const sy = (800 - totalH) / 2 + 26;
    lines.forEach((l, i) => tx.fillText(l, 30, sy + i * lh));
    tx.strokeStyle = '#8C8473'; tx.lineWidth = 1; tx.strokeRect(16, 16, 608, 768);

    // Charge level watermark
    if (chargeLevel > 10) {
      tx.fillStyle = `rgba(197,58,30,${Math.min(chargeLevel / 200, 0.15)})`;
      tx.font = `bold ${80 + chargeLevel}px "Space Mono", monospace`;
      tx.textAlign = 'center';
      tx.fillText(`${Math.round(chargeLevel)}%`, 320, 440);
    }

    const msgTex = new THREE.CanvasTexture(tc);
    const PW = 5.2, PH = 6.8;

    // ---------- Voronoi fragments ----------
    const rng = seededRandom(message.length * 31 + chargeLevel);
    const bounds = [-PW / 2, -PH / 2, PW / 2, PH / 2];
    const sites: number[][] = [];
    for (let i = 0; i < nFragments; i++) {
      sites.push([bounds[0] + rng() * PW, bounds[1] + rng() * PH]);
    }

    const fragments: FragData[] = [];
    for (let i = 0; i < nFragments; i++) {
      const poly = voronoiCell(sites, i, bounds);
      if (poly.length < 3) continue;
      const [cx, cy] = centroid(poly);
      const verts = triangulatePoly(poly);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3));
      const uvs = new Float32Array(verts.length / 3 * 2);
      for (let v = 0; v < verts.length / 3; v++) {
        uvs[v * 2] = (verts[v * 3] - bounds[0]) / PW;
        uvs[v * 2 + 1] = (verts[v * 3 + 1] - bounds[1]) / PH;
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        map: msgTex, color: new THREE.Color(0xF2EFE9),
        roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      scene.add(mesh);

      const angle = Math.atan2(cy, cx);
      const spd = baseSpeed * (0.5 + rng() * 1.2);
      fragments.push({
        mesh, cx, cy,
        vx: Math.cos(angle) * spd * (0.5 + rng()) + (rng() - 0.5) * 0.8,
        vy: Math.sin(angle) * spd * 0.3 - (0.6 + rng() * 2.2) * (intensity / 60),
        vz: (rng() - 0.5) * 1.4,
        rx: (rng() - 0.5) * 0.13,
        ry: (rng() - 0.5) * 0.13,
        rz: (rng() - 0.5) * 0.09,
        delay: Math.sqrt(cx * cx + cy * cy) * 0.06 + rng() * 0.04,
      });
    }

    // ---------- Three.js crack lines ----------
    const crackMeshes: THREE.Mesh[] = [];
    const crackAngles = Array.from({ length: 9 }, (_, i) => i * (Math.PI * 2 / 9) + rng() * 0.4);
    crackAngles.forEach(a => {
      const len = 1.4 + rng() * 2.2;
      const makeSegment = (x1: number, y1: number, x2: number, y2: number, w: number) => {
        const segLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const g = new THREE.PlaneGeometry(segLen, w);
        const m = new THREE.MeshBasicMaterial({
          color: 0xC53A1E, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0.05);
        mesh.rotation.z = Math.atan2(y2 - y1, x2 - x1);
        scene.add(mesh);
        crackMeshes.push(mesh);
      };
      makeSegment(0, 0, Math.cos(a) * len, Math.sin(a) * len, 0.018 + rng() * 0.015);
      const bA = a + (rng() - 0.5) * 0.9;
      const bLen = 0.4 + rng() * 0.9;
      const bx = Math.cos(a) * len * 0.55, by = Math.sin(a) * len * 0.55;
      makeSegment(bx, by, bx + Math.cos(bA) * bLen, by + Math.sin(bA) * bLen, 0.01);
    });

    // ---------- Particles ----------
    const pPositions = new Float32Array(particleCount * 3);
    const pVelocities: [number, number, number][] = [];
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (rng() - 0.5) * PW;
      pPositions[i * 3 + 1] = (rng() - 0.5) * PH;
      pPositions[i * 3 + 2] = 0.2;
      const a = rng() * Math.PI * 2, spd = (0.4 + rng() * 5.5) * (intensity / 60);
      pVelocities.push([Math.cos(a) * spd, Math.sin(a) * spd - rng() * 1.5, (rng() - 0.5) * 2]);
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions.slice(), 3));
    const pMat = new THREE.PointsMaterial({ color: 0xF2EFE9, size: 0.055, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const pGeo2 = new THREE.BufferGeometry();
    pGeo2.setAttribute('position', new THREE.BufferAttribute(pPositions.slice(), 3));
    const pMat2 = new THREE.PointsMaterial({ color: 0xC53A1E, size: 0.038, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Points(pGeo, pMat));
    scene.add(new THREE.Points(pGeo2, pMat2));

    // ---------- Ash rain (post-shatter) ----------
    const ashCount = 120 + Math.round(intensity * 1.2);
    const ashPositions = new Float32Array(ashCount * 3);
    const ashVelocities: [number, number, number][] = [];
    for (let i = 0; i < ashCount; i++) {
      ashPositions[i * 3] = (rng() - 0.5) * 10;
      ashPositions[i * 3 + 1] = 5 + rng() * 4;
      ashPositions[i * 3 + 2] = (rng() - 0.5) * 3;
      ashVelocities.push([(rng() - 0.5) * 0.15, -(0.2 + rng() * 0.5), (rng() - 0.5) * 0.05]);
    }
    const ashGeo = new THREE.BufferGeometry();
    ashGeo.setAttribute('position', new THREE.BufferAttribute(ashPositions, 3));
    const ashMat = new THREE.PointsMaterial({ color: 0x3a3530, size: 0.04, transparent: true, opacity: 0, depthWrite: false });
    const ashPoints = new THREE.Points(ashGeo, ashMat);
    scene.add(ashPoints);

    // ---------- Animation state ----------
    type Phase = 'drawing' | 'cracking' | 'falling' | 'done';
    let phase: Phase = 'drawing';
    let phaseT = 0, totalT = 0, fallT = 0;
    let cameraShakeX = 0, cameraShakeY = 0, shakeT = 0, shakeActive = false;

    const triggerShatter = () => {
      if (phase !== 'drawing' && phase !== 'cracking') return;
      if (autoTriggerRef.current) { clearTimeout(autoTriggerRef.current); autoTriggerRef.current = null; }
      phase = 'cracking';
      phaseT = 0;
      setStage('cracking');
      setDrawHint(false);
    };

    // Store triggerShatter for the 2D overlay event handlers
    (window as unknown as Record<string, unknown>).__unsendTrigger = triggerShatter;

    // Auto-trigger countdown (3.5 seconds drawing window)
    autoTriggerRef.current = setTimeout(triggerShatter, 3500);

    // ---------- 2D overlay (crack drawing) ----------
    const oc = overlay.getContext('2d')!;
    const getPos = (e: PointerEvent): [number, number] => {
      const rect = overlay.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onPointerDown = (e: PointerEvent) => {
      if (phase !== 'drawing') return;
      isDrawingRef.current = true;
      currentCrackRef.current = [getPos(e)];
      setDrawHint(false);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!isDrawingRef.current || phase !== 'drawing') return;
      const pos = getPos(e);
      currentCrackRef.current.push(pos);
      // Draw on overlay
      oc.clearRect(0, 0, W, H);
      // Redraw existing cracks
      for (const crack of userCracksRef.current) {
        if (crack.points.length < 2) continue;
        oc.beginPath();
        oc.strokeStyle = 'rgba(197,58,30,0.7)';
        oc.lineWidth = 1.5;
        oc.shadowColor = '#C53A1E';
        oc.shadowBlur = 6;
        oc.moveTo(crack.points[0][0], crack.points[0][1]);
        for (let p = 1; p < crack.points.length; p++) oc.lineTo(crack.points[p][0], crack.points[p][1]);
        oc.stroke();
      }
      // Current crack
      const cur = currentCrackRef.current;
      if (cur.length > 1) {
        oc.beginPath();
        oc.strokeStyle = 'rgba(197,58,30,0.85)';
        oc.lineWidth = 1.5;
        oc.shadowColor = '#C53A1E';
        oc.shadowBlur = 8;
        oc.moveTo(cur[0][0], cur[0][1]);
        for (let p = 1; p < cur.length; p++) oc.lineTo(cur[p][0], cur[p][1]);
        oc.stroke();
      }
    };
    const onPointerUp = () => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      if (currentCrackRef.current.length > 1) {
        userCracksRef.current.push({ points: [...currentCrackRef.current], line: null });
      }
      currentCrackRef.current = [];
    };

    overlay.addEventListener('pointerdown', onPointerDown);
    overlay.addEventListener('pointermove', onPointerMove);
    overlay.addEventListener('pointerup', onPointerUp);

    // ---------- Render loop ----------
    let animId: number;
    const CRACK_DUR = 0.5;
    const FALL_DUR = 3.0 + intensity * 0.012;

    let lastNow = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      totalT += dt;
      phaseT += dt;

      // Camera
      const driftZ = 9 - (0.8 * Math.min(totalT / 4, 1));
      camera.position.z = driftZ;
      if (shakeActive) {
        shakeT += dt;
        const decay = Math.max(0, 1 - shakeT / 0.55);
        cameraShakeX = (Math.random() - 0.5) * shakeStrength * 2 * decay;
        cameraShakeY = (Math.random() - 0.5) * shakeStrength * 1.5 * decay;
        if (shakeT > 0.55) { shakeActive = false; cameraShakeX = 0; cameraShakeY = 0; }
      }
      camera.position.x = cameraShakeX;
      camera.position.y = cameraShakeY;
      camera.lookAt(0, 0, 0);

      // Drawing phase — gentle plane bob
      if (phase === 'drawing') {
        fragments.forEach(f => { f.mesh.position.z = Math.sin(totalT * 0.7 + f.cx) * 0.008; });
      }

      // Cracking phase
      if (phase === 'cracking') {
        const prog = Math.min(phaseT / CRACK_DUR, 1);
        const eased = prog < 0.5 ? 2 * prog * prog : 1 - Math.pow(-2 * prog + 2, 2) / 2;
        crackMeshes.forEach((m, i) => {
          const t = Math.min(Math.max((eased - i / crackMeshes.length * 0.5) * 2.5, 0), 1);
          (m.material as THREE.MeshBasicMaterial).opacity = t * (0.8 + Math.sin(phaseT * 22 + i) * 0.15);
        });
        rimLight.intensity = prog * (2 + intensity * 0.03);
        fragments.forEach(f => {
          const sh = prog * 0.03;
          f.mesh.position.x = (Math.random() - 0.5) * sh;
          f.mesh.position.y = (Math.random() - 0.5) * sh;
        });
        if (phaseT >= CRACK_DUR) {
          phase = 'falling';
          phaseT = 0;
          fallT = 0;
          setStage('falling');
          shakeActive = true; shakeT = 0;
          flashLight.intensity = 6 + intensity * 0.1;
          playCrackSound(intensity);
          setFlashOpacity(0.4 + intensity * 0.004);
          setTimeout(() => setFlashOpacity(0), 100);
          // Fade 2D overlay
          let oa = 1;
          const fadeOverlay = () => {
            oa -= 0.08;
            oc.globalAlpha = Math.max(oa, 0);
            oc.clearRect(0, 0, W, H);
            if (oa > 0) requestAnimationFrame(fadeOverlay);
          };
          fadeOverlay();
        }
      }

      // Falling phase
      if (phase === 'falling') {
        fallT += dt;
        crackMeshes.forEach(m => { (m.material as THREE.MeshBasicMaterial).opacity *= 0.9; });
        flashLight.intensity = Math.max(0, flashLight.intensity - dt * 28);
        rimLight.intensity = Math.max(0, rimLight.intensity - dt * 1.8);

        fragments.forEach(f => {
          const ft = Math.max(0, fallT - f.delay);
          if (ft <= 0) return;
          f.vy -= dt * (5.5 + intensity * 0.04);
          const burst = Math.max(0, 1 - ft * 5) * 0.25;
          f.mesh.position.x = f.cx + f.vx * ft + f.cx * burst;
          f.mesh.position.y = f.cy + f.vy * ft;
          f.mesh.position.z = f.vz * ft;
          f.mesh.rotation.x += f.rx * (1 + ft * 0.5);
          f.mesh.rotation.y += f.ry * (1 + ft * 0.5);
          f.mesh.rotation.z += f.rz;
          const mat = f.mesh.material as THREE.MeshStandardMaterial;
          const fade = Math.max(0, 1 - Math.max(0, ft - 1.4) / 0.9);
          mat.opacity = fade; mat.transparent = true;
        });

        // Debris particles
        const posA = pGeo.attributes.position.array as Float32Array;
        const posB = pGeo2.attributes.position.array as Float32Array;
        const pt = fallT;
        pMat.opacity = pt < 2.2 ? Math.max(0, 0.85 * (1 - pt / 2.0)) : 0;
        pMat2.opacity = pt < 1.8 ? Math.max(0, 0.5 * (1 - pt / 1.6)) : 0;
        for (let i = 0; i < particleCount; i++) {
          const v = pVelocities[i];
          posA[i * 3] += v[0] * dt; posA[i * 3 + 1] += (v[1] - pt * 3.5) * dt; posA[i * 3 + 2] += v[2] * dt;
          posB[i * 3] = posA[i * 3]; posB[i * 3 + 1] = posA[i * 3 + 1]; posB[i * 3 + 2] = posA[i * 3 + 2];
        }
        pGeo.attributes.position.needsUpdate = true;
        pGeo2.attributes.position.needsUpdate = true;

        // Ash rain starts halfway through fall
        if (fallT > 0.8) {
          const ashArr = ashGeo.attributes.position.array as Float32Array;
          ashMat.opacity = Math.min((fallT - 0.8) / 0.5, 1) * 0.55;
          for (let i = 0; i < ashCount; i++) {
            const v = ashVelocities[i];
            ashArr[i * 3] += v[0] * dt + Math.sin(totalT * 0.4 + i) * 0.001;
            ashArr[i * 3 + 1] += v[1] * dt;
            if (ashArr[i * 3 + 1] < -6) ashArr[i * 3 + 1] = 6 + Math.random() * 2;
          }
          ashGeo.attributes.position.needsUpdate = true;
        }

        if (fallT > FALL_DUR) {
          phase = 'done';
          setStage('done');
          onComplete();
        }
      }

      renderer.render(scene, camera);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);

    const handleResize = () => {
      const nW = container.clientWidth, nH = container.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      overlay.width = nW; overlay.height = nH;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      if (autoTriggerRef.current) clearTimeout(autoTriggerRef.current);
      window.removeEventListener('resize', handleResize);
      overlay.removeEventListener('pointerdown', onPointerDown);
      overlay.removeEventListener('pointermove', onPointerMove);
      overlay.removeEventListener('pointerup', onPointerUp);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose(); msgTex.dispose();
    };
  }, [message, chargeLevel, intensity, nFragments, particleCount, shakeStrength, baseSpeed, onComplete]);

  const triggerNow = () => {
    const fn = (window as unknown as Record<string, unknown>).__unsendTrigger as (() => void) | undefined;
    if (fn) fn();
  };

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#16140F' }}>
      {/* Three.js canvas goes here (inserted before overlay) */}
      <div ref={containerRef} className="absolute inset-0 z-0" style={{ pointerEvents: 'none' }} />

      {/* 2D crack drawing overlay */}
      <canvas
        ref={canvasOverlayRef}
        className="absolute inset-0 z-10"
        style={{
          cursor: stage === 'drawing' ? 'crosshair' : 'default',
          display: stage === 'drawing' ? 'block' : 'none',
          touchAction: 'none',
        }}
      />

      {/* Drawing phase UI */}
      {stage === 'drawing' && (
        <div className="absolute inset-x-0 bottom-10 z-20 flex flex-col items-center gap-4 px-6">
          {drawHint && (
            <p className="font-mono text-xs tracking-widest uppercase text-center"
              style={{ color: 'rgba(140,132,115,0.75)' }}>
              Draw cracks — or wait for auto-release
            </p>
          )}
          <div className="flex gap-6 items-center">
            <button
              onClick={triggerNow}
              className="font-mono text-xs uppercase tracking-widest px-5 py-3 transition-colors"
              style={{ border: '1px solid #2a2820', color: '#8C8473', background: 'transparent' }}
              onMouseEnter={e => { (e.currentTarget).style.color = '#F2EFE9'; (e.currentTarget).style.borderColor = '#C53A1E'; }}
              onMouseLeave={e => { (e.currentTarget).style.color = '#8C8473'; (e.currentTarget).style.borderColor = '#2a2820'; }}
              data-testid="button-release-now"
            >
              Release now →
            </button>
            {chargeLevel > 0 && (
              <span className="font-mono text-xs" style={{ color: chargeLevel > 70 ? '#C53A1E' : '#5C5547' }}>
                {Math.round(chargeLevel)}% charge
              </span>
            )}
          </div>
        </div>
      )}

      {/* Intensity label during crack animation */}
      {stage === 'cracking' && (
        <div className="absolute inset-x-0 bottom-12 z-20 flex justify-center">
          <span className="font-mono text-xs tracking-[0.4em] uppercase"
            style={{ color: `rgba(197,58,30,${0.5 + intensity / 200})` }}>
            {intensity > 70 ? 'detonating' : intensity > 40 ? 'releasing' : 'fading'}
          </span>
        </div>
      )}

      {/* Flash */}
      <div className="absolute inset-0 z-30 pointer-events-none"
        style={{ background: '#F2EFE9', opacity: flashOpacity, transition: flashOpacity > 0 ? 'none' : 'opacity 0.15s ease-out' }} />

      {/* Closure card */}
      {stage === 'done' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8"
          style={{ background: 'rgba(22,20,15,0.97)', animation: 'fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards' }}>
          <style>{`
            @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
            @keyframes pulseClay { 0%,100%{opacity:0.3} 50%{opacity:0.9} }
          `}</style>
          <div style={{ width: 36, height: 1, background: '#C53A1E', marginBottom: '2.5rem', animation: 'pulseClay 2s ease-in-out infinite' }} />
          <h2 className="font-serif italic text-center leading-tight"
            style={{ fontSize: 'clamp(2rem, 8.5vw, 3.8rem)', color: '#F2EFE9', maxWidth: 380, marginBottom: '1.2rem', letterSpacing: '-0.01em' }}>
            {closureLine}
          </h2>
          {chargeLevel > 70 && (
            <p className="font-mono text-xs tracking-widest uppercase" style={{ color: '#C53A1E', marginBottom: '3rem', opacity: 0.7 }}>
              {chargeLevel > 90 ? '— full release —' : '— charged release —'}
            </p>
          )}
          {chargeLevel <= 70 && <div style={{ marginBottom: '3rem' }} />}
          <div style={{ width: '100%', maxWidth: 300, height: 1, background: '#1e1c18', marginBottom: '2.5rem' }} />
          <div style={{ display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
            {(['Write another', 'Done for now'] as const).map((label, i) => (
              <button key={label}
                onClick={i === 0 ? onClose : () => window.location.reload()}
                className="font-mono text-xs uppercase tracking-widest transition-all"
                style={{ color: '#8C8473', paddingBottom: 2, borderBottom: '1px solid transparent' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#F2EFE9'; e.currentTarget.style.borderBottomColor = '#F2EFE9'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#8C8473'; e.currentTarget.style.borderBottomColor = 'transparent'; }}
                data-testid={i === 0 ? 'button-write-another' : 'button-done'}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
