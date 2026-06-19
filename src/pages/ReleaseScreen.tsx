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

// Seeded random for deterministic Voronoi points per message
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Clip polygon to a half-plane (for Voronoi)
function clipPolygon(polygon: number[][], normal: number[], d: number): number[][] {
  if (polygon.length === 0) return [];
  const out: number[][] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i];
    const b = polygon[(i + 1) % polygon.length];
    const da = a[0] * normal[0] + a[1] * normal[1] - d;
    const db = b[0] * normal[0] + b[1] * normal[1] - d;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
  }
  return out;
}

// Build Voronoi cell for site i by clipping against all other sites
function voronoiCell(sites: number[][], i: number, bounds: number[]): number[][] {
  const [minX, minY, maxX, maxY] = bounds;
  let poly: number[][] = [
    [minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]
  ];
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue;
    const mx = (sites[i][0] + sites[j][0]) / 2;
    const my = (sites[i][1] + sites[j][1]) / 2;
    const nx = sites[j][0] - sites[i][0];
    const ny = sites[j][1] - sites[i][1];
    const d = mx * nx + my * ny;
    poly = clipPolygon(poly, [nx, ny], d);
    if (poly.length === 0) break;
  }
  return poly;
}

// Triangulate convex polygon (fan triangulation)
function triangulatePoly(poly: number[][]): number[] {
  const verts: number[] = [];
  for (let i = 1; i < poly.length - 1; i++) {
    verts.push(poly[0][0], poly[0][1], 0);
    verts.push(poly[i][0], poly[i][1], 0);
    verts.push(poly[i + 1][0], poly[i + 1][1], 0);
  }
  return verts;
}

// Centroid of polygon
function centroid(poly: number[][]): [number, number] {
  let cx = 0, cy = 0;
  for (const p of poly) { cx += p[0]; cy += p[1]; }
  return [cx / poly.length, cy / poly.length];
}

// Web Audio crack/thud sound
function playCrackSound() {
  try {
    const ctx = new AudioContext();
    // Sharp crack - noise burst
    const bufLen = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * (1 + Math.sin(i * 0.1)) * 0.6;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    // High pass filter to make it crackly
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    // Low pass for body
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4000;
    // Gain
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.7, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    src.connect(hp);
    hp.connect(lp);
    lp.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    // Secondary thud
    const bufLen2 = ctx.sampleRate * 0.3;
    const buf2 = ctx.createBuffer(1, bufLen2, ctx.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < bufLen2; i++) {
      const t = i / bufLen2;
      d2[i] = Math.sin(2 * Math.PI * 80 * (i / ctx.sampleRate)) * Math.pow(1 - t, 2) * 0.4;
    }
    const src2 = ctx.createBufferSource();
    src2.buffer = buf2;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.5, ctx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    src2.connect(g2);
    g2.connect(ctx.destination);
    src2.start(ctx.currentTime + 0.02);
  } catch {
    // AudioContext not available
  }
}

export function ReleaseScreen({ message, onComplete, onClose }: ReleaseScreenProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [shatterStage, setShatterStage] = useState<'idle' | 'cracking' | 'shattering' | 'done'>('idle');
  const [flashOpacity, setFlashOpacity] = useState(0);
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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x16140F, 0.12);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 9);
    const cameraTarget = new THREE.Vector3(0, 0, 0);
    let cameraShake = { x: 0, y: 0, intensity: 0 };

    // Dramatic directional light
    const mainLight = new THREE.DirectionalLight(0xF2EFE9, 4);
    mainLight.position.set(-6, 8, 5);
    mainLight.castShadow = true;
    scene.add(mainLight);

    const rimLight = new THREE.DirectionalLight(0xC53A1E, 0);
    rimLight.position.set(6, -3, 2);
    scene.add(rimLight);

    const ambLight = new THREE.AmbientLight(0x16140F, 0.4);
    scene.add(ambLight);

    // Flash point light for shatter moment
    const flashLight = new THREE.PointLight(0xC53A1E, 0, 8);
    flashLight.position.set(0, 0, 3);
    scene.add(flashLight);

    // ----- Message texture -----
    const texCanvas = document.createElement('canvas');
    texCanvas.width = 640;
    texCanvas.height = 800;
    const ctx = texCanvas.getContext('2d')!;
    // Paper texture bg
    ctx.fillStyle = '#F2EFE9';
    ctx.fillRect(0, 0, 640, 800);
    // Subtle grain
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(22,20,15,${Math.random() * 0.03})`;
      ctx.fillRect(Math.random() * 640, Math.random() * 800, 1, 1);
    }
    // Message text
    ctx.fillStyle = '#16140F';
    ctx.font = 'italic 500 26px "Newsreader", Georgia, serif';
    ctx.textAlign = 'left';
    const words = message.split(' ');
    let line = '';
    const lines: string[] = [];
    const mxW = 580;
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > mxW && line) { lines.push(line); line = word; }
      else line = test;
    }
    if (line) lines.push(line);
    const lineH = 42;
    const totalH = lines.length * lineH;
    const startY = (800 - totalH) / 2 + 28;
    lines.forEach((l, i) => ctx.fillText(l, 30, startY + i * lineH));
    // Thin border
    ctx.strokeStyle = '#8C8473';
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 608, 768);

    const msgTexture = new THREE.CanvasTexture(texCanvas);

    // ----- Voronoi fragment geometry -----
    const PW = 5.2, PH = 6.8;
    const rng = seededRandom(message.length + message.charCodeAt(0));
    const N_SITES = 38;
    const bounds: [number, number, number, number] = [-PW / 2, -PH / 2, PW / 2, PH / 2];
    const sites: number[][] = [];
    // Stratified sampling for better Voronoi distribution
    for (let i = 0; i < N_SITES; i++) {
      sites.push([
        bounds[0] + rng() * (bounds[2] - bounds[0]),
        bounds[1] + rng() * (bounds[3] - bounds[1])
      ]);
    }

    interface FragmentData {
      mesh: THREE.Mesh;
      cx: number;
      cy: number;
      vx: number;
      vy: number;
      vz: number;
      rx: number;
      ry: number;
      rz: number;
      delay: number;
      dist: number;
    }

    const fragments: FragmentData[] = [];
    const BONE = new THREE.Color(0xF2EFE9);

    for (let i = 0; i < N_SITES; i++) {
      const poly = voronoiCell(sites, i, bounds);
      if (poly.length < 3) continue;
      const [cx, cy] = centroid(poly);

      // UV-mapped geometry
      const verts = triangulatePoly(poly);
      const positions = new Float32Array(verts);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // UV from position
      const uvs = new Float32Array(verts.length / 3 * 2);
      for (let v = 0; v < verts.length / 3; v++) {
        uvs[v * 2] = (verts[v * 3] - bounds[0]) / (bounds[2] - bounds[0]);
        uvs[v * 2 + 1] = (verts[v * 3 + 1] - bounds[1]) / (bounds[3] - bounds[1]);
      }
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.computeVertexNormals();

      const mat = new THREE.MeshStandardMaterial({
        map: msgTexture,
        color: BONE,
        metalness: 0.0,
        roughness: 0.85,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, 0);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      scene.add(mesh);

      const dist = Math.sqrt(cx * cx + cy * cy);
      const angle = Math.atan2(cy, cx);
      const spd = 0.8 + rng() * 1.4;

      fragments.push({
        mesh, cx, cy,
        vx: Math.cos(angle) * spd * (0.6 + rng() * 0.8) + (rng() - 0.5) * 0.6,
        vy: Math.sin(angle) * spd * 0.4 - (0.8 + rng() * 1.8),
        vz: (rng() - 0.5) * 1.2,
        rx: (rng() - 0.5) * 0.12,
        ry: (rng() - 0.5) * 0.12,
        rz: (rng() - 0.5) * 0.08,
        delay: dist * 0.08 + rng() * 0.05,
        dist,
      });
    }

    // ----- Crack line system -----
    const crackGroup = new THREE.Group();
    scene.add(crackGroup);
    const crackMeshes: THREE.Mesh[] = [];

    const buildCrackLine = (x1: number, y1: number, x2: number, y2: number, w: number) => {
      const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const geo = new THREE.PlaneGeometry(len, w);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xC53A1E,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0.05);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      mesh.rotation.z = angle;
      crackGroup.add(mesh);
      crackMeshes.push(mesh);
    };

    // Main cracks radiating from center
    const crackAngles = [0, 0.7, 1.4, 2.0, 2.7, 3.5, 4.2, 4.9, 5.6];
    crackAngles.forEach(a => {
      const len = 1.5 + rng() * 2.0;
      buildCrackLine(0, 0, Math.cos(a) * len, Math.sin(a) * len, 0.02 + rng() * 0.015);
      // Secondary branches
      const branchA = a + (rng() - 0.5) * 0.8;
      const branchLen = 0.5 + rng() * 1.0;
      const bx = Math.cos(a) * len * 0.5;
      const by = Math.sin(a) * len * 0.5;
      buildCrackLine(bx, by, bx + Math.cos(branchA) * branchLen, by + Math.sin(branchA) * branchLen, 0.01);
    });

    // ----- Particle system -----
    const PARTICLE_COUNT = 320;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(PARTICLE_COUNT * 3);
    const pVelocities: number[][] = [];
    const pOpacities = new Float32Array(PARTICLE_COUNT);
    const pSizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pPositions[i * 3] = (rng() - 0.5) * PW;
      pPositions[i * 3 + 1] = (rng() - 0.5) * PH;
      pPositions[i * 3 + 2] = 0.1;
      const angle = rng() * Math.PI * 2;
      const spd = 0.5 + rng() * 4.5;
      pVelocities.push([
        Math.cos(angle) * spd,
        Math.sin(angle) * spd - rng() * 2,
        (rng() - 0.5) * 2
      ]);
      pOpacities[i] = 0;
      pSizes[i] = 1.5 + rng() * 4;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xF2EFE9,
      size: 0.06,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    // Mix clay and bone particles
    const pMat2 = new THREE.PointsMaterial({
      color: 0xC53A1E,
      size: 0.04,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const pGeo2 = pGeo.clone();
    const particles = new THREE.Points(pGeo, pMat);
    const particles2 = new THREE.Points(pGeo2, pMat2);
    scene.add(particles);
    scene.add(particles2);

    // ----- Animation state -----
    let phase: 'reading' | 'cracking' | 'falling' | 'done' = 'reading';
    let phaseTime = 0;
    let totalTime = 0;
    let crackProgress = 0;
    let fallTime = 0;
    let shakeTime = 0;
    let shakeActive = false;
    const CRACK_DUR = 0.55;
    const FALL_DUR = 2.8;

    // Slight camera push-in
    const camStartZ = 9;
    const camEndZ = 8.2;

    const loop = (() => {
      let last = performance.now();
      return (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        totalTime += dt;
        phaseTime += dt;

        // Cinematic camera drift
        const driftZ = camStartZ + (camEndZ - camStartZ) * Math.min(totalTime / 4, 1);
        camera.position.z = driftZ;

        // Camera shake
        if (shakeActive) {
          shakeTime += dt;
          const decay = Math.max(0, 1 - shakeTime / 0.5);
          cameraShake.x = (Math.random() - 0.5) * 0.18 * decay * cameraShake.intensity;
          cameraShake.y = (Math.random() - 0.5) * 0.12 * decay * cameraShake.intensity;
          if (shakeTime > 0.5) { shakeActive = false; cameraShake.x = 0; cameraShake.y = 0; }
        }
        camera.position.x = cameraShake.x;
        camera.position.y = cameraShake.y;
        camera.lookAt(cameraTarget);

        // === READING phase ===
        if (phase === 'reading') {
          // Subtle breath — fragments shimmer slightly
          fragments.forEach(f => {
            f.mesh.position.z = Math.sin(totalTime * 0.8 + f.cx) * 0.01;
          });
          if (phaseTime > 1.5) {
            phase = 'cracking';
            phaseTime = 0;
            setShatterStage('cracking');
          }
        }

        // === CRACKING phase ===
        if (phase === 'cracking') {
          crackProgress = Math.min(phaseTime / CRACK_DUR, 1);
          // Ease-in crack reveal
          const eased = crackProgress < 0.5
            ? 2 * crackProgress * crackProgress
            : 1 - Math.pow(-2 * crackProgress + 2, 2) / 2;

          crackMeshes.forEach((m, i) => {
            const mat = m.material as THREE.MeshBasicMaterial;
            // Stagger each crack line
            const t = Math.min(Math.max((eased - (i / crackMeshes.length) * 0.5) * 2.5, 0), 1);
            mat.opacity = t * (0.7 + Math.sin(phaseTime * 20 + i) * 0.15);
          });

          // Rim light intensifies
          rimLight.intensity = crackProgress * 2.5;

          // Slight fragment tremble — increasing
          fragments.forEach(f => {
            const shake = crackProgress * 0.025;
            f.mesh.position.x = (Math.random() - 0.5) * shake;
            f.mesh.position.y = (Math.random() - 0.5) * shake;
          });

          if (phaseTime >= CRACK_DUR) {
            phase = 'falling';
            phaseTime = 0;
            fallTime = 0;
            setShatterStage('shattering');

            // IMPACT: camera shake + flash
            shakeActive = true;
            shakeTime = 0;
            cameraShake.intensity = 1;

            // Flash light burst
            flashLight.intensity = 8;

            playCrackSound();

            // Screen flash
            setFlashOpacity(0.6);
            setTimeout(() => setFlashOpacity(0), 120);
          }
        }

        // === FALLING phase ===
        if (phase === 'falling') {
          fallTime += dt;
          const t = fallTime;

          // Crack glow fades
          crackMeshes.forEach(m => {
            (m.material as THREE.MeshBasicMaterial).opacity *= 0.92;
          });

          // Flash light decays rapidly
          flashLight.intensity = Math.max(0, flashLight.intensity - dt * 30);
          rimLight.intensity = Math.max(0, rimLight.intensity - dt * 2);

          // Fragment physics
          fragments.forEach(f => {
            const ft = Math.max(0, t - f.delay);
            if (ft <= 0) return;

            // Gravity acceleration
            f.vy -= dt * 6.0;

            // Centrifugal burst from center
            const burst = Math.max(0, 1 - ft * 4);
            f.mesh.position.x = f.cx + (f.vx * ft + (Math.random() - 0.5) * 0.002) + f.cx * burst * 0.3;
            f.mesh.position.y = f.cy + f.vy * ft + (Math.random() - 0.5) * 0.002;
            f.mesh.position.z = f.vz * ft;

            // Rotation
            f.mesh.rotation.x += f.rx * (1 + ft);
            f.mesh.rotation.y += f.ry * (1 + ft);
            f.mesh.rotation.z += f.rz * (1 + ft * 0.5);

            // Fade
            const mat = f.mesh.material as THREE.MeshStandardMaterial;
            const fadeStart = 1.2;
            if (ft > fadeStart) {
              mat.opacity = Math.max(0, 1 - (ft - fadeStart) / 0.8);
              mat.transparent = true;
            }
          });

          // Particle burst
          const posArr = pGeo.attributes.position.array as Float32Array;
          const posArr2 = pGeo2.attributes.position.array as Float32Array;
          const pt = Math.max(0, t - 0.0);
          if (pt < 2.0) {
            pMat.opacity = Math.max(0, 0.85 * (1 - pt / 1.8));
            pMat2.opacity = Math.max(0, 0.5 * (1 - pt / 1.5));
          } else {
            pMat.opacity = 0;
            pMat2.opacity = 0;
          }
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const v = pVelocities[i];
            posArr[i * 3] = posArr[i * 3] + v[0] * dt;
            posArr[i * 3 + 1] = posArr[i * 3 + 1] + (v[1] - pt * 3) * dt;
            posArr[i * 3 + 2] = posArr[i * 3 + 2] + v[2] * dt;
            posArr2[i * 3] = posArr[i * 3];
            posArr2[i * 3 + 1] = posArr[i * 3 + 1];
            posArr2[i * 3 + 2] = posArr[i * 3 + 2];
          }
          pGeo.attributes.position.needsUpdate = true;
          pGeo2.attributes.position.needsUpdate = true;

          if (fallTime > FALL_DUR) {
            phase = 'done';
            setShatterStage('done');
            onComplete();
          }
        }

        renderer.render(scene, camera);
      };
    })();

    let animId: number;
    const animate = (now: number) => {
      loop(now);
      animId = requestAnimationFrame(animate);
    };

    // Reduced motion: just fade
    let reducedAnimId: number;
    if (prefersReducedMotion) {
      let fade = 1;
      let elapsed = 0;
      const reducedLoop = (now: number) => {
        elapsed += 0.016;
        fade = Math.max(0, 1 - elapsed / 0.8);
        fragments.forEach(f => {
          const mat = f.mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = fade;
          mat.transparent = true;
        });
        renderer.render(scene, camera);
        if (elapsed < 1.0) {
          reducedAnimId = requestAnimationFrame(reducedLoop);
        } else {
          setShatterStage('done');
          onComplete();
        }
      };
      reducedAnimId = requestAnimationFrame(reducedLoop);
    } else {
      animId = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      const nW = container.clientWidth;
      const nH = container.clientHeight;
      renderer.setSize(nW, nH);
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      cancelAnimationFrame(reducedAnimId);
      window.removeEventListener('resize', handleResize);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
      msgTexture.dispose();
      pGeo.dispose();
      pGeo2.dispose();
    };
  }, [message, prefersReducedMotion, onComplete]);

  return (
    <div className="fixed inset-0 z-50" style={{ background: '#16140F' }}>
      {/* Three.js canvas mount point */}
      <div ref={canvasRef} className="absolute inset-0 z-0" />

      {/* Crack/release phase indicator */}
      {shatterStage === 'cracking' && (
        <div
          className="absolute inset-x-0 bottom-12 z-10 flex justify-center"
          style={{ animation: 'none' }}
        >
          <span
            className="font-mono text-xs tracking-[0.3em] uppercase"
            style={{ color: 'rgba(197,58,30,0.7)' }}
          >
            releasing
          </span>
        </div>
      )}

      {/* Screen flash overlay */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: '#F2EFE9',
          opacity: flashOpacity,
          transition: flashOpacity > 0 ? 'none' : 'opacity 0.12s ease-out',
        }}
      />

      {/* Closure card */}
      {shatterStage === 'done' && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8"
          style={{
            background: 'rgba(22,20,15,0.96)',
            animation: 'fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
          }}
        >
          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse-clay {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 0.8; }
            }
          `}</style>

          {/* Thin clay rule */}
          <div style={{ width: 40, height: 1, background: '#C53A1E', marginBottom: '3rem', animation: 'pulse-clay 2s ease-in-out infinite' }} />

          <h2
            className="font-serif italic text-center leading-tight"
            style={{
              fontSize: 'clamp(2.2rem, 9vw, 4rem)',
              color: '#F2EFE9',
              maxWidth: 400,
              marginBottom: '4rem',
              letterSpacing: '-0.01em',
            }}
          >
            {closureLine}
          </h2>

          {/* Hairline divider */}
          <div style={{ width: '100%', maxWidth: 320, height: 1, background: '#2a2820', marginBottom: '2.5rem' }} />

          <div style={{ display: 'flex', gap: '3rem', alignItems: 'center' }}>
            <button
              onClick={onClose}
              className="font-mono text-xs uppercase tracking-widest transition-all duration-200"
              style={{ color: '#8C8473', paddingBottom: 2, borderBottom: '1px solid transparent' }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.color = '#F2EFE9';
                el.style.borderBottomColor = '#F2EFE9';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.color = '#8C8473';
                el.style.borderBottomColor = 'transparent';
              }}
              data-testid="button-write-another"
            >
              Write another
            </button>
            <div style={{ width: 1, height: 12, background: '#2a2820' }} />
            <button
              onClick={() => window.location.reload()}
              className="font-mono text-xs uppercase tracking-widest transition-all duration-200"
              style={{ color: '#8C8473', paddingBottom: 2, borderBottom: '1px solid transparent' }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.color = '#F2EFE9';
                el.style.borderBottomColor = '#F2EFE9';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.color = '#8C8473';
                el.style.borderBottomColor = 'transparent';
              }}
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
