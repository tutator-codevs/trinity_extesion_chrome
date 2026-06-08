// Tipos de dominio de Trinity, alineados con el backend (tri_timecard, tri_project,
// catálogos). Ver CLAUDE.md → "Backend (Trinity API)" para el contrato completo.

export type WorkTypeKind = 'PROYECTO' | 'ADMINISTRATIVO';

export interface User {
  /** Identificador que va en cada registro, p.ej. "U-0000-2026-09" (= `id` del login). */
  userId: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roles?: string[];
  id?: string;
}

/** Item normalizado de /catalogs/get-catalogs. El `code` se envía tal cual al
 *  backend (puede contener espacios, p.ej. "510-40 "); `label` es lo visible. */
export interface CatalogItem {
  code: string;
  label: string;
}

/** Proyecto de tri_project (via /gen/find-many). */
export interface Project {
  id: string;
  name: string;
}

/** Registro de horas tal como lo devuelve el backend (tri_timecard). */
export interface Timecard {
  id: string;
  workTypeCt: string;
  typeTaskCt: string;
  description: string;
  projectId: string | null;
  date: string; // YYYY-MM-DD (local)
  start: string; // ISO UTC
  end: string; // ISO UTC
  hours: string;
  statusCt: string;
  softDelete: boolean;
  userId: string;
  createdAt?: string;
  updatedAt?: string | number;
}

/** Campos de `data` para insertar un timecard via /gen/insert. */
export interface TimecardInput {
  workTypeCt: string;
  typeTaskCt: string;
  description: string;
  projectId: string | null;
  date: string;
  start: string;
  end: string;
  hours: string;
  statusCt: string;
  softDelete: boolean;
  userId: string;
}

export interface SummaryBucket {
  label: string;
  value: number;
  valueLabel: string;
}

/** Respuesta de /summary. */
export interface Summary {
  totalHours: number;
  averageHours: number;
  hoursByDay: SummaryBucket[];
  hoursByProject: SummaryBucket[];
  hoursByStatus: SummaryBucket[];
  hoursByTypeProject: SummaryBucket[];
  hoursByTypeAdministrative: SummaryBucket[];
  timecards: Timecard[];
}

/** Valores con los que precargar el formulario de registro (plantilla, reutilizar
 *  un registro, o cierre de cronómetro). */
export interface RegisterInitial {
  workTypeCt?: string;
  typeTaskCt?: string;
  projectId?: string | null;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
}

/** Proveedor de IA para el respaldo del llenado por voz. 'none' = solo parser local. */
export type AiProvider = 'none' | 'anthropic' | 'gemini';

/** Ajustes del usuario (persistidos en storage.local). */
export interface Settings {
  /** Aviso de cierre de día activado. */
  endOfDayEnabled: boolean;
  /** Hora local del aviso, 'HH:mm' (por defecto 18:00). */
  endOfDayTime: string;
  /** Horas objetivo del día (para avisar si faltan). */
  targetHours: number;
  /** Proveedor de IA opcional para el llenado por voz (respaldo del parser local). */
  aiProvider: AiProvider;
  /** API key del proveedor. Se guarda solo en este equipo; nunca viaja en el bundle. */
  aiApiKey: string;
}

/** Cronómetro de actividad en curso. */
export interface ActiveTimer {
  label: string;
  /** Epoch ms de inicio. */
  startedAt: number;
}

/** Plantilla de imputación reutilizable (persistida en storage.local).
 *  Guarda los **códigos** que se envían al backend (para aplicar sin re-resolver) y
 *  etiquetas de display para mostrarla legible sin volver a pedir catálogos. */
export interface WorkTemplate {
  id: string;
  name: string;
  workTypeCt: string;
  workTypeLabel: string;
  typeTaskCt: string;
  taskLabel: string;
  projectId: string | null;
  projectName: string | null;
  description: string;
}
