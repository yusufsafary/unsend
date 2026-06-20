import { useState, useEffect } from "react";
import { LoginScreen } from "./pages/LoginScreen";
import { ComposeScreen } from "./pages/ComposeScreen";
import { ReleaseScreen } from "./pages/ReleaseScreen";
import { Grain } from "./components/Grain";

export type ShatterMode = 'default' | 'fire' | 'mirror' | 'slowmo';

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [view, setView] = useState<'login' | 'compose' | 'release'>('login');
  const [message, setMessage] = useState('');
  const [chargeLevel, setChargeLevel] = useState(0);
  const [selectedMode, setSelectedMode] = useState<ShatterMode>('default');

  useEffect(() => {
    const savedUser = localStorage.getItem('unsend_user');
    const savedCount = localStorage.getItem('unsend_count');
    const savedMode = localStorage.getItem('unsend_mode') as ShatterMode | null;
    const savedStreak = localStorage.getItem('unsend_streak');
    if (savedUser) { setUser(savedUser); setView('compose'); }
    if (savedCount) setCount(parseInt(savedCount, 10));
    if (savedMode) setSelectedMode(savedMode);
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

  const handleRelease = (msg: string, charge: number) => {
    setMessage(msg);
    setChargeLevel(charge);
    setView('release');
  };

  const handleModeChange = (mode: ShatterMode) => {
    setSelectedMode(mode);
    localStorage.setItem('unsend_mode', mode);
  };

  const handleReleaseComplete = () => {
    const newCount = count + 1;
    setCount(newCount);
    localStorage.setItem('unsend_count', newCount.toString());

    // Streak tracking
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem('unsend_last_date');
    const currentStreak = parseInt(localStorage.getItem('unsend_streak') || '0', 10);
    if (lastDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = lastDate === yesterday ? currentStreak + 1 : 1;
      localStorage.setItem('unsend_streak', newStreak.toString());
      localStorage.setItem('unsend_last_date', today);
      setStreak(newStreak);
    }
  };

  const handleCloseRelease = () => {
    setMessage('');
    setChargeLevel(0);
    setView('compose');
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
          onModeChange={handleModeChange}
          onLogout={handleLogout}
          onRelease={handleRelease}
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
    </>
  );
}

export default App;
