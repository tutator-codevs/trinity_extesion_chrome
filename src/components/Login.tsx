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
import CodevsCredit from './CodevsCredit';
import { makeT, type Dict } from '../i18n/locale';

const dict: Dict = {
  es: {
    tagline: 'Registra tus horas en segundos',
    username: 'Usuario',
    usernamePlaceholder: 'tu.usuario',
    password: 'Contraseña',
    showPassword: 'Mostrar contraseña',
    hidePassword: 'Ocultar contraseña',
    signIn: 'Entrar',
    signingIn: 'Entrando…',
    sessionInfo: 'Acceso corporativo · Tu sesión dura unas 4 horas',
    errorWrongCredentials: 'Usuario o contraseña incorrectos.',
    errorGeneric: 'No pudimos iniciar sesión. Revisa tus datos e inténtalo de nuevo.',
  },
  en: {
    tagline: 'Log your hours in seconds',
    username: 'Username',
    usernamePlaceholder: 'your.username',
    password: 'Password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    signIn: 'Log in',
    signingIn: 'Signing in…',
    sessionInfo: 'Corporate access · Your session lasts about 4 hours',
    errorWrongCredentials: 'Wrong username or password.',
    errorGeneric: "We couldn't sign you in. Check your details and try again.",
  },
  fr: {
    tagline: 'Enregistrez vos heures en quelques secondes',
    username: "Nom d'utilisateur",
    usernamePlaceholder: 'votre.utilisateur',
    password: 'Mot de passe',
    showPassword: 'Afficher le mot de passe',
    hidePassword: 'Masquer le mot de passe',
    signIn: 'Se connecter',
    signingIn: 'Connexion…',
    sessionInfo: 'Accès professionnel · Votre session dure environ 4 heures',
    errorWrongCredentials: 'Identifiant ou mot de passe incorrect.',
    errorGeneric: 'Connexion impossible. Vérifiez vos identifiants et réessayez.',
  },
};
const t = makeT(dict);

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
      let message = t('errorGeneric');
      if (err instanceof AuthError) {
        message = t('errorWrongCredentials');
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
          <p className="text-sm text-gray-500">{t('tagline')}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="username">{t('username')}</Label>
          <Input
            id="username"
            type="text"
            autoComplete="username"
            placeholder={t('usernamePlaceholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t('password')}</Label>
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
              title={showPassword ? t('hidePassword') : t('showPassword')}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
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
          <span>{loading ? t('signingIn') : t('signIn')}</span>
        </Button>
      </form>

      <div className="flex flex-col items-center gap-1">
        <p className="text-center text-xs text-gray-400">{t('sessionInfo')}</p>
        <CodevsCredit />
      </div>
    </div>
  );
}
