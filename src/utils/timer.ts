// Lógica del cronómetro de actividad, compartida entre el popup y el background.

import { storage } from './storage';
import {
  ceilToQuarter,
  floorToQuarter,
  localTimeOf,
  QUARTER_MS,
  toLocalDateString,
} from './time';
import type { ActiveTimer, RegisterInitial } from './types';

export const DEFAULT_ACTIVITY_LABEL = 'Reunión';
/** Cada cuánto el background pregunta "¿sigues en la actividad?". */
export const TIMER_CHECK_MINUTES = 30;

/** Inicia una actividad. El background, al detectar el cambio en storage, programa
 *  la alarma de "¿sigues?". */
export async function startActivity(label: string = DEFAULT_ACTIVITY_LABEL): Promise<void> {
  await storage.setActiveTimer({ label: label.trim() || DEFAULT_ACTIVITY_LABEL, startedAt: Date.now() });
}

/** Convierte un cronómetro en valores para precargar el formulario de registro.
 *  Los timecards van en bloques de 15 min: se redondea el inicio hacia abajo y el
 *  fin hacia arriba (mínimo un bloque de 15 min). */
export function timerToInitial(timer: ActiveTimer, end: Date = new Date()): RegisterInitial {
  const start = floorToQuarter(new Date(timer.startedAt));
  let finish = ceilToQuarter(end);
  if (finish.getTime() <= start.getTime()) {
    finish = new Date(start.getTime() + QUARTER_MS);
  }
  return {
    description: timer.label,
    date: toLocalDateString(start),
    startTime: localTimeOf(start),
    endTime: localTimeOf(finish),
  };
}

/** Detiene la actividad y devuelve los valores para registrar (o null si no había). */
export async function stopActivity(): Promise<RegisterInitial | null> {
  const timer = await storage.getActiveTimer();
  await storage.clearActiveTimer();
  return timer ? timerToInitial(timer) : null;
}

/** Minutos transcurridos desde el inicio del cronómetro. */
export function elapsedMinutes(timer: ActiveTimer): number {
  return Math.max(0, Math.round((Date.now() - timer.startedAt) / 60000));
}
