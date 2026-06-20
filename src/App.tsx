import { useState, useEffect, useCallback } from "react";
import { LoginScreen } from "./pages/LoginScreen";
import { ComposeScreen } from "./pages/ComposeScreen";
import { ReleaseScreen } from "./pages/ReleaseScreen";
import { StatsScreen } from "./pages/StatsScreen";
import { Grain } from "./components/Grain";
import { AchievementToast } from "./components/AchievementToast";
import {
  loadGameState, saveGameState, calcXPGain, getLevelFromXP,
  checkNewAchievements, isDailyCompleted,
  type GameState,
} from "./lib/gameState";

export type ShatterMode = 'default' | 'fire' | 'mirror' | 'slowmo' | 'vortex' | 'glitch';

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [view, setView] = useState<'login' | 'compose' | 'release' | 'stats'>('login');
  const [message, setMessage] = useState('');
  const [chargeLevel, setChargeLevel] = useState(0);
  const [selectedMode, setSelectedMode] = useState<ShatterMode>('default');
  const [isRageOnRelease, setIsRageOnRelease] = useState(false);
  const [messageLength, setMessageLength] = useState(0);

  const [gameState, setGameState] = useState<GameState>(loadGameState);
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [pendingXP, setPendingXP] = useState<number | null>(null);
  const [pendingLevelUp, setPendingLevelUp] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [dailyUsed, setDailyUsed] = useState(false);

  useEffect(() => {
    const savedUser  = localStorage.getItem('unsend_user');
    const savedCount = localStorage.getItem('unsend_count');
    const savedMode  = localStorage.getItem('unsend_mode') as ShatterMode | null;
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

  const handleReleaseComplete = useCallback(() => {
    const newCount = count + 1;
    setCount(newCount);
    localStorage.setItem('unsend_count', newCount.toString());

    // Streak tracking
    const today = new Date().toISOString().slice(0, 10);
    const lastDate  = localStorage.getItem('unsend_last_date');
    const currentSt = parseInt(localStorage.getItem('unsend_streak') || '0', 10);
    let newStreak   = currentSt;
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      newStreak = lastDate === yesterday ? currentSt + 1 : 1;
      localStorage.setItem('unsend_streak', newStreak.toString());
      localStorage.setItem('unsend_last_date', today);
      setStreak(newStreak);
    }

    // XP / level / achievements
    setGameState(prev => {
      const isFullCharge    = chargeLevel >= 95;
      const isPerfectStorm  = isFullCharge && isRageOnRelease;
      const wasDailyDone    = isDailyCompleted(prev);

      // Combo: within 60s window
      const now = Date.now();
      const withinWindow = (now - prev.lastReleaseTime) < 60000;
      const newCombo = withinWindow ? prev.comboCount + 1 : 1;

      const xpGained = calcXPGain({
        chargeLevel,
        messageLength,
        streak: newStreak,
        isRage: isRageOnRelease,
        isFullCharge,
        isDailyComplete: dailyUsed && !wasDailyDone,
        comboCount: newCombo,
      });

      const newXP    = prev.xp + xpGained;
      const newLevel = getLevelFromXP(newXP);
      const leveledUp = newLevel > prev.level;

      // Daily challenge completion
      let newDailyCompleted = prev.dailyChallengesCompleted;
      let newLastDailyDate  = prev.lastDailyDate;
      if (dailyUsed && !wasDailyDone) {
        newDailyCompleted++;
        newLastDailyDate = today;
      }

      const next: GameState = {
        ...prev,
        xp: newXP,
        level: newLevel,
        achievements: { ...prev.achievements },
        dailyChallengesCompleted: newDailyCompleted,
        lastDailyDate: newLastDailyDate,
        comboCount: newCombo,
        lastReleaseTime: now,
      };

      const newAchs = checkNewAchievements(next, {
        count: newCount, streak: newStreak,
        isRage: isRageOnRelease, isFullCharge, level: newLevel, isPerfectStorm,
      });

      saveGameState(next);

      // Queue toast after state settles
      setTimeout(() => {
        setPendingXP(xpGained);
        if (leveledUp) setPendingLevelUp(newLevel);
        if (newAchs.length) setPendingAchievements(newAchs);
        setShowToast(true);
      }, 900);

      return next;
    });
  }, [count, chargeLevel, isRageOnRelease, messageLength, dailyUsed]);

  const handleCloseRelease = () => {
    setMessage('');
    setChargeLevel(0);
    setIsRageOnRelease(false);
    setDailyUsed(false);
    setView('compose');
  };

  const handleToastDone = () => {
    setShowToast(false);
    setPendingXP(null);
    setPendingLevelUp(null);
    setPendingAchievements([]);
  };

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
          onModeChange={handleModeChange}
          onLogout={handleLogout}
          onRelease={handleRelease}
          onOpenStats={() => setView('stats')}
          onDailyUsed={() => setDailyUsed(true)}
        />
      )}
      {view === 'release' && (
        <ReleaseScreen
          releaseCount={count}
          message={message}
          chargeLevel={chargeLevel}
          mode={selectedMode}
          onComplete={handleReleaseComplete}
          onClose={handleCloseRelease}
        />
      )}
      {view === 'stats' && (
        <StatsScreen
          gameState={gameState}
          count={count}
          streak={streak}
          onClose={() => setView('compose')}
        />
      )}
      {showToast && (view === 'compose') && (
        <AchievementToast
          achievementIds={pendingAchievements}
          xpGained={pendingXP ?? undefined}
          levelUp={pendingLevelUp}
          onDone={handleToastDone}
        />
      )}
    </>
  );
}

export default App;
