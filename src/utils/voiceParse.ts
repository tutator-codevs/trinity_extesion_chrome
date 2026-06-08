// Interpretación local (sin IA) de una frase dictada → campos del formulario.
// Camino A: gratis y offline. Empareja el texto con los catálogos ya cargados
// (tareas, proyectos, tipo de trabajo) y reconoce fechas/horas en español e inglés.
// El resultado se resuelve a códigos del backend con `resolveFields`.

import type { CatalogItem, Project, RegisterInitial, WorkTypeKind } from './types';
import { addDaysToLocalDate, todayLocalDate } from './time';

/** Catálogos disponibles para emparejar lo dictado. */
export interface VoiceContext {
  workTypes: CatalogItem[];
  taskProject: CatalogItem[];
  taskAdmin: CatalogItem[];
  projects: Project[];
}

/** Campos extraídos (con etiquetas legibles, aún sin resolver a códigos). */
export interface ParsedFields {
  workType?: WorkTypeKind;
  taskLabel?: string;
  projectName?: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
}

export interface LocalParseResult {
  fields: ParsedFields;
  /** 0..1 — bajo ⇒ conviene el respaldo de IA (Camino B). */
  confidence: number;
}

// ---------- utilidades de texto ----------

/** Minúsculas y sin acentos, para comparar de forma robusta. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Etiqueta administrativa por su texto (no dependemos de un código fijo). */
function isAdmin(label: string): boolean {
  return label.toUpperCase().includes('ADMIN');
}

/** Texto sin acentos, en minúsculas y sin separadores (para comparar pese a cómo el
 *  dictado parta las palabras: "auto capacitación" ≈ "autocapacitacion"). */
function compress(s: string): string {
  return norm(s).replace(/[^a-z0-9]/g, '');
}

/** Puntúa cuánto encaja `label` con lo dictado (0..1). Combina solapamiento de tokens
 *  (con espacios) y coincidencia compacta (sin espacios), para tolerar etiquetas
 *  multipalabra y nombres cortos partidos por el reconocedor. */
function scoreLabel(t: string, tc: string, label: string): number {
  const labelNorm = norm(label);
  const tokens = labelNorm.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  if (tokens.length === 0) return 0;
  const hits = tokens.filter((w) => t.includes(w) || tc.includes(w)).length;
  let score = hits / tokens.length;
  const labelCompressed = labelNorm.replace(/[^a-z0-9]/g, '');
  if (labelCompressed.length >= 4 && tc.includes(labelCompressed)) score = 1;
  return score;
}

function bestCatalog(text: string, options: CatalogItem[]): { item: CatalogItem; score: number } | null {
  const t = norm(text);
  const tc = compress(text);
  let best: CatalogItem | null = null;
  let bestScore = 0;
  options.forEach((o) => {
    const s = scoreLabel(t, tc, o.label);
    if (s > bestScore) {
      bestScore = s;
      best = o;
    }
  });
  return best ? { item: best, score: bestScore } : null;
}

function bestProject(text: string, projects: Project[]): { item: Project; score: number } | null {
  const t = norm(text);
  const tc = compress(text);
  let best: Project | null = null;
  let bestScore = 0;
  projects.forEach((p) => {
    const s = scoreLabel(t, tc, p.name);
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  });
  return best ? { item: best, score: bestScore } : null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ---------- fechas y horas ----------

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
function mk(h: number, m: number): string {
  return `${pad(h)}:${pad(m)}`;
}
function addMins(h: number, m: number, mins: number): string {
  const total = h * 60 + m + mins;
  return mk(Math.floor(total / 60) % 24, total % 60);
}
function hourTo24(h: number, ap?: string): number {
  if (!ap) return h;
  const a = ap.replace(/\./g, '').toLowerCase();
  if (a.startsWith('p')) return h < 12 ? h + 12 : h;
  if (a.startsWith('a')) return h === 12 ? 0 : h;
  return h;
}

const NUM_WORDS: Record<string, number> = {
  media: 0.5,
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  half: 0.5,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
};

function durWord(w: string): number {
  const n = Number(w.replace(',', '.'));
  if (!Number.isNaN(n)) return n;
  return NUM_WORDS[w] ?? 1;
}

const RANGE_RE =
  /(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?\s*(?:a|hasta|to|al|-|–)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?/;
const START_RE =
  /(?:a las|a la|desde|empez\w*|comenzando|inicio|start(?:ing)?(?: at)?|from|at)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?/;
const DUR_RE =
  /(\d+(?:[.,]\d+)?|media|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|half|one|two|three|four|five|six|seven|eight)\s*(horas?|hours?|minutos?|minutes?|mins?|h)\b/;

/** Resuelve una hora a 24h. Con AM/PM, lo respeta. Sin AM/PM, asume contexto laboral:
 *  las horas 1–6 son de la tarde (13–18); 7–12 y 13–23 se quedan como se dijeron. */
function resolveHour(raw: number, ap?: string): number {
  const h = hourTo24(raw, ap);
  if (ap) return h;
  return raw >= 1 && raw <= 6 ? raw + 12 : raw;
}

function parseTimes(t: string): { start?: string; end?: string } {
  const range = t.match(RANGE_RE);
  if (range) {
    const sh = resolveHour(Number(range[1]), range[3]);
    const sm = Number(range[2] ?? 0);
    let eh = resolveHour(Number(range[4]), range[6]);
    const em = Number(range[5] ?? 0);
    // Salvaguarda: si aun así el fin no supera al inicio, asúmelo de la tarde.
    if (eh * 60 + em <= sh * 60 + sm && eh < 12) eh += 12;
    if (sh <= 24 && eh <= 24) return { start: mk(sh % 24, sm), end: mk(eh % 24, em) };
  }

  const startM = t.match(START_RE);
  if (startM) {
    const sh = resolveHour(Number(startM[1]), startM[3]);
    const sm = Number(startM[2] ?? 0);
    const start = mk(sh % 24, sm);
    const durM = t.match(DUR_RE);
    if (durM) {
      const qty = durWord(durM[1]);
      const mins = /min/.test(durM[2]) ? Math.round(qty) : Math.round(qty * 60);
      return { start, end: addMins(sh, sm, mins) };
    }
    return { start };
  }
  return {};
}

function parseDate(t: string): string | undefined {
  if (/(antier|anteayer|day before yesterday)/.test(t)) return addDaysToLocalDate(todayLocalDate(), -2);
  if (/(ayer|yesterday)/.test(t)) return addDaysToLocalDate(todayLocalDate(), -1);
  if (/(hoy|today)/.test(t)) return todayLocalDate();
  return undefined;
}

function extractDescription(text: string): string | undefined {
  const m = text.match(
    /(?:descripci[oó]n|description|trabajando en|working on|haciendo|sobre|acerca de|about)\s*[:,-]?\s*(.+)$/i
  );
  if (m && m[1].trim().length >= 3) return capitalize(m[1].trim());
  return undefined;
}

// ---------- API pública ----------

/** Interpreta la frase con reglas locales (sin IA). */
export function parseLocal(transcript: string, ctx: VoiceContext): LocalParseResult {
  const t = norm(transcript);
  const fields: ParsedFields = {};
  let score = 0;

  // Tipo de trabajo
  let admin: boolean | undefined;
  if (/(administrativ|administrative|\badmin\b)/.test(t)) {
    admin = true;
    fields.workType = 'ADMINISTRATIVO';
    score += 0.25;
  } else if (/(proyecto|project)/.test(t)) {
    admin = false;
    fields.workType = 'PROYECTO';
    score += 0.25;
  }

  // Tarea
  let taskPool: CatalogItem[];
  if (admin === true) taskPool = ctx.taskAdmin;
  else if (admin === false) taskPool = ctx.taskProject;
  else taskPool = [...ctx.taskProject, ...ctx.taskAdmin];
  const taskM = bestCatalog(transcript, taskPool);
  if (taskM && taskM.score >= 0.5) {
    fields.taskLabel = taskM.item.label;
    score += 0.35;
    if (admin === undefined) {
      admin = ctx.taskAdmin.some((x) => x.code === taskM.item.code);
      fields.workType = admin ? 'ADMINISTRATIVO' : 'PROYECTO';
    }
  }

  // Proyecto (si no es administrativo)
  if (admin !== true) {
    const pm = bestProject(transcript, ctx.projects);
    if (pm && pm.score >= 0.5) {
      fields.projectName = pm.item.name;
      score += 0.2;
      if (admin === undefined) fields.workType = 'PROYECTO';
    }
  }

  // Fecha y horas
  fields.date = parseDate(t);
  const times = parseTimes(t);
  if (times.start) {
    fields.startTime = times.start;
    score += 0.15;
  }
  if (times.end) {
    fields.endTime = times.end;
    score += 0.05;
  }

  // Descripción explícita ("descripción ...", "working on ...")
  const desc = extractDescription(transcript);
  if (desc) fields.description = desc;

  return { fields, confidence: Math.min(1, score) };
}

/** Resuelve etiquetas a los códigos del backend que precargan el formulario. */
export function resolveFields(fields: ParsedFields, ctx: VoiceContext): RegisterInitial {
  const out: RegisterInitial = {};

  let admin: boolean | undefined;
  if (fields.workType === 'ADMINISTRATIVO') admin = true;
  else if (fields.workType === 'PROYECTO') admin = false;

  if (admin !== undefined) {
    const wt = ctx.workTypes.find((w) => isAdmin(w.label) === admin);
    if (wt) out.workTypeCt = wt.code;
  }

  if (fields.taskLabel) {
    let pool: CatalogItem[];
    if (admin === true) pool = ctx.taskAdmin;
    else if (admin === false) pool = ctx.taskProject;
    else pool = [...ctx.taskProject, ...ctx.taskAdmin];
    const m = bestCatalog(fields.taskLabel, pool);
    if (m && m.score >= 0.34) out.typeTaskCt = m.item.code;
  }

  if (admin === true) {
    out.projectId = null;
  } else if (fields.projectName) {
    const pm = bestProject(fields.projectName, ctx.projects);
    if (pm && pm.score >= 0.34) out.projectId = pm.item.id;
  }

  if (fields.description) out.description = fields.description;
  if (fields.date) out.date = fields.date;
  if (fields.startTime) out.startTime = fields.startTime;
  if (fields.endTime) out.endTime = fields.endTime;
  return out;
}
