// Servicio de dominio: envuelve los endpoints del backend de Trinity con tipos.
// La UI usa estas funciones en lugar de llamar a `api` directamente.

import { api } from './api';
import { storage } from './storage';
import type {
  CatalogItem,
  Project,
  Summary,
  TimecardInput,
  User,
} from './types';

interface LoginResponse {
  token: string;
  user: Record<string, unknown>;
  /** Algunos backends ponen el userId también a nivel raíz. */
  userId?: string;
  /** Epoch ms de expiración, si el backend lo informa. */
  expiresAt?: number;
}

/** Login: persiste token (con expiración) y usuario. Devuelve el usuario. */
export async function login(username: string, password: string): Promise<User> {
  const res = await api.post<LoginResponse>(
    '/user/login',
    { username, password },
    { useAuth: false }
  );
  const raw = res.user ?? {};
  const user: User = {
    userId: (raw.userId ?? raw.id ?? res.userId ?? '') as string,
    username: (raw.username ?? raw.name ?? username) as string,
    firstName: raw.firstName as string | undefined,
    lastName: raw.lastName as string | undefined,
    email: raw.email as string | undefined,
    roles: raw.roles as string[] | undefined,
    id: raw.id as string | undefined,
  };

  await storage.setToken(res.token, res.expiresAt);
  await storage.setUser(user);
  return user;
}

/** Resumen de horas del usuario en un rango (instantes ISO UTC). */
export function getSummary(userId: string, start: string, end: string): Promise<Summary> {
  return api.post<Summary>('/summary', { start, end, userId });
}

/** Proyectos activos (para el select "Proyecto" cuando el trabajo es PROYECTO). */
export function findProjects(): Promise<Project[]> {
  return api.post<Project[]>('/gen/find-many', {
    select: ['id', 'name'],
    model: 'tri_project',
    filter: { orderBy: { name: 'asc' }, where: { statusCt: '1' } },
  });
}

/** Inserta un registro de horas (tri_timecard) via el endpoint genérico. */
export function insertTimecard(data: TimecardInput): Promise<unknown> {
  return api.post('/gen/insert', { model: 'tri_timecard', data, userId: data.userId });
}

// Códigos de catálogo usados por el formulario.
export const CATALOG_CODES = {
  WORK_TYPE: 'TR-WORK-TYPE',
  TASK_TYPE: 'TR-TYPE-TASK', // tareas cuando el trabajo es PROYECTO
  ADM_TYPE: 'TR-ADM-TYPE', // tareas cuando el trabajo es ADMINISTRATIVO
  TIMECARD_STATUS: 'TR-TIMECARD-STATUS',
} as const;

type RawCatalogItem = Record<string, unknown>;

// Forma de cada ítem del backend:
//   { catalogCode, catalogCodeDep, label, order, value }
// `value` es el código que se envía (p.ej. "580-30", "510-40 " con espacios) y
// `label` es el texto visible. Se conserva `value` tal cual (no se hace trim).
function normalizeCatalogItem(item: RawCatalogItem): CatalogItem | null {
  const code = (item.value ?? item.code ?? item.id) as string | undefined;
  const label = (item.label ?? item.name ?? item.value) as string | undefined;
  if (code === undefined || label === undefined) return null;
  return { code, label };
}

/** Idioma corto del navegador (p.ej. "es", "en"); por defecto "es". */
function browserLang(): string {
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return (nav.split('-')[0] || 'es').toLowerCase();
}

/** Descarga varios catálogos a la vez y los devuelve normalizados (ordenados por
 *  `order`) por código. */
export async function getCatalogs(
  codes: string[],
  lang: string = browserLang()
): Promise<Record<string, CatalogItem[]>> {
  const res = await api.post<Record<string, unknown>>('/catalogs/get-catalogs', {
    catalogs: codes,
    lang,
  });
  return Object.fromEntries(
    codes.map((code) => {
      const raw = (res[code] ??
        (res.catalogs as Record<string, unknown> | undefined)?.[code] ??
        []) as RawCatalogItem[];
      const items = Array.isArray(raw)
        ? [...raw]
            .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
            .map(normalizeCatalogItem)
            .filter((x): x is CatalogItem => x !== null)
        : [];
      return [code, items];
    })
  );
}
