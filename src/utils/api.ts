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

export const api = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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
