import { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import type { ShatterMode } from '../App';

interface ReleaseScreenProps {
  releaseCount: number;
  message: string;
  chargeLevel: number;
  mode: ShatterMode;
  onComplete: () => void;
  onClose: () => void;
}

// ─── Voronoi helpers ──────────────────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = seed + 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
function clipPolygon(poly: number[][], nx: number, ny: number, d: number): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = a[0]*nx + a[1]*ny - d, db = b[0]*nx + b[1]*ny - d;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const t = da/(da-db); out.push([a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])]); }
  }
  return out;
}
function voronoiCell(sites: number[][], i: number, b: number[]): number[][] {
  let poly: number[][] = [[b[0],b[1]],[b[2],b[1]],[b[2],b[3]],[b[0],b[3]]];
  for (let j = 0; j < sites.length; j++) {
    if (j === i) continue;
    const mx=(sites[i][0]+sites[j][0])/2, my=(sites[i][1]+sites[j][1])/2;
    const nx=sites[j][0]-sites[i][0], ny=sites[j][1]-sites[i][1];
    poly = clipPolygon(poly, nx, ny, mx*nx+my*ny);
    if (!poly.length) break;
  }
  return poly;
}
function triangulatePoly(poly: number[][]): number[] {
  const v: number[] = [];
  for (let i = 1; i < poly.length-1; i++) {
    v.push(poly[0][0],poly[0][1],0, poly[i][0],poly[i][1],0, poly[i+1][0],poly[i+1][1],0);
  }
  return v;
}
function centroid(poly: number[][]): [number, number] {
  let cx=0, cy=0;
  for (const p of poly) { cx+=p[0]; cy+=p[1]; }
  return [cx/poly.length, cy/poly.length];
}

// ─── Per-mode config ──────────────────────────────────────────────────────────
const MODE_CFG = {
  default: {
    fragColor: 0xF2EFE9, crackColor: 0xC53A1E, bgColor: 0x16140F,
    particleColor: 0xF2EFE9, particle2Color: 0xC53A1E,
    ashColor: 0x3a3530, ashUp: false,
    timeScale: 1.0, fragMult: 1, mirrorMode: false,
    closures: ['It is done.','The space is yours again.','No response needed.','Silence is an answer.','Let the ink dry.'],
    lightColor: 0xF2EFE9, flashColor: 0xC53A1E,
  },
  fire: {
    fragColor: 0xFF6B1A, crackColor: 0xFF9500, bgColor: 0x0f0800,
    particleColor: 0xFF9500, particle2Color: 0xFF3300,
    ashColor: 0xff6600, ashUp: true,
    timeScale: 1.15, fragMult: 1, mirrorMode: false,
    closures: ['Burned.','Ash and silence.','Nothing left to hold.','The heat is gone.','Consumed.'],
    lightColor: 0xFF8040, flashColor: 0xFF6600,
  },
  mirror: {
    fragColor: 0xD8EDF5, crackColor: 0x7ab8d4, bgColor: 0x060c10,
    particleColor: 0xD8EDF5, particle2Color: 0x7ab8d4,
    ashColor: 0x1a3040, ashUp: false,
    timeScale: 0.9, fragMult: 1, mirrorMode: true,
    closures: ['Reflected.','Both sides gone.','The echo dissolves.','Symmetry broken.','Balanced, then nothing.'],
    lightColor: 0x90d0f0, flashColor: 0x7ab8d4,
  },
  slowmo: {
    fragColor: 0xEDE8F5, crackColor: 0xb4a0d4, bgColor: 0x08050f,
    particleColor: 0xEDE8F5, particle2Color: 0xb4a0d4,
    ashColor: 0x2a2035, ashUp: false,
    timeScale: 0.28, fragMult: 1.6, mirrorMode: false,
    closures: ['Witnessed.','Every fragment, seen.','Slow and certain.','The moment stretches.','Held, then released.'],
    lightColor: 0xC8B8F0, flashColor: 0xb4a0d4,
  },
} as const;

// ─── Audio ────────────────────────────────────────────────────────────────────
function playCrackSound(intensity: number, mode: ShatterMode) {
  try {
    const ctx = new AudioContext();
    const vol = 0.3 + intensity * 0.007;
    const pitchMult = mode === 'slowmo' ? 0.4 : mode === 'fire' ? 1.4 : 1.0;

    const bufLen = Math.floor(ctx.sampleRate * 0.15);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const t = i / bufLen;
      d[i] = (Math.random()*2-1) * Math.pow(1-t,2.5) * (1+Math.sin(i*pitchMult*0.12)) * vol;
    }
    const src = ctx.createBufferSource(); src.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=300*pitchMult;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol,ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.2);
    src.connect(hp); hp.connect(g); g.connect(ctx.destination); src.start();

    if (intensity > 20) {
      const bl=Math.floor(ctx.sampleRate*0.5);
      const bb=ctx.createBuffer(1,bl,ctx.sampleRate);
      const bd=bb.getChannelData(0);
      const bassFreq = mode==='slowmo' ? 30 : mode==='fire' ? 80 : 55;
      for (let i=0;i<bl;i++) { const t=i/bl; bd[i]=Math.sin(2*Math.PI*bassFreq*(i/ctx.sampleRate))*Math.pow(1-t,1.8)*vol*0.7; }
      const bs=ctx.createBufferSource(); bs.buffer=bb;
      const bg=ctx.createGain(); bg.gain.setValueAtTime(vol*0.9,ctx.currentTime);
      bg.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.5);
      bs.connect(bg); bg.connect(ctx.destination); bs.start(ctx.currentTime+0.01);
    }
  } catch { /* silence */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface FragData {
  mesh: THREE.Mesh;
  mirrorMesh?: THREE.Mesh;
  cx: number; cy: number;
  vx: number; vy: number; vz: number;
  rx: number; ry: number; rz: number;
  delay: number;
}

export function ReleaseScreen({ releaseCount, message, chargeLevel, mode, onComplete, onClose }: ReleaseScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<'drawing'|'cracking'|'falling'|'done'>('drawing');
  const [flashOpacity, setFlashOpacity] = useState(0);
  const [drawHint, setDrawHint] = useState(true);
  const [countdown, setCountdown] = useState(3);
  const [copied, setCopied] = useState(false);
  const interactRef = useRef<((x: number, y: number) => void) | null>(null);
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = MODE_CFG[mode];
  const closureLine = useMemo(
    () => cfg.closures[Math.floor(Math.random() * cfg.closures.length)],
    [cfg.closures]
  );

  const intensity = Math.max(chargeLevel, 10);
  const nFragBase = Math.round(28 + intensity * 0.22);
  const nFrags = Math.round(nFragBase * cfg.fragMult);
  const nParticles = Math.round(180 + intensity * 2.0);
  const shakeStr = (0.08 + intensity * 0.002) * (mode === 'slowmo' ? 0.4 : 1);
  const baseSpd = (0.6 + intensity * 0.02) * cfg.timeScale;
  const CRACK_DUR = (mode === 'slowmo' ? 1.8 : 0.5);
  const FALL_DUR = (mode === 'slowmo' ? 9 : 3.0) + intensity * 0.01;
  const userCracksRef = useRef<[number, number][][]>([]);
  const isDrawingRef = useRef(false);
  const currentCrackRef = useRef<[number, number][]>([]);
  const autoTriggerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const overlay = overlayRef.current;
    if (!container || !overlay) return;

    const W = container.clientWidth || window.innerWidth;
    const H = container.clientHeight || window.innerHeight;
    overlay.width = W; overlay.height = H;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(cfg.bgColor, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(cfg.bgColor, mode==='slowmo' ? 0.06 : 0.09);

    const camera = new THREE.PerspectiveCamera(45, W/H, 0.1, 100);
    camera.position.set(0, 0, 9);

    // ── Lights ──
    const mainLight = new THREE.DirectionalLight(cfg.lightColor, 4);
    mainLight.position.set(-5, 8, 5);
    scene.add(mainLight);
    const rimLight = new THREE.DirectionalLight(new THREE.Color(cfg.crackColor), 0);
    rimLight.position.set(6, -4, 2);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(cfg.bgColor, 0.5));
    const flashLight = new THREE.PointLight(cfg.flashColor, 0, 12);
    flashLight.position.set(0, 0, 4);
    scene.add(flashLight);

    // Fire-mode: flickering ember light
    let emberLight: THREE.PointLight | null = null;
    if (mode === 'fire') {
      emberLight = new THREE.PointLight(0xFF6600, 0, 8);
      emberLight.position.set(0, -2, 2);
      scene.add(emberLight);
    }

    // Mirror-mode: center line
    if (mode === 'mirror') {
      const lineGeo = new THREE.PlaneGeometry(0.008, 8);
      const lineMat = new THREE.MeshBasicMaterial({ color: 0x7ab8d4, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending });
      const line = new THREE.Mesh(lineGeo, lineMat);
      line.position.set(0, 0, 0.02);
      scene.add(line);
    }

    // ── Message texture ──
    const tc = document.createElement('canvas');
    tc.width = 640; tc.height = 800;
    const tx = tc.getContext('2d')!;
    tx.fillStyle = mode==='fire' ? '#1a0800' : mode==='mirror' ? '#060c10' : mode==='slowmo' ? '#08050f' : '#F2EFE9';
    tx.fillRect(0, 0, 640, 800);
    for (let i=0;i<2000;i++) {
      tx.fillStyle=`rgba(${mode==='fire'?'255,150,50':mode==='mirror'?'100,180,220':'200,200,200'},${Math.random()*0.025})`;
      tx.fillRect(Math.random()*640, Math.random()*800, 1, 1);
    }
    const textColor = mode==='fire' ? '#FF9500' : mode==='mirror' ? '#D8EDF5' : mode==='slowmo' ? '#EDE8F5' : '#16140F';
    tx.fillStyle = textColor;
    tx.font = 'italic 500 24px "Newsreader", Georgia, serif';
    tx.textAlign = 'left';
    const words = message.split(' ');
    let line='', lines: string[]=[];
    for (const w of words) {
      const test = line ? line+' '+w : w;
      if (tx.measureText(test).width > 575 && line) { lines.push(line); line=w; }
      else line=test;
    }
    if (line) lines.push(line);
    const lh=40, tH=lines.length*lh, sy=(800-tH)/2+26;
    lines.forEach((l,i) => tx.fillText(l, 30, sy+i*lh));
    const borderColor = mode==='fire'?'#552200':mode==='mirror'?'#1a3040':mode==='slowmo'?'#1a0f28':'#8C8473';
    tx.strokeStyle=borderColor; tx.lineWidth=1; tx.strokeRect(16,16,608,768);
    const msgTex = new THREE.CanvasTexture(tc);

    // ── Voronoi fragments ──
    const PW=5.2, PH=6.8;
    const rng = seededRandom(message.length*31 + chargeLevel + ['default','fire','mirror','slowmo'].indexOf(mode)*1000);
    const bounds = [-PW/2,-PH/2,PW/2,PH/2];
    const sites: number[][] = [];
    for (let i=0;i<nFrags;i++) sites.push([bounds[0]+rng()*PW, bounds[1]+rng()*PH]);

    const fragments: FragData[] = [];
    const fragColor = new THREE.Color(cfg.fragColor);

    for (let i=0;i<nFrags;i++) {
      const poly = voronoiCell(sites, i, bounds);
      if (poly.length < 3) continue;
      const [cx,cy] = centroid(poly);
      const verts = triangulatePoly(poly);
      const makeMesh = (flipX: number) => {
        const geo = new THREE.BufferGeometry();
        const flipped = flipX !== 1 ? verts.map((v,idx)=>idx%3===0?v*flipX:v) : verts;
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(flipped),3));
        const uvs = new Float32Array(verts.length/3*2);
        for (let v=0;v<verts.length/3;v++) {
          uvs[v*2]   = flipX===1 ? (verts[v*3]-bounds[0])/PW : 1-(verts[v*3]-bounds[0])/PW;
          uvs[v*2+1] = (verts[v*3+1]-bounds[1])/PH;
        }
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs,2));
        geo.computeVertexNormals();
        const mat = new THREE.MeshStandardMaterial({
          map: msgTex, color: fragColor,
          roughness: 0.85, metalness: mode==='mirror'?0.3:0,
          side: THREE.DoubleSide,
          transparent: mode==='mirror',
          opacity: mode==='mirror' ? 0.88 : 1,
          blending: mode==='mirror' ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        if (mode==='fire') (mat as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x220800);
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        return mesh;
      };
      const mesh = makeMesh(1);
      const mirrorMesh = cfg.mirrorMode ? makeMesh(-1) : undefined;

      const angle = Math.atan2(cy,cx);
      const spd = baseSpd*(0.5+rng()*1.2);
      fragments.push({
        mesh, mirrorMesh, cx, cy,
        vx: Math.cos(angle)*spd*(0.5+rng())+( rng()-0.5)*0.8,
        vy: Math.sin(angle)*spd*0.3-(0.6+rng()*2.2)*(intensity/65),
        vz: (rng()-0.5)*1.4,
        rx: (rng()-0.5)*0.13, ry: (rng()-0.5)*0.13, rz: (rng()-0.5)*0.09,
        delay: Math.sqrt(cx*cx+cy*cy)*0.06+rng()*0.04,
      });
    }

    // ── Crack lines ──
    const crackMeshes: THREE.Mesh[] = [];
    const crackAngles = Array.from({length:9},(_,i)=>i*(Math.PI*2/9)+rng()*0.4);
    crackAngles.forEach(a => {
      const len = 1.4+rng()*2.2;
      const seg = (x1:number,y1:number,x2:number,y2:number,w:number) => {
        const sl=Math.sqrt((x2-x1)**2+(y2-y1)**2);
        const g=new THREE.PlaneGeometry(sl,w);
        const m=new THREE.MeshBasicMaterial({color:cfg.crackColor,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
        const mesh=new THREE.Mesh(g,m);
        mesh.position.set((x1+x2)/2,(y1+y2)/2,0.05);
        mesh.rotation.z=Math.atan2(y2-y1,x2-x1);
        scene.add(mesh); crackMeshes.push(mesh);
      };
      seg(0,0,Math.cos(a)*len,Math.sin(a)*len,0.018+rng()*0.015);
      const bA=a+(rng()-0.5)*0.9, bLen=0.4+rng()*0.9;
      const bx=Math.cos(a)*len*0.55, by=Math.sin(a)*len*0.55;
      seg(bx,by,bx+Math.cos(bA)*bLen,by+Math.sin(bA)*bLen,0.01);
    });

    // ── Particles ──
    const pPos = new Float32Array(nParticles*3);
    const pVel: [number,number,number][] = [];
    for (let i=0;i<nParticles;i++) {
      pPos[i*3]=(rng()-0.5)*PW; pPos[i*3+1]=(rng()-0.5)*PH; pPos[i*3+2]=0.2;
      const a=rng()*Math.PI*2, spd=(0.4+rng()*5.5)*(intensity/60);
      // Fire: emit upward; others: radial
      const upBias = mode==='fire' ? (1+rng()*2) : -(rng()*1.5);
      pVel.push([Math.cos(a)*spd, Math.sin(a)*spd*0.4+upBias, (rng()-0.5)*2]);
    }
    const pGeo=new THREE.BufferGeometry(); pGeo.setAttribute('position',new THREE.BufferAttribute(pPos.slice(),3));
    const pMat=new THREE.PointsMaterial({color:cfg.particleColor,size:0.055,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
    const pGeo2=new THREE.BufferGeometry(); pGeo2.setAttribute('position',new THREE.BufferAttribute(pPos.slice(),3));
    const pMat2=new THREE.PointsMaterial({color:cfg.particle2Color,size:0.038,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
    scene.add(new THREE.Points(pGeo,pMat));
    scene.add(new THREE.Points(pGeo2,pMat2));

    // ── Ash / Ember rain ──
    const ashCount = 120+Math.round(intensity*1.2);
    const ashPos = new Float32Array(ashCount*3);
    const ashVel: [number,number,number][] = [];
    for (let i=0;i<ashCount;i++) {
      const startY = cfg.ashUp ? -5-rng()*3 : 5+rng()*4;
      ashPos[i*3]=(rng()-0.5)*10; ashPos[i*3+1]=startY; ashPos[i*3+2]=(rng()-0.5)*3;
      const drift = (rng()-0.5)*0.2;
      const yVel = cfg.ashUp ? (0.5+rng()*1.5) : -(0.2+rng()*0.5);
      ashVel.push([drift, yVel, (rng()-0.5)*0.05]);
    }
    const ashGeo=new THREE.BufferGeometry(); ashGeo.setAttribute('position',new THREE.BufferAttribute(ashPos,3));
    const ashMat=new THREE.PointsMaterial({color:cfg.ashColor,size:mode==='fire'?0.055:0.04,transparent:true,opacity:0,blending:mode==='fire'?THREE.AdditiveBlending:THREE.NormalBlending,depthWrite:false});
    const ashPoints=new THREE.Points(ashGeo,ashMat);
    scene.add(ashPoints);

    // ── Animation state ──
    type Phase = 'drawing'|'cracking'|'falling'|'done';
    let phase: Phase = 'drawing';
    let phaseT=0, totalT=0, fallT=0;
    let shakeX=0, shakeY=0, shakeT=0, shakeActive=false;
    const oc = overlay.getContext('2d')!;

    const triggerShatter = () => {
      if (phase !== 'drawing' && phase !== 'cracking') return;
      if (autoTriggerRef.current) { clearTimeout(autoTriggerRef.current); autoTriggerRef.current=null; }
      phase='cracking'; phaseT=0;
      setStage('cracking'); setDrawHint(false);
    };
    (window as unknown as Record<string,unknown>).__unsendTrigger = triggerShatter;
    autoTriggerRef.current = setTimeout(triggerShatter, 3500);

    // ── 2D crack drawing ──
    const getPos = (e: PointerEvent): [number,number] => {
      const r=overlay.getBoundingClientRect(); return [e.clientX-r.left, e.clientY-r.top];
    };
    const redrawCracks = () => {
      oc.clearRect(0,0,W,H);
      for (const crack of userCracksRef.current) {
        if (crack.length<2) continue;
        oc.beginPath();
        const col=mode==='fire'?'255,149,0':mode==='mirror'?'122,184,212':mode==='slowmo'?'180,160,212':'197,58,30';
        oc.strokeStyle=`rgba(${col},0.8)`; oc.lineWidth=1.5; oc.shadowColor=`rgb(${col})`; oc.shadowBlur=7;
        oc.moveTo(crack[0][0],crack[0][1]);
        crack.forEach(p=>oc.lineTo(p[0],p[1])); oc.stroke();
      }
    };
    const onPD=(e:PointerEvent)=>{ if(phase!=='drawing')return; isDrawingRef.current=true; currentCrackRef.current=[getPos(e)]; setDrawHint(false); };
    const onPM=(e:PointerEvent)=>{ if(!isDrawingRef.current||phase!=='drawing')return; currentCrackRef.current.push(getPos(e)); redrawCracks(); const cur=currentCrackRef.current; if(cur.length>1){oc.beginPath();const col=mode==='fire'?'255,149,0':mode==='mirror'?'122,184,212':mode==='slowmo'?'180,160,212':'197,58,30';oc.strokeStyle=`rgba(${col},0.9)`;oc.lineWidth=1.5;oc.shadowColor=`rgb(${col})`;oc.shadowBlur=9;oc.moveTo(cur[0][0],cur[0][1]);cur.forEach(p=>oc.lineTo(p[0],p[1]));oc.stroke();} };
    const onPU=()=>{ if(!isDrawingRef.current)return; isDrawingRef.current=false; if(currentCrackRef.current.length>1)userCracksRef.current.push([...currentCrackRef.current]); currentCrackRef.current=[]; };
    overlay.addEventListener('pointerdown',onPD);
    overlay.addEventListener('pointermove',onPM);
    overlay.addEventListener('pointerup',onPU);

    // ── Render loop ──
    let animId: number;
    let lastNow = performance.now();

    const tick = (now: number) => {
      const rawDt = Math.min((now-lastNow)/1000, 0.05);
      lastNow = now;
      // Time scaling per mode (slowmo scales physics, not frame rate)
      const dt = phase==='falling' || phase==='cracking' ? rawDt * cfg.timeScale : rawDt;
      totalT += rawDt; phaseT += dt;

      // Camera
      let camX=shakeX, camY=shakeY;
      if (mode==='slowmo' && phase==='falling') {
        // Slow orbital camera
        camX += Math.sin(totalT*0.18)*1.8;
        camY += Math.cos(totalT*0.12)*0.6;
        camera.position.z = 8.5+Math.cos(totalT*0.1)*0.8;
      } else {
        camera.position.z = 9-(0.8*Math.min(totalT/4,1));
      }
      if (shakeActive) {
        shakeT+=rawDt;
        const d=Math.max(0,1-shakeT/0.55);
        shakeX=(Math.random()-0.5)*shakeStr*2*d;
        shakeY=(Math.random()-0.5)*shakeStr*1.5*d;
        if(shakeT>0.55){shakeActive=false;shakeX=0;shakeY=0;}
      }
      camera.position.x=camX; camera.position.y=camY; camera.lookAt(0,0,0);

      // Fire: ember light flicker
      if (emberLight && phase==='falling') {
        emberLight.intensity = Math.max(0, (2+Math.sin(totalT*12)*1.5)*(1-fallT/FALL_DUR));
        emberLight.position.y = -2+Math.sin(totalT*3)*0.5;
      }

      // Drawing: gentle breath
      if (phase==='drawing') fragments.forEach(f=>{ f.mesh.position.z=Math.sin(totalT*0.7+f.cx)*0.008; });

      // Cracking
      if (phase==='cracking') {
        const prog=Math.min(phaseT/CRACK_DUR,1);
        const eased=prog<0.5?2*prog*prog:1-Math.pow(-2*prog+2,2)/2;
        crackMeshes.forEach((m,i)=>{
          const t=Math.min(Math.max((eased-i/crackMeshes.length*0.5)*2.5,0),1);
          (m.material as THREE.MeshBasicMaterial).opacity=t*(0.8+Math.sin(phaseT*(mode==='slowmo'?8:22)+i)*0.15);
        });
        rimLight.intensity=prog*(2+intensity*0.03);
        fragments.forEach(f=>{
          const sh=prog*0.025;
          f.mesh.position.x=(Math.random()-0.5)*sh;
          f.mesh.position.y=(Math.random()-0.5)*sh;
        });
        if (phaseT>=CRACK_DUR) {
          phase='falling'; phaseT=0; fallT=0;
          setStage('falling');
          shakeActive=true; shakeT=0;
          flashLight.intensity=6+intensity*0.1;
          playCrackSound(intensity, mode);
          setFlashOpacity(0.4+intensity*0.004);
          setTimeout(()=>setFlashOpacity(0),100);
          // Fade overlay
          let oa=1;
          const fadeO=()=>{ oa-=0.08; oc.globalAlpha=Math.max(oa,0); oc.clearRect(0,0,W,H); if(oa>0)requestAnimationFrame(fadeO); };
          fadeO();
        }
      }

      // Falling
      if (phase==='falling') {
        fallT+=rawDt; // fallT always real-time for duration check
        crackMeshes.forEach(m=>{ (m.material as THREE.MeshBasicMaterial).opacity*=0.93; });
        flashLight.intensity=Math.max(0,flashLight.intensity-rawDt*28);
        rimLight.intensity=Math.max(0,rimLight.intensity-rawDt*1.8);

        fragments.forEach(f=>{
          const ft=Math.max(0,fallT-f.delay)*(mode==='slowmo'?cfg.timeScale:1);
          if(ft<=0)return;
          f.vy-=dt*(5.5+intensity*0.04);
          const burst=Math.max(0,1-ft*5)*0.25;
          f.mesh.position.x=f.cx+f.vx*ft+f.cx*burst;
          f.mesh.position.y=f.cy+f.vy*ft;
          f.mesh.position.z=f.vz*ft;
          f.mesh.rotation.x+=f.rx*(1+ft*0.5);
          f.mesh.rotation.y+=f.ry*(1+ft*0.5);
          f.mesh.rotation.z+=f.rz;
          // Mirror: fly opposite direction
          if (f.mirrorMesh) {
            f.mirrorMesh.position.x=-(f.cx+f.vx*ft+f.cx*burst);
            f.mirrorMesh.position.y=f.cy+f.vy*ft;
            f.mirrorMesh.position.z=f.vz*ft;
            f.mirrorMesh.rotation.x=f.mesh.rotation.x;
            f.mirrorMesh.rotation.y=-f.mesh.rotation.y;
            f.mirrorMesh.rotation.z=-f.mesh.rotation.z;
          }
          const mat=f.mesh.material as THREE.MeshStandardMaterial;
          const fade=Math.max(0,1-Math.max(0,ft-1.4)/0.9);
          mat.opacity=fade; mat.transparent=true;
          if (f.mirrorMesh) (f.mirrorMesh.material as THREE.MeshStandardMaterial).opacity=fade;
        });

        // Debris particles
        const pA=pGeo.attributes.position.array as Float32Array;
        const pB=pGeo2.attributes.position.array as Float32Array;
        pMat.opacity=fallT<2.2?Math.max(0,0.85*(1-fallT/2.0)):0;
        pMat2.opacity=fallT<1.8?Math.max(0,0.5*(1-fallT/1.6)):0;
        for(let i=0;i<nParticles;i++){
          const v=pVel[i];
          pA[i*3]+=v[0]*dt; pA[i*3+1]+=(v[1]-fallT*(mode==='fire'?-0.5:3.5))*dt; pA[i*3+2]+=v[2]*dt;
          pB[i*3]=pA[i*3]; pB[i*3+1]=pA[i*3+1]; pB[i*3+2]=pA[i*3+2];
        }
        pGeo.attributes.position.needsUpdate=true;
        pGeo2.attributes.position.needsUpdate=true;

        // Ash/ember
        if(fallT>0.6){
          const arr=ashGeo.attributes.position.array as Float32Array;
          ashMat.opacity=Math.min((fallT-0.6)/0.5,1)*0.6;
          for(let i=0;i<ashCount;i++){
            const v=ashVel[i];
            arr[i*3]+=v[0]*rawDt+Math.sin(totalT*0.5+i)*0.0008;
            arr[i*3+1]+=v[1]*rawDt;
            // Wrap around
            if(cfg.ashUp&&arr[i*3+1]>6) arr[i*3+1]=-5-Math.random()*2;
            if(!cfg.ashUp&&arr[i*3+1]<-6) arr[i*3+1]=6+Math.random()*2;
          }
          ashGeo.attributes.position.needsUpdate=true;
        }

        if(fallT>FALL_DUR){ phase='done'; setStage('done'); onComplete(); }
      }

      renderer.render(scene,camera);
      animId=requestAnimationFrame(tick);
    };
    animId=requestAnimationFrame(tick);

    // ── Fragment tap interaction (exposed via ref) ──
    const halfFOV = Math.tan(22.5 * Math.PI / 180);
    interactRef.current = (sx: number, sy: number) => {
      if (phase !== 'falling') return;
      const halfW = camera.position.z * halfFOV;
      const halfH = halfW * (H / W);
      const wx = ((sx / W) * 2 - 1) * halfW;
      const wy = -((sy / H) * 2 - 1) * halfH;
      let hit = 0;
      fragments.forEach(f => {
        const dx = f.mesh.position.x - wx;
        const dy = f.mesh.position.y - wy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2.2) {
          hit++;
          const force = ((2.2 - dist) / 2.2) * 5;
          const a = Math.atan2(dy, dx);
          f.vx += Math.cos(a) * force * (0.7 + Math.random() * 0.6);
          f.vy += Math.sin(a) * force * (0.5 + Math.random() * 0.5) + 0.8;
          f.vz += (Math.random() - 0.5) * 2.5;
          f.rx += (Math.random() - 0.5) * 0.25;
          f.rz += (Math.random() - 0.5) * 0.2;
        }
      });
      // Flash light burst on hit
      if (hit > 0) { flashLight.intensity = 2 + hit * 0.4; }
    };

    const onResize=()=>{
      const nW=container.clientWidth,nH=container.clientHeight;
      renderer.setSize(nW,nH); camera.aspect=nW/nH; camera.updateProjectionMatrix();
      overlay.width=nW; overlay.height=nH;
    };
    window.addEventListener('resize',onResize);

    return ()=>{
      cancelAnimationFrame(animId);
      if(autoTriggerRef.current)clearTimeout(autoTriggerRef.current);
      window.removeEventListener('resize',onResize);
      overlay.removeEventListener('pointerdown',onPD);
      overlay.removeEventListener('pointermove',onPM);
      overlay.removeEventListener('pointerup',onPU);
      if(container.contains(renderer.domElement))container.removeChild(renderer.domElement);
      renderer.dispose(); msgTex.dispose();
    };
  }, [message, chargeLevel, mode, intensity, nFrags, nParticles, shakeStr, baseSpd, CRACK_DUR, FALL_DUR, cfg, onComplete]);

  // Countdown timer — starts at 3, ticks down while in drawing phase
  useEffect(() => {
    if (stage !== 'drawing' || countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, countdown]);

  // Space key = trigger release
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && stage === 'drawing') { e.preventDefault(); triggerNow(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerNow = () => {
    const fn=(window as unknown as Record<string,unknown>).__unsendTrigger as (()=>void)|undefined;
    if(fn)fn();
  };

  const modeAccent = mode==='fire'?'#FF9500':mode==='mirror'?'#7ab8d4':mode==='slowmo'?'#b4a0d4':'#C53A1E';
  const modeLabel = mode==='fire'?'🔥 Fire':mode==='mirror'?'◎ Mirror':mode==='slowmo'?'◷ Slow-Mo':null;

  return (
    <div className="fixed inset-0 z-50" style={{ background: `#${cfg.bgColor.toString(16).padStart(6,'0')}` }}>
      <div ref={containerRef} className="absolute inset-0 z-0" style={{pointerEvents:'none'}} />
      <canvas ref={overlayRef} className="absolute inset-0 z-10"
        style={{ cursor:stage==='drawing'?'crosshair':'default', display:stage==='drawing'?'block':'none', touchAction:'none' }} />

      {/* Mode badge */}
      {modeLabel && stage !== 'done' && (
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <span className="font-mono text-xs uppercase tracking-widest px-3 py-1"
            style={{ color: modeAccent, border:`1px solid ${modeAccent}40`, background:`${modeAccent}10` }}>
            {modeLabel}
          </span>
        </div>
      )}

      {/* Tap-to-burst during falling */}
      {stage==='falling' && (
        <div className="absolute inset-0 z-5"
          style={{cursor:'crosshair'}}
          onClick={e => { interactRef.current?.(e.clientX, e.clientY); }}
          onTouchStart={e => {
            const t = e.touches[0];
            if (t) interactRef.current?.(t.clientX, t.clientY);
          }}
        />
      )}

      {/* Drawing phase UI */}
      {stage==='drawing' && (
        <div className="absolute inset-x-0 bottom-10 z-20 flex flex-col items-center gap-4 px-6">
          {drawHint && (
            <p className="font-mono text-xs tracking-widest uppercase text-center"
              style={{color:'rgba(140,132,115,0.7)'}}>
              Draw cracks — or wait for auto-release
            </p>
          )}
          <div className="flex gap-6 items-center">
            <button onClick={triggerNow}
              className="font-mono text-xs uppercase tracking-widest px-5 py-3 transition-colors"
              style={{border:`1px solid #2a2820`,color:'#8C8473',background:'transparent'}}
              onMouseEnter={e=>{e.currentTarget.style.color='#F2EFE9';e.currentTarget.style.borderColor=modeAccent;}}
              onMouseLeave={e=>{e.currentTarget.style.color='#8C8473';e.currentTarget.style.borderColor='#2a2820';}}
              data-testid="button-release-now">
              Release now →
            </button>
            {chargeLevel>0&&(
              <span className="font-mono text-xs" style={{color:chargeLevel>70?modeAccent:'#5C5547'}}>
                {Math.round(chargeLevel)}% charge
              </span>
            )}
          </div>
          {/* Countdown + Space hint */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs" style={{color:'#2a2820'}}>
              Space to release
            </span>
            <span className="font-mono text-base tabular-nums"
              style={{color: countdown <= 1 ? modeAccent : '#3a3530',
                transition:'color 0.3s', minWidth:'1.2em', textAlign:'center'}}>
              {countdown > 0 ? countdown : '…'}
            </span>
          </div>
        </div>
      )}

      {/* Status */}
      {stage==='cracking' && (
        <div className="absolute inset-x-0 bottom-12 z-20 flex justify-center">
          <span className="font-mono text-xs tracking-[0.4em] uppercase"
            style={{color:`rgba(${mode==='fire'?'255,149,0':mode==='mirror'?'122,184,212':mode==='slowmo'?'180,160,212':'197,58,30'},${0.5+intensity/200})`}}>
            {intensity>70?'detonating':intensity>40?'releasing':'fading'}
          </span>
        </div>
      )}

      {/* Flash */}
      <div className="absolute inset-0 z-30 pointer-events-none"
        style={{background:mode==='fire'?'#FF6600':mode==='mirror'?'#7ab8d4':mode==='slowmo'?'#b4a0d4':'#F2EFE9',
          opacity:flashOpacity, transition:flashOpacity>0?'none':'opacity 0.15s ease-out'}} />

      {/* Closure */}
      {stage==='done' && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center px-8"
          style={{background:`rgba(${parseInt(cfg.bgColor.toString(16).padStart(6,'0').slice(0,2),16)},${parseInt(cfg.bgColor.toString(16).padStart(6,'0').slice(2,4),16)},${parseInt(cfg.bgColor.toString(16).padStart(6,'0').slice(4,6),16)},0.97)`,
            animation:'fadeInUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards'}}>
          <style>{`
            @keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
            @keyframes pulseModeAccent{0%,100%{opacity:0.3}50%{opacity:0.9}}
          `}</style>
          <div style={{width:36,height:1,background:modeAccent,marginBottom:'2.5rem',animation:'pulseModeAccent 2s ease-in-out infinite'}} />
          <h2 className="font-serif italic text-center leading-tight"
            style={{fontSize:'clamp(2rem,8.5vw,3.8rem)',color:mode==='fire'?'#FF9500':mode==='mirror'?'#D8EDF5':mode==='slowmo'?'#EDE8F5':'#F2EFE9',
              maxWidth:380,marginBottom:'1.2rem',letterSpacing:'-0.01em'}}>
            {closureLine}
          </h2>
          {chargeLevel>60 && (
            <p className="font-mono text-xs tracking-widest uppercase" style={{color:modeAccent,marginBottom:'2.5rem',opacity:0.6}}>
              {chargeLevel>90?'— full release —':'— charged release —'}
            </p>
          )}
          {chargeLevel<=60&&<div style={{marginBottom:'3rem'}}/>}
          <div style={{width:'100%',maxWidth:300,height:1,background:'#1e1c18',marginBottom:'2.5rem'}}/>
          <div style={{display:'flex',gap:'2rem',alignItems:'center',flexWrap:'wrap',justifyContent:'center'}}>
            {(['Write another','Done for now'] as const).map((label,i)=>(
              <button key={label}
                onClick={i===0?onClose:()=>window.location.reload()}
                className="font-mono text-xs uppercase tracking-widest transition-all"
                style={{color:'#8C8473',paddingBottom:2,borderBottom:'1px solid transparent'}}
                onMouseEnter={e=>{e.currentTarget.style.color='#F2EFE9';e.currentTarget.style.borderBottomColor='#F2EFE9';}}
                onMouseLeave={e=>{e.currentTarget.style.color='#8C8473';e.currentTarget.style.borderBottomColor='transparent';}}
                data-testid={i===0?'button-write-another':'button-done'}>
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                const modeTag = mode !== 'default' ? ` [${mode} mode]` : '';
                const chargeTag = chargeLevel > 70 ? ` at ${Math.round(chargeLevel)}% intensity` : '';
                const txt = `Unsent #${releaseCount + 1}${chargeTag}${modeTag} — unsend.games`;
                navigator.clipboard.writeText(txt).then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2200);
                }).catch(() => {});
              }}
              className="font-mono text-xs uppercase tracking-widest transition-all"
              style={{color: copied ? modeAccent : '#5C5547', paddingBottom:2,
                borderBottom: `1px solid ${copied ? modeAccent : 'transparent'}`}}>
              {copied ? 'Copied ✓' : 'Share →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
