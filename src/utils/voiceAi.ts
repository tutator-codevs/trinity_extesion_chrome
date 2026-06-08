// Respaldo de IA (Camino B) para el llenado por voz. Solo se invoca cuando el parser
// local no está seguro Y el usuario configuró un proveedor + API key en Ajustes.
//
// La key vive solo en storage.local (equipo del usuario); NUNCA se incrusta en el
// bundle. Se llama al proveedor directamente desde la extensión:
//  - Anthropic: header `anthropic-dangerous-direct-browser-access` habilita CORS.
//  - Gemini: la key va como query param de la API de Google.
// Añadir otro proveedor = otra rama en `parseWithAI` + su `call*`.

import type { AiProvider } from './types';
import type { ParsedFields, VoiceContext } from './voiceParse';
import { todayLocalDate } from './time';

// Modelos económicos por proveedor (suficientes para extracción corta).
const ANTHROPIC_MODEL = 'claude-haiku-4-5';
const GEMINI_MODEL = 'gemini-1.5-flash';

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
}

function buildPrompt(transcript: string, ctx: VoiceContext): { system: string; user: string } {
  const taskLabels = Array.from(
    new Set([...ctx.taskProject, ...ctx.taskAdmin].map((t) => t.label))
  );
  const projectNames = ctx.projects.map((p) => p.name);

  const system = [
    'Eres un asistente que convierte una frase hablada (en español o inglés) en los campos de un registro de horas de trabajo.',
    'Devuelve EXCLUSIVAMENTE un objeto JSON válido, sin texto adicional ni ```.',
    'Esquema: {"workType":"PROYECTO"|"ADMINISTRATIVO"|null,"taskLabel":string|null,"projectName":string|null,"description":string|null,"date":"YYYY-MM-DD"|null,"startTime":"HH:mm"|null,"endTime":"HH:mm"|null}',
    'Reglas: taskLabel debe ser EXACTAMENTE una opción de la lista de tareas, o null. projectName debe ser EXACTAMENTE una opción de la lista de proyectos, o null (siempre null si workType es ADMINISTRATIVO). Las horas en formato 24h. description es un texto breve en el idioma original.',
    `Hoy es ${todayLocalDate()} en la zona local del usuario. Resuelve "hoy", "ayer", "today", "yesterday" a fechas reales.`,
  ].join('\n');

  const user = [
    `Tareas válidas: ${JSON.stringify(taskLabels)}`,
    `Proyectos válidos: ${JSON.stringify(projectNames)}`,
    `Frase: "${transcript.trim()}"`,
  ].join('\n');

  return { system, user };
}

async function callAnthropic(system: string, user: string, key: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 400,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { text?: string }[] };
  return data.content?.[0]?.text ?? '';
}

async function callGemini(system: string, user: string, key: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(
    key
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

function normTime(v: string): string {
  const [h, m] = v.split(':');
  return `${h.padStart(2, '0')}:${m}`;
}

function toFields(o: Record<string, unknown>): ParsedFields {
  const f: ParsedFields = {};
  if (o.workType === 'PROYECTO' || o.workType === 'ADMINISTRATIVO') f.workType = o.workType;
  f.taskLabel = str(o.taskLabel);
  f.projectName = str(o.projectName);
  f.description = str(o.description);

  const d = str(o.date);
  if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) f.date = d;
  const s = str(o.startTime);
  if (s && /^\d{1,2}:\d{2}$/.test(s)) f.startTime = normTime(s);
  const e = str(o.endTime);
  if (e && /^\d{1,2}:\d{2}$/.test(e)) f.endTime = normTime(e);
  return f;
}

/** Interpreta la frase con el proveedor configurado. Devuelve null si no hay
 *  proveedor/key o si la llamada falla (el llamador cae al parseo local). */
export async function parseWithAI(
  transcript: string,
  ctx: VoiceContext,
  cfg: AiConfig
): Promise<ParsedFields | null> {
  if (cfg.provider === 'none' || !cfg.apiKey) return null;
  const { system, user } = buildPrompt(transcript, ctx);
  try {
    let raw: string;
    if (cfg.provider === 'anthropic') raw = await callAnthropic(system, user, cfg.apiKey);
    else if (cfg.provider === 'gemini') raw = await callGemini(system, user, cfg.apiKey);
    else return null;
    const obj = extractJson(raw);
    return obj ? toFields(obj) : null;
  } catch {
    return null;
  }
}
