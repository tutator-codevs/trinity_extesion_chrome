import { useState, type FormEvent, type JSX } from 'react';
import { Clock, Eye, EyeOff, LogIn } from 'lucide-react';

import { AuthError } from '../utils/api';
import { login } from '../utils/trinity';
import type { User } from '../utils/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { BRAND_GRADIENT } from '../lib/brand';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps): JSX.Element {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(username, password);
      onLoginSuccess(user);
    } catch (err: unknown) {
      let message = 'No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.';
      if (err instanceof AuthError) {
        message = 'Usuario o contraseña incorrectos.';
      } else if (err instanceof Error && err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-[500px] w-full flex-col items-center justify-center gap-6 p-8"
      style={{
        background: 'linear-gradient(160deg, #eef2ff 0%, #ffffff 50%, #fce7f3 100%)',
      }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-2xl text-white shadow-xl"
          style={{ background: BRAND_GRADIENT }}
        >
          <Clock size={30} strokeWidth={2.4} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Trinity</h1>
          <p className="text-sm text-gray-500">Registra tus horas en segundos</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">Usuario</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="tu.usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="pr-9"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 transition-colors hover:text-gray-600"
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Button
          type="submit"
          size="lg"
          className="mt-1 w-full gap-2 border-0 text-white shadow-md hover:opacity-95"
          style={{ background: BRAND_GRADIENT }}
          disabled={loading}
        >
          {loading ? (
            <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <LogIn size={16} />
          )}
          <span>{loading ? 'Entrando…' : 'Entrar'}</span>
        </Button>
      </form>

      <p className="text-center text-xs text-gray-400">
        Acceso corporativo · Tu sesión dura unas 4 horas
      </p>
    </div>
  );
}
