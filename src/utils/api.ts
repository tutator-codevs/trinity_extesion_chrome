import { storage } from './storage';

const BASE_URL = 'https://trinity-backend.tutator.net';

/** Se lanza cuando el backend responde 401 (token caducado/ inválido). La UI debe
 *  capturarla, limpiar la sesión y mostrar el login de nuevo. */
export class AuthError extends Error {
  constructor(message = 'Tu sesión expiró. Inicia sesión de nuevo.') {
    super(message);
    this.name = 'AuthError';
  }
}

interface RequestOptions extends RequestInit {
  useAuth?: boolean;
}

/** Re-login: obtiene un token nuevo. true si lo consiguió. Lo registra `trinity.ts`. */
type ReauthHandler = () => Promise<boolean>;
let reauthHandler: ReauthHandler | null = null;
let reauthInFlight: Promise<boolean> | null = null;

/** Registra cómo re-loguear cuando caduca el token (inyectado para evitar ciclo de
 *  imports api↔trinity). Sin handler, un 401 limpia la sesión como antes. */
export function configureReauth(handler: ReauthHandler): void {
  reauthHandler = handler;
}

/** Ejecuta el re-login compartiendo una sola llamada entre 401 concurrentes. */
function reauthenticate(): Promise<boolean> {
  if (!reauthHandler) return Promise.resolve(false);
  if (!reauthInFlight) {
    reauthInFlight = reauthHandler().finally(() => {
      reauthInFlight = null;
    });
  }
  return reauthInFlight;
}

export const api = {
  async request<T>(
    endpoint: string,
    options: RequestOptions = {},
    retried = false
  ): Promise<T> {
    const { useAuth = true, ...fetchOptions } = options;
    const url = `${BASE_URL}${endpoint}`;

    const headers = new Headers(fetchOptions.headers || {});
    if (useAuth) {
      const token = await storage.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    if (!(fetchOptions.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, { ...fetchOptions, headers });

    if (response.status === 401) {
      // Token caducado/ inválido. Sin refresh-token: intentamos re-login con las
      // credenciales guardadas y reintentamos la petición original una sola vez.
      if (useAuth && !retried && (await reauthenticate())) {
        return this.request<T>(endpoint, options, true);
      }
      await storage.clearAuth();
      throw new AuthError();
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `La petición falló con código ${response.status}`
      );
    }

    return response.json();
  },

  get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
};

export default api;
