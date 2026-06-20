import type { ShatterMode } from '../App';

export interface Zone {
  id: string;
  name: string;
  subtitle: string;
  lore: string;
  unlockAt: number;
  modeId: ShatterMode;
  bossName: string;
  bossLore: string;
  bossRequiredCharge: number;
  defeatLine: string;
  color: string;
  symbol: string;
}

export const ZONES: Zone[] = [
  {
    id: 'wasteland',
    name: 'The Wasteland',
    subtitle: 'Where all unsent things rest',
    lore: 'A barren plain of forgotten words. Every message never sent drifts here, waiting for release.',
    unlockAt: 0,
    modeId: 'default',
    bossName: 'The Echo',
    bossLore: 'A phantom made of your own voice, repeating what you should have said.',
    bossRequiredCharge: 50,
    defeatLine: 'The echo falls silent.',
    color: '#8C8473',
    symbol: '◈',
  },
  {
    id: 'inferno',
    name: 'The Inferno',
    subtitle: 'Where anger burns forever',
    lore: 'The flames here are fueled by rage that was swallowed. Every word you held back feeds the fire.',
    unlockAt: 3,
    modeId: 'fire',
    bossName: 'The Burning Regret',
    bossLore: 'It wears the face of your anger and speaks in your voice. The fire grows when you look away.',
    bossRequiredCharge: 60,
    defeatLine: 'The fire consumes itself.',
    color: '#ff5a1a',
    symbol: '◉',
  },
  {
    id: 'mirror-realm',
    name: 'The Mirror Realm',
    subtitle: 'Where reflections speak truth',
    lore: "Every surface shows what you refused to see. The truth you never told faces you here.",
    unlockAt: 6,
    modeId: 'mirror',
    bossName: 'The Reflection',
    bossLore: "Your own face, speaking every word you never said. It won't stop until you shatter it.",
    bossRequiredCharge: 65,
    defeatLine: 'Both reflections shatter at once.',
    color: '#7ab8d4',
    symbol: '◎',
  },
  {
    id: 'cathedral',
    name: 'The Cathedral of Time',
    subtitle: 'Where moments never end',
    lore: 'Time crawls here. You relive every moment you wish had lasted longer — or shorter.',
    unlockAt: 10,
    modeId: 'slowmo',
    bossName: 'The Frozen Moment',
    bossLore: 'A crystallized instant that refuses to pass. It stretches around you like amber, holding you still.',
    bossRequiredCharge: 70,
    defeatLine: 'The moment finally passes.',
    color: '#b4a0d4',
    symbol: '◷',
  },
  {
    id: 'vortex-nexus',
    name: 'The Vortex Nexus',
    subtitle: 'Where everything spirals inward',
    lore: 'A maelstrom of unfinished thoughts. What you meant to say circles endlessly, never landing.',
    unlockAt: 15,
    modeId: 'vortex',
    bossName: 'The Grand Spiral',
    bossLore: 'The accumulation of every circling thought you never resolved. The harder you hold on, the faster it spins.',
    bossRequiredCharge: 75,
    defeatLine: 'The spiral unravels into silence.',
    color: '#8855ff',
    symbol: '◌',
  },
  {
    id: 'glitch-matrix',
    name: 'The Glitch Matrix',
    subtitle: 'Where reality corrupts',
    lore: 'A fractured digital realm where memories are compressed and corrupted. Nothing here is what it seems.',
    unlockAt: 20,
    modeId: 'glitch',
    bossName: 'The Final Corruption',
    bossLore: 'Every lie you ever told yourself, assembled into form. It feeds on your self-deception.',
    bossRequiredCharge: 85,
    defeatLine: 'The corruption crashes. You remain.',
    color: '#00cc66',
    symbol: '▣',
  },
];

export interface Quest {
  id: string;
  chapter: number;
  title: string;
  desc: string;
  objective: string;
  unlockAt: number;
  reward: { xp: number; item?: string };
  check: (params: {
    count: number;
    streak: number;
    mode: ShatterMode;
    isRage: boolean;
    charge: number;
    isDaily: boolean;
  }) => boolean;
}

export const QUESTS: Quest[] = [
  {
    id: 'q1', chapter: 1, title: 'First Words', desc: 'Step into the Wasteland.',
    objective: 'Complete 1 release', unlockAt: 0, reward: { xp: 30 },
    check: ({ count }) => count >= 1,
  },
  {
    id: 'q2', chapter: 1, title: 'The Rage Within', desc: 'Let the fury speak.',
    objective: 'Release in RAGE mode (type in CAPS)', unlockAt: 0, reward: { xp: 50, item: 'rage_crystal' },
    check: ({ isRage }) => isRage,
  },
  {
    id: 'q3', chapter: 1, title: 'Full Charge', desc: 'Hold nothing back.',
    objective: 'Release at 95%+ charge', unlockAt: 0, reward: { xp: 60 },
    check: ({ charge }) => charge >= 95,
  },
  {
    id: 'q4', chapter: 2, title: 'Into the Fire', desc: 'Enter the Inferno.',
    objective: 'Use Fire mode', unlockAt: 2, reward: { xp: 70, item: 'charge_amplifier' },
    check: ({ mode }) => mode === 'fire',
  },
  {
    id: 'q5', chapter: 2, title: 'Three Days', desc: 'Return again and again.',
    objective: '3-day streak', unlockAt: 2, reward: { xp: 80 },
    check: ({ streak }) => streak >= 3,
  },
  {
    id: 'q6', chapter: 2, title: 'Into the Mirror', desc: 'Face what you refused to see.',
    objective: 'Use Mirror mode', unlockAt: 5, reward: { xp: 100, item: 'echo_stone' },
    check: ({ mode }) => mode === 'mirror',
  },
  {
    id: 'q7', chapter: 3, title: 'Perfect Storm', desc: 'Full power, full fury.',
    objective: 'Full charge + RAGE mode together', unlockAt: 5, reward: { xp: 150, item: 'void_shard' },
    check: ({ charge, isRage }) => charge >= 95 && isRage,
  },
  {
    id: 'q8', chapter: 3, title: 'The Patient One', desc: 'Let time do the work.',
    objective: 'Use Slow-Mo mode', unlockAt: 9, reward: { xp: 120 },
    check: ({ mode }) => mode === 'slowmo',
  },
  {
    id: 'q9', chapter: 4, title: 'The Spiral Awaits', desc: 'Enter the Vortex Nexus.',
    objective: 'Use Vortex mode', unlockAt: 14, reward: { xp: 150 },
    check: ({ mode }) => mode === 'vortex',
  },
  {
    id: 'q10', chapter: 4, title: 'System Override', desc: 'Corrupt the signal.',
    objective: 'Use Glitch mode', unlockAt: 19, reward: { xp: 200 },
    check: ({ mode }) => mode === 'glitch',
  },
  {
    id: 'q11', chapter: 5, title: 'Week of Truth', desc: 'Seven days of reckoning.',
    objective: '7-day streak', unlockAt: 10, reward: { xp: 250, item: 'echo_stone' },
    check: ({ streak }) => streak >= 7,
  },
  {
    id: 'q12', chapter: 5, title: 'Daily Devotion', desc: 'Answer the call of the universe.',
    objective: 'Complete a daily challenge', unlockAt: 3, reward: { xp: 80 },
    check: ({ isDaily }) => isDaily,
  },
  {
    id: 'q13', chapter: 6, title: 'The Century', desc: '100 acts of release.',
    objective: '100 total releases', unlockAt: 50, reward: { xp: 1000, item: 'void_shard' },
    check: ({ count }) => count >= 100,
  },
];

export interface Item {
  id: string;
  name: string;
  desc: string;
  effect: 'rage' | 'charge_speed' | 'double_frags' | 'void';
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
}

export const ITEMS: Record<string, Item> = {
  rage_crystal: {
    id: 'rage_crystal', name: 'Rage Crystal',
    desc: 'Auto-activates rage mode for your next release.',
    effect: 'rage', icon: '◉', rarity: 'common',
  },
  charge_amplifier: {
    id: 'charge_amplifier', name: 'Charge Amplifier',
    desc: 'Your charge fills 2× faster this release.',
    effect: 'charge_speed', icon: '⚡', rarity: 'rare',
  },
  echo_stone: {
    id: 'echo_stone', name: 'Echo Stone',
    desc: 'Doubles the fragment count on release.',
    effect: 'double_frags', icon: '◎', rarity: 'rare',
  },
  void_shard: {
    id: 'void_shard', name: 'Void Shard',
    desc: 'Fragments defy gravity — rise upward.',
    effect: 'void', icon: '◌', rarity: 'legendary',
  },
};

export const ITEM_RARITY_COLOR: Record<string, string> = {
  common: '#8C8473',
  rare: '#7ab8d4',
  legendary: '#8855ff',
};

export interface AdventureState {
  inventory: string[];
  completedQuests: string[];
  bossesDefeated: number[];
  activeItemEffects: string[];
}

export function loadAdventureState(): AdventureState {
  try {
    const raw = localStorage.getItem('unsend_adventure');
    if (raw) return { activeItemEffects: [], ...JSON.parse(raw) };
  } catch { /* */ }
  return { inventory: [], completedQuests: [], bossesDefeated: [], activeItemEffects: [] };
}

export function saveAdventureState(state: AdventureState) {
  localStorage.setItem('unsend_adventure', JSON.stringify(state));
}

export function getCurrentZone(modeId: ShatterMode): Zone {
  return ZONES.find(z => z.modeId === modeId) ?? ZONES[0];
}

export function getBossForCount(count: number): Zone | null {
  if (count === 0 || count % 5 !== 0) return null;
  const idx = Math.min(Math.floor(count / 5) - 1, ZONES.length - 1);
  return ZONES[idx];
}

export function getActiveQuests(completedQuests: string[], count: number): Quest[] {
  return QUESTS.filter(q => !completedQuests.includes(q.id) && count >= q.unlockAt);
}

export function checkQuestCompletions(
  activeQuests: Quest[],
  params: { count: number; streak: number; mode: ShatterMode; isRage: boolean; charge: number; isDaily: boolean }
): Quest[] {
  return activeQuests.filter(q => q.check(params));
}

export function addItemsToInventory(inventory: string[], items: string[]): string[] {
  const next = [...inventory];
  for (const item of items) {
    if (next.length < 3) next.push(item);
  }
  return next;
}
