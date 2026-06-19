import { useState, useEffect } from "react";
import { LoginScreen } from "./pages/LoginScreen";
import { ComposeScreen } from "./pages/ComposeScreen";
import { ReleaseScreen } from "./pages/ReleaseScreen";

export type ShatterMode = 'default' | 'fire' | 'mirror' | 'slowmo';

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [view, setView] = useState<'login' | 'compose' | 'release'>('login');
  const [message, setMessage] = useState('');
  const [chargeLevel, setChargeLevel] = useState(0);
  const [selectedMode, setSelectedMode] = useState<ShatterMode>('default');

  useEffect(() => {
    const savedUser = localStorage.getItem('unsend_user');
    const savedCount = localStorage.getItem('unsend_count');
    const savedMode = localStorage.getItem('unsend_mode') as ShatterMode | null;
    if (savedUser) { setUser(savedUser); setView('compose'); }
    if (savedCount) setCount(parseInt(savedCount, 10));
    if (savedMode) setSelectedMode(savedMode);
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
  };

  const handleCloseRelease = () => {
    setMessage('');
    setChargeLevel(0);
    setView('compose');
  };

  return (
    <>
      {view === 'login' && <LoginScreen onLogin={handleLogin} />}
      {view === 'compose' && user && (
        <ComposeScreen
          username={user}
          count={count}
          selectedMode={selectedMode}
          onModeChange={handleModeChange}
          onLogout={handleLogout}
          onRelease={handleRelease}
        />
      )}
      {view === 'release' && (
        <ReleaseScreen
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
