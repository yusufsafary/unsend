export interface Achievement {
  id: string;
  title: string;
  desc: string;
  icon: string;
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood',    title: 'First Release',     desc: 'Make your very first release',                  icon: '◈' },
  { id: 'full_charge',    title: 'Full Charge',        desc: 'Release at 95%+ charge',                        icon: '⚡' },
  { id: 'rage',           title: 'Rage Mode',          desc: 'Release in full rage mode',                     icon: '◉' },
  { id: 'perfect_storm',  title: 'Perfect Storm',      desc: 'Full charge + rage mode in one release',        icon: '◈' },
  { id: 'streak_3',       title: 'Three Peat',         desc: 'Maintain a 3-day streak',                       icon: '◈' },
  { id: 'streak_7',       title: 'Week Warrior',       desc: 'Maintain a 7-day streak',                       icon: '◷' },
  { id: 'century',        title: 'Century',            desc: 'Complete 100 releases',                         icon: '◎' },
  { id: 'mode_fire',      title: 'On Fire',            desc: 'Unlock Fire mode (3 releases)',                  icon: '◉' },
  { id: 'mode_mirror',    title: 'Reflection',         desc: 'Unlock Mirror mode (6 releases)',                icon: '◎' },
  { id: 'mode_slowmo',    title: 'Time Bender',        desc: 'Unlock Slow-Mo mode (10 releases)',             icon: '◷' },
  { id: 'mode_vortex',    title: 'Into the Vortex',   desc: 'Unlock Vortex mode (15 releases)',              icon: '◌' },
  { id: 'mode_glitch',    title: 'System Failure',     desc: 'Unlock Glitch mode (20 releases)',              icon: '▣' },
  { id: 'level_5',        title: 'Mid-Game',           desc: 'Reach Level 5',                                 icon: '◈' },
  { id: 'level_10',       title: 'Veteran',            desc: 'Reach Level 10',                                icon: '◈' },
  { id: 'daily_3',        title: 'Ritual',             desc: 'Complete 3 daily challenges',                   icon: '◈' },
];

export const LEVEL_THRESHOLDS = [0, 50, 130, 250, 420, 650, 950, 1350, 1900, 2600, 3500];

export function getLevelFromXP(xp: number): number {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return Math.min(level, LEVEL_THRESHOLDS.length);
}

export function getXPProgress(xp: number, level: number): { current: number; needed: number; pct: number } {
  const start = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const end   = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const current = xp - start;
  const needed  = end - start;
  return { current, needed, pct: needed > 0 ? Math.min((current / needed) * 100, 100) : 100 };
}

export interface GameState {
  xp: number;
  level: number;
  achievements: Record<string, number>;
  dailyChallengesCompleted: number;
  lastDailyDate: string;
  comboCount: number;
  lastReleaseTime: number;
}

const DEFAULTS: GameState = {
  xp: 0, level: 1, achievements: {},
  dailyChallengesCompleted: 0, lastDailyDate: '',
  comboCount: 0, lastReleaseTime: 0,
};

export function loadGameState(): GameState {
  try {
    const raw = localStorage.getItem('unsend_gamestate');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULTS };
}

export function saveGameState(state: GameState) {
  localStorage.setItem('unsend_gamestate', JSON.stringify(state));
}

export function calcXPGain(p: {
  chargeLevel: number;
  messageLength: number;
  streak: number;
  isRage: boolean;
  isFullCharge: boolean;
  isDailyComplete: boolean;
  comboCount: number;
}): number {
  let xp = 10;
  xp += Math.round((p.chargeLevel / 100) * 15);
  xp += Math.min(Math.round(p.messageLength / 20), 10);
  xp += Math.min(p.streak - 1, 6);
  if (p.isRage) xp += 8;
  if (p.isFullCharge) xp += 10;
  if (p.isDailyComplete) xp += 50;
  if (p.comboCount >= 2) xp = Math.round(xp * (1 + (p.comboCount - 1) * 0.2));
  return xp;
}

export const DAILY_PROMPTS = [
  "Write to someone you forgave but never told",
  "Say what you wish you'd said at the worst moment",
  "Write to your past self — one year ago",
  "Tell them what you really meant that day",
  "Write the words you swallowed to keep the peace",
  "Say what you've been rehearsing in your head",
  "Write to someone who'll never know how much they hurt you",
  "Tell the truth you've been softening for years",
  "Write to the version of you that almost gave up",
  "Say what you needed to hear but never did",
  "Write the apology you'll never send",
  "Tell them what you actually felt that night",
];

export function getDailyPrompt(): string {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_PROMPTS[day % DAILY_PROMPTS.length];
}

export function isDailyCompleted(state: GameState): boolean {
  return state.lastDailyDate === new Date().toISOString().slice(0, 10);
}

export function checkNewAchievements(
  state: GameState,
  p: { count: number; streak: number; isRage: boolean; isFullCharge: boolean; level: number; isPerfectStorm: boolean; }
): string[] {
  const newOnes: string[] = [];
  const already = state.achievements;
  const now = Date.now();
  const mark = (id: string) => { if (!already[id]) { already[id] = now; newOnes.push(id); } };

  if (p.count >= 1)   mark('first_blood');
  if (p.isFullCharge) mark('full_charge');
  if (p.isRage)       mark('rage');
  if (p.isPerfectStorm) mark('perfect_storm');
  if (p.streak >= 3)  mark('streak_3');
  if (p.streak >= 7)  mark('streak_7');
  if (p.count >= 100) mark('century');
  if (p.count >= 3)   mark('mode_fire');
  if (p.count >= 6)   mark('mode_mirror');
  if (p.count >= 10)  mark('mode_slowmo');
  if (p.count >= 15)  mark('mode_vortex');
  if (p.count >= 20)  mark('mode_glitch');
  if (p.level >= 5)   mark('level_5');
  if (p.level >= 10)  mark('level_10');
  if (state.dailyChallengesCompleted >= 3) mark('daily_3');

  return newOnes;
}
