import { useState, useEffect, useCallback } from "react";
import { LoginScreen } from "./pages/LoginScreen";
import { ComposeScreen } from "./pages/ComposeScreen";
import { ReleaseScreen } from "./pages/ReleaseScreen";
import { StatsScreen } from "./pages/StatsScreen";
import { MapScreen } from "./pages/MapScreen";
import { AboutScreen } from "./pages/AboutScreen";
import { HowToPlayScreen } from "./pages/HowToPlayScreen";
import { Grain } from "./components/Grain";
import { AchievementToast } from "./components/AchievementToast";
import {
  loadGameState, saveGameState, calcXPGain, getLevelFromXP,
  checkNewAchievements, isDailyCompleted,
  type GameState,
} from "./lib/gameState";
import {
  loadAdventureState, saveAdventureState, getCurrentZone, getBossForCount,
  getActiveQuests, checkQuestCompletions, addItemsToInventory,
  type AdventureState, type Quest,
} from "./lib/adventure";

export type ShatterMode = 'default' | 'fire' | 'mirror' | 'slowmo' | 'vortex' | 'glitch';
type View = 'login' | 'compose' | 'release' | 'stats' | 'map' | 'about' | 'howtoplay';

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [view, setView] = useState<View>('login');
  const [message, setMessage] = useState('');
  const [chargeLevel, setChargeLevel] = useState(0);
  const [selectedMode, setSelectedMode] = useState<ShatterMode>('default');
  const [isRageOnRelease, setIsRageOnRelease] = useState(false);
  const [messageLength, setMessageLength] = useState(0);

  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [adventureState, setAdventureState] = useState<AdventureState>(loadAdventureState);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [pendingXP, setPendingXP] = useState<number | null>(null);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const [pendingQuestTitles, setPendingQuestTitles] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(false);
  const [bossForRelease, setBossForRelease] = useState<ReturnType<typeof getBossForCount>>(null);

  useEffect(() => {
    const savedUser   = localStorage.getItem('unsend_user');
    const savedCount  = localStorage.getItem('unsend_count');
    const savedMode   = localStorage.getItem('unsend_mode') as ShatterMode | null;
    const savedStreak = localStorage.getItem('unsend_streak');
    if (savedUser) { setUser(savedUser); setView('compose'); }
    if (savedCount) setCount(parseInt(savedCount, 10));
    if (savedMode)  setSelectedMode(savedMode);
    if (savedStreak) setStreak(parseInt(savedStreak, 10));
  }, []);

  const handleLogin = (username: string) => {
    localStorage.setItem('unsend_user', username);
    setUser(username);
    setView('compose');
  };

  const handleLogout = () => {
    localStorage.removeItem('unsend_user');
    setUser(null);
    setView('login');
  };

  const handleRelease = (msg: string, charge: number, isRage: boolean, msgLength: number) => {
    const nextCount = count + 1;
    setBossForRelease(getBossForCount(nextCount));
    setMessage(msg);
    setChargeLevel(charge);
    setIsRageOnRelease(isRage);
    setMessageLength(msgLength);
    setView('release');
  };

  const handleModeChange = (mode: ShatterMode) => {
    setSelectedMode(mode);
    localStorage.setItem('unsend_mode', mode);
  };

  const handleUseItem = useCallback((itemId: string) => {
    const EFFECT_MAP: Record<string, string> = {
      rage_crystal: 'rage',
      charge_amplifier: 'charge_speed',
      echo_stone: 'double_frags',
      void_shard: 'void',
    };
    setAdventureState(prev => {
      if (!prev.inventory.includes(itemId)) return prev;
      const effect = EFFECT_MAP[itemId] ?? '';
      const alreadyActive = prev.activeItemEffects.includes(effect);
      const next: AdventureState = {
        ...prev,
        activeItemEffects: alreadyActive
          ? prev.activeItemEffects.filter(e => e !== effect)
          : [...prev.activeItemEffects, effect],
      };
      saveAdventureState(next);
      return next;
    });
  }, []);

  const handleReleaseComplete = useCallback(() => {
    const newCount = count + 1;
    setCount(newCount);
    localStorage.setItem('unsend_count', newCount.toString());

    const today = new Date().toISOString().slice(0, 10);
    const lastDate   = localStorage.getItem('unsend_last_date');
    const currentSt  = parseInt(localStorage.getItem('unsend_streak') || '0', 10);
    let newStreak    = currentSt;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      newStreak = lastDate === yesterday ? currentSt + 1 : 1;
      localStorage.setItem('unsend_streak', newStreak.toString());
      localStorage.setItem('unsend_last_date', today);
      setStreak(newStreak);
    }

    let questXP = 0;
    let completedQuestsList: Quest[] = [];

    setAdventureState(prev => {
      const active = getActiveQuests(prev.completedQuests, newCount);
      const completed = checkQuestCompletions(active, {
        count: newCount, streak: newStreak, mode: selectedMode,
        isRage: isRageOnRelease, charge: chargeLevel, isDaily: dailyUsed,
      });
      completedQuestsList = completed;
      questXP = completed.reduce((s, q) => s + q.reward.xp, 0);
      const questItems = completed.flatMap(q => q.reward.item ? [q.reward.item] : []);

      const boss = getBossForCount(newCount);
      const bossDefeated = boss !== null && chargeLevel >= boss.bossRequiredCharge;
      if (bossDefeated) questXP += 200;

      const bossItem = bossDefeated ? (() => {
        const bossItems = ['rage_crystal', 'charge_amplifier', 'echo_stone', 'void_shard'];
        return bossItems[Math.min(Math.floor(newCount / 5) - 1, bossItems.length - 1)];
      })() : null;

      const allNewItems = bossItem ? [...questItems, bossItem] : questItems;

      const next: AdventureState = {
        completedQuests: [...prev.completedQuests, ...completed.map(q => q.id)],
        bossesDefeated: bossDefeated ? [...prev.bossesDefeated, newCount] : prev.bossesDefeated,
        inventory: addItemsToInventory(prev.inventory, allNewItems),
        activeItemEffects: [],
      };
      saveAdventureState(next);
      return next;
    });

    setGameState(prev => {
      const isFullCharge   = chargeLevel >= 95;
      const isPerfectStorm = isFullCharge && isRageOnRelease;
      const wasDailyDone   = isDailyCompleted(prev);
      const now = Date.now();
      const withinWindow = (now - prev.lastReleaseTime) < 60000;
      const newCombo = withinWindow ? prev.comboCount + 1 : 1;

      const xpBase = calcXPGain({
        chargeLevel, messageLength, streak: newStreak,
        isRage: isRageOnRelease, isFullCharge,
        isDailyComplete: dailyUsed && !wasDailyDone,
        comboCount: newCombo,
      });
      const xpGained = xpBase + questXP;
      const newXP    = prev.xp + xpGained;
      const newLevel = getLevelFromXP(newXP);
      const leveledUp = newLevel > prev.level;

      let newDailyCompleted = prev.dailyChallengesCompleted;
      let newLastDailyDate  = prev.lastDailyDate;
      if (dailyUsed && !wasDailyDone) {
        newDailyCompleted++;
        newLastDailyDate = today;
      }

      const next: GameState = {
        ...prev, xp: newXP, level: newLevel,
        achievements: { ...prev.achievements },
        dailyChallengesCompleted: newDailyCompleted,
        lastDailyDate: newLastDailyDate,
        comboCount: newCombo, lastReleaseTime: now,
      };

      const newAchs = checkNewAchievements(next, {
        count: newCount, streak: newStreak,
        isRage: isRageOnRelease, isFullCharge, level: newLevel, isPerfectStorm,
      });

      saveGameState(next);

      setTimeout(() => {
        setPendingXP(xpGained);
        if (leveledUp) setPendingLevelUp(newLevel);
        if (newAchs.length) setPendingAchievements(newAchs);
        if (completedQuestsList.length) setPendingQuestTitles(completedQuestsList.map(q => q.title));
        setShowToast(true);
      }, 900);

      return next;
    });
  }, [count, chargeLevel, isRageOnRelease, messageLength, dailyUsed, selectedMode]);

  const handleCloseRelease = () => {
    setMessage('');
    setChargeLevel(0);
    setIsRageOnRelease(false);
    setDailyUsed(false);
    setBossForRelease(null);
    setView('compose');
  };

  const handleToastDone = () => {
    setShowToast(false);
    setPendingXP(null);
    setPendingLevelUp(null);
    setPendingAchievements([]);
    setPendingQuestTitles([]);
  };

  const currentZone = getCurrentZone(selectedMode);
  const isBossNext  = (count + 1) > 0 && (count + 1) % 5 === 0;
  const nextBossZone = isBossNext ? getBossForCount(count + 1) : null;
  const activeQuestsList = getActiveQuests(adventureState.completedQuests, count);

  return (
    <>
      <Grain />

      {view === 'login' && <LoginScreen onLogin={handleLogin} />}

      {view === 'compose' && user && (
        <ComposeScreen
          username={user}
          count={count}
          streak={streak}
          selectedMode={selectedMode}
          gameState={gameState}
          adventureState={adventureState}
          currentZone={currentZone}
          isBossNext={isBossNext}
          nextBossZone={nextBossZone}
          activeQuests={activeQuestsList}
          onModeChange={handleModeChange}
          onLogout={handleLogout}
          onRelease={handleRelease}
          onOpenStats={() => setView('stats')}
          onOpenMap={() => setView('map')}
          onOpenAbout={() => setView('about')}
          onOpenHowToPlay={() => setView('howtoplay')}
          onDailyUsed={() => setDailyUsed(true)}
          onUseItem={handleUseItem}
        />
      )}

      {view === 'release' && (
        <ReleaseScreen
          releaseCount={count}
          message={message}
          chargeLevel={chargeLevel}
          mode={selectedMode}
          bossZone={bossForRelease}
          activeItemEffects={adventureState.activeItemEffects}
          onComplete={handleReleaseComplete}
          onClose={handleCloseRelease}
        />
      )}

      {view === 'stats' && user && (
        <StatsScreen
          gameState={gameState}
          adventureState={adventureState}
          count={count}
          streak={streak}
          username={user}
          onClose={() => setView('compose')}
        />
      )}

      {view === 'map' && (
        <MapScreen
          count={count}
          selectedMode={selectedMode}
          adventureState={adventureState}
          onClose={() => setView('compose')}
          onSelectZone={(mode) => { handleModeChange(mode); setView('compose'); }}
        />
      )}

      {view === 'about' && <AboutScreen onClose={() => setView('compose')} />}
      {view === 'howtoplay' && <HowToPlayScreen onClose={() => setView('compose')} />}

      {showToast && view === 'compose' && (
        <AchievementToast
          achievementIds={pendingAchievements}
          xpGained={pendingXP ?? undefined}
          levelUp={pendingLevelUp}
          questTitles={pendingQuestTitles}
          onDone={handleToastDone}
        />
      )}
    </>
  );
}

export default App;
