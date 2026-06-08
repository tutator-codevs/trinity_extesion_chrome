import browser from 'webextension-polyfill';

import type {
  ActiveTimer,
  RegisterInitial,
  Settings,
  User,
  WorkTemplate,
} from './types';

export type { User, WorkTemplate } from './types';

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  TOKEN_EXPIRES_AT: 'auth_token_expires_at',
  USER: 'auth_user',
  TEMPLATES: 'work_templates',
  SETTINGS: 'settings',
  ACTIVE_TIMER: 'active_timer',
  PENDING_REGISTRATION: 'pending_registration',
};

// El token del backend dura ~4h. Si el login no informa expiración, asumimos este TTL.
const DEFAULT_TOKEN_TTL_MS = 4 * 60 * 60 * 1000;

export const DEFAULT_SETTINGS: Settings = {
  endOfDayEnabled: true,
  endOfDayTime: '18:00',
  targetHours: 8,
  aiProvider: 'none',
  aiApiKey: '',
};

export const storage = {
  async getToken(): Promise<string | null> {
    const data = await browser.storage.local.get(STORAGE_KEYS.TOKEN);
    return (data[STORAGE_KEYS.TOKEN] as string) || null;
  },

  async setToken(token: string, expiresAt?: number): Promise<void> {
    await browser.storage.local.set({
      [STORAGE_KEYS.TOKEN]: token,
      [STORAGE_KEYS.TOKEN_EXPIRES_AT]: expiresAt ?? Date.now() + DEFAULT_TOKEN_TTL_MS,
    });
  },

  async getTokenExpiry(): Promise<number | null> {
    const data = await browser.storage.local.get(STORAGE_KEYS.TOKEN_EXPIRES_AT);
    return (data[STORAGE_KEYS.TOKEN_EXPIRES_AT] as number) ?? null;
  },

  /** true si hay token y no ha expirado. */
  async isSessionValid(): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;
    const expiry = await this.getTokenExpiry();
    return expiry === null || Date.now() < expiry;
  },

  async getUser(): Promise<User | null> {
    const data = await browser.storage.local.get(STORAGE_KEYS.USER);
    const user = (data[STORAGE_KEYS.USER] as User) || null;
    // Sanea sesiones antiguas guardadas sin `userId` (el id del login es el userId).
    if (user && !user.userId && user.id) {
      user.userId = user.id;
    }
    return user;
  },

  async setUser(user: User): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEYS.USER]: user });
  },

  async clearAuth(): Promise<void> {
    await browser.storage.local.remove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRES_AT,
      STORAGE_KEYS.USER,
    ]);
  },

  async getTemplates(): Promise<WorkTemplate[]> {
    const data = await browser.storage.local.get(STORAGE_KEYS.TEMPLATES);
    return (data[STORAGE_KEYS.TEMPLATES] as WorkTemplate[]) || [];
  },

  async saveTemplate(template: WorkTemplate): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex((t) => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    await browser.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: templates });
  },

  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter((t) => t.id !== id);
    await browser.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: filtered });
  },

  async getSettings(): Promise<Settings> {
    const data = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...((data[STORAGE_KEYS.SETTINGS] as Partial<Settings>) ?? {}) };
  },

  async setSettings(settings: Settings): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  },

  async getActiveTimer(): Promise<ActiveTimer | null> {
    const data = await browser.storage.local.get(STORAGE_KEYS.ACTIVE_TIMER);
    return (data[STORAGE_KEYS.ACTIVE_TIMER] as ActiveTimer) || null;
  },

  async setActiveTimer(timer: ActiveTimer): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEYS.ACTIVE_TIMER]: timer });
  },

  async clearActiveTimer(): Promise<void> {
    await browser.storage.local.remove(STORAGE_KEYS.ACTIVE_TIMER);
  },

  async getPendingRegistration(): Promise<RegisterInitial | null> {
    const data = await browser.storage.local.get(STORAGE_KEYS.PENDING_REGISTRATION);
    return (data[STORAGE_KEYS.PENDING_REGISTRATION] as RegisterInitial) || null;
  },

  async setPendingRegistration(pending: RegisterInitial): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEYS.PENDING_REGISTRATION]: pending });
  },

  async clearPendingRegistration(): Promise<void> {
    await browser.storage.local.remove(STORAGE_KEYS.PENDING_REGISTRATION);
  },
};

/** Claves de storage.local usadas (para listeners de `storage.onChanged`). */
export const STORAGE_KEY = STORAGE_KEYS;
