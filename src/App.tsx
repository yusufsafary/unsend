import { useState, useEffect } from "react";
import { LoginScreen } from "./pages/LoginScreen";
import { ComposeScreen } from "./pages/ComposeScreen";
import { ReleaseScreen } from "./pages/ReleaseScreen";

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [view, setView] = useState<'login' | 'compose' | 'release'>('login');
  const [message, setMessage] = useState('');
  const [chargeLevel, setChargeLevel] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('unsend_user');
    const savedCount = localStorage.getItem('unsend_count');
    if (savedUser) { setUser(savedUser); setView('compose'); }
    if (savedCount) setCount(parseInt(savedCount, 10));
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
          onLogout={handleLogout}
          onRelease={handleRelease}
        />
      )}
      {view === 'release' && (
        <ReleaseScreen
          message={message}
          chargeLevel={chargeLevel}
          onComplete={handleReleaseComplete}
          onClose={handleCloseRelease}
        />
      )}
    </>
  );
}

export default App;
