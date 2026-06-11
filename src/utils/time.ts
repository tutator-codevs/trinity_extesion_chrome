// Conversión hora local <-> UTC.
//
// El backend guarda los instantes en UTC-0 y cada usuario está en una zona horaria
// distinta; la extensión convierte usando la zona del navegador. Las horas que el
// usuario ve/elige son "hora de pared" local; `start`/`end` viajan como ISO UTC y
// `date` es la fecha local (YYYY-MM-DD).

/** 'YYYY-MM-DD' (local) -> Date a medianoche local. */
function parseLocalDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

/** Fecha local en formato 'YYYY-MM-DD'. */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Fecha local de hoy en 'YYYY-MM-DD'. */
export function todayLocalDate(): string {
  return toLocalDateString(new Date());
}

/** Suma (o resta) días a una fecha local 'YYYY-MM-DD'. */
export function addDaysToLocalDate(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return toLocalDateString(new Date(y, m - 1, d + days));
}

/** Etiqueta legible de una fecha local, p.ej. "lun, 9 jun" (idioma del navegador). */
export function formatLocalDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return '—';
  const dt = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat(navigator.language || 'es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(dt);
}

/** ('YYYY-MM-DD' local, 'HH:mm' local) -> instante ISO en UTC. */
export function localToUtcIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}

/** Instante ISO UTC -> 'HH:mm' en hora local. */
export function utcIsoToLocalTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Una fecha como 'HH:mm' en hora local. */
export function localTimeOf(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Los timecards van en bloques de 15 min. */
export const QUARTER_MS = 15 * 60 * 1000;

/** Redondea una fecha hacia abajo al cuarto de hora local (..:00/15/30/45). */
export function floorToQuarter(d: Date): Date {
  return new Date(Math.floor(d.getTime() / QUARTER_MS) * QUARTER_MS);
}

/** Redondea una fecha hacia arriba al cuarto de hora local. */
export function ceilToQuarter(d: Date): Date {
  return new Date(Math.ceil(d.getTime() / QUARTER_MS) * QUARTER_MS);
}

/** Hora local actual como 'HH:mm'. */
export function nowLocalTime(): string {
  return localTimeOf(new Date());
}

/** Suma `mins` minutos a una hora 'HH:mm' (se mantiene dentro del día). */
export function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Diferencia entre dos 'HH:mm' (local) en horas, como string ("3", "1.5"). */
export function diffHours(startTime: string, endTime: string): string {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  const hours = mins / 60;
  return String(Number.isInteger(hours) ? hours : Number(hours.toFixed(2)));
}

/** Rango [lunes 00:00, lunes+7 00:00) de la semana local actual, en ISO UTC.
 *  Pensado para el payload de /summary. */
export function currentWeekRangeUtc(): { start: string; end: string } {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7; // getDay(): 0=domingo
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - daysSinceMonday,
    0, 0, 0, 0
  );
  const nextMonday = new Date(
    monday.getFullYear(),
    monday.getMonth(),
    monday.getDate() + 7,
    0, 0, 0, 0
  );
  return { start: monday.toISOString(), end: nextMonday.toISOString() };
}

/** Rango [00:00, 24:00) de una fecha local ('YYYY-MM-DD') en ISO UTC. */
export function dayRangeUtc(date: string): { start: string; end: string } {
  const day = parseLocalDate(date);
  const next = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1, 0, 0, 0, 0);
  return { start: day.toISOString(), end: next.toISOString() };
}

/** Rango [primer día del mes 00:00, mañana 00:00) en ISO UTC; es decir, el mes
 *  local actual hasta el final del día de hoy ("a la fecha actual"). */
export function currentMonthToDateRangeUtc(): { start: string; end: string } {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return { start: firstOfMonth.toISOString(), end: tomorrow.toISOString() };
}

/** Fecha local 'YYYY-MM-DD' del lunes de la semana actual. */
export function currentWeekStartLocalDate(): string {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7; // getDay(): 0=domingo
  return toLocalDateString(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceMonday)
  );
}

/** Fecha local 'YYYY-MM-DD' del primer día del mes actual. */
export function currentMonthStartLocalDate(): string {
  const now = new Date();
  return toLocalDateString(new Date(now.getFullYear(), now.getMonth(), 1));
}
