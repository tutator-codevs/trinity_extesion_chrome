import { useCallback, useEffect, useState, type JSX } from 'react';

import Login from '../components/Login';
import Dashboard from '../components/Dashboard';
import { storage } from '../utils/storage';
import type { User } from '../utils/types';

export default function Popup(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const valid = await storage.isSessionValid();
      if (valid) {
        setUser(await storage.getUser());
      } else {
        await storage.clearAuth();
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  const handleLogout = useCallback(async () => {
    await storage.clearAuth();
    setUser(null);
  }, []);

  let content: JSX.Element;
  if (loading) {
    content = (
      <div className="flex min-h-[500px] flex-col items-center justify-center gap-3 bg-slate-50">
        <span className="size-9 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        <p className="animate-pulse text-sm font-medium text-slate-500">Cargando…</p>
      </div>
    );
  } else if (!user) {
    content = <Login onLoginSuccess={setUser} />;
  } else {
    content = (
      <Dashboard user={user} onLogout={handleLogout} onSessionExpired={handleLogout} />
    );
  }

  return (
    <div id="my-ext" data-theme="light" className="w-full font-sans">
      {content}
    </div>
  );
}
