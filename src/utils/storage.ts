import browser from 'webextension-polyfill';

export interface User {
  id: string;
  username: string;
  email: string;
  // Add other user fields as returned by the API
}

export interface WorkTemplate {
  id: string;
  name: string;
  workType: 'PROYECTO' | 'ADMINISTRATIVO';
  project: string;
  taskType: string;
  description: string;
}

const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'auth_user',
  TEMPLATES: 'work_templates',
};

export const storage = {
  async getToken(): Promise<string | null> {
    const data = await browser.storage.local.get(STORAGE_KEYS.TOKEN);
    return data[STORAGE_KEYS.TOKEN] || null;
  },

  async setToken(token: string): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEYS.TOKEN]: token });
  },

  async getUser(): Promise<User | null> {
    const data = await browser.storage.local.get(STORAGE_KEYS.USER);
    return data[STORAGE_KEYS.USER] || null;
  },

  async setUser(user: User): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEYS.USER]: user });
  },

  async clearAuth(): Promise<void> {
    await browser.storage.local.remove([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
  },

  async getTemplates(): Promise<WorkTemplate[]> {
    const data = await browser.storage.local.get(STORAGE_KEYS.TEMPLATES);
    return data[STORAGE_KEYS.TEMPLATES] || [];
  },

  async saveTemplate(template: WorkTemplate): Promise<void> {
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === template.id);
    if (index >= 0) {
      templates[index] = template;
    } else {
      templates.push(template);
    }
    await browser.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: templates });
  },

  async deleteTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    const filtered = templates.filter(t => t.id !== id);
    await browser.storage.local.set({ [STORAGE_KEYS.TEMPLATES]: filtered });
  },
};
