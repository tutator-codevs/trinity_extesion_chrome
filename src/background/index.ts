import browser from 'webextension-polyfill';
import type { Notifications } from 'webextension-polyfill';

import { storage, STORAGE_KEY } from '../utils/storage';
import { getSummary } from '../utils/trinity';
import { dayRangeUtc, todayLocalDate } from '../utils/time';
import {
  elapsedMinutes,
  startActivity,
  stopActivity,
  TIMER_CHECK_MINUTES,
} from '../utils/timer';
import { makeT, type Dict } from '../i18n/locale';

const dict: Dict = {
  es: {
    eodTitle: 'Cierre de día · Trinity',
    eodOpen: 'Es hora de cerrar tu día. Abre Trinity para revisar y registrar tus horas.',
    eodNone: 'No has registrado horas hoy (objetivo {target}h). ¿Las registramos?',
    eodPartial: 'Llevas {worked}h de {target}h. Te faltan {remaining}h por registrar.',
    eodDone: '¡Listo! Registraste {worked}h hoy. Buen trabajo.',
    timerStillTitle: '¿Sigues en tu actividad?',
    timerStillMessage: 'Llevas {min} min en "{label}".',
    timerDoneTitle: 'Actividad terminada · Trinity',
    timerDoneMessage: 'Registra {start}–{end}. Abre Trinity para guardar.',
    timerStartedTitle: 'Cronómetro iniciado · Trinity',
    timerStartedMessage: 'Registrando "Reunión". Te avisaré en 30 min.',
    btnLog: 'Registrar horas',
    btnYes: 'Sigo',
    btnDone: 'Terminé',
  },
  en: {
    eodTitle: 'End of day · Trinity',
    eodOpen: "It's time to wrap up your day. Open Trinity to review and log your hours.",
    eodNone: "You haven't logged any hours today (target {target}h). Shall we log them?",
    eodPartial: "You're at {worked}h of {target}h. {remaining}h left to log.",
    eodDone: 'Done! You logged {worked}h today. Nice work.',
    timerStillTitle: 'Still in the meeting?',
    timerStillMessage: "You're at {min} min in \"{label}\".",
    timerDoneTitle: 'Activity finished · Trinity',
    timerDoneMessage: 'Log {start}–{end}. Open Trinity to save.',
    timerStartedTitle: 'Timer started · Trinity',
    timerStartedMessage: 'Logging "Meeting". I\'ll remind you in 30 min.',
    btnLog: 'Log hours',
    btnYes: 'Yes',
    btnDone: 'Done',
  },
  fr: {
    eodTitle: 'Fin de journée · Trinity',
    eodOpen:
      'Il est temps de clôturer votre journée. Ouvrez Trinity pour vérifier et saisir vos heures.',
    eodNone:
      'Vous n’avez saisi aucune heure aujourd’hui (objectif {target}h). On les saisit ?',
    eodPartial: 'Vous êtes à {worked}h sur {target}h. Il reste {remaining}h à saisir.',
    eodDone: 'Terminé ! Vous avez saisi {worked}h aujourd’hui. Beau travail.',
    timerStillTitle: 'Toujours en réunion ?',
    timerStillMessage: 'Vous êtes à {min} min sur « {label} ».',
    timerDoneTitle: 'Activité terminée · Trinity',
    timerDoneMessage: 'Saisir {start}–{end}. Ouvrez Trinity pour enregistrer.',
    timerStartedTitle: 'Chronomètre démarré · Trinity',
    timerStartedMessage: 'Enregistrement de « Réunion ». Je vous préviendrai dans 30 min.',
    btnLog: 'Saisir les heures',
    btnYes: 'Oui',
    btnDone: 'Plus tard',
  },
};

const t = makeT(dict);

const ALARM_END_OF_DAY = 'trinity-end-of-day';
const ALARM_TIMER_CHECK = 'trinity-timer-check';
const NOTIF_END_OF_DAY = 'trinity-end-of-day';
const NOTIF_TIMER = 'trinity-timer-check';
const NOTIF_TIMER_DONE = 'trinity-timer-done';

const icon = () => browser.runtime.getURL('icon128.png');

/** Rechaza si la promesa no resuelve en `ms`; evita que una red lenta bloquee el aviso. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), ms);
    }),
  ]);
}

// `buttons`/`requireInteraction` son de Chrome; los tipos del polyfill (subconjunto
// cross-browser) no los incluyen, así que tipamos aparte y casteamos al crear.
type NotifOptions = Notifications.CreateNotificationOptions & {
  buttons?: { title: string }[];
  requireInteraction?: boolean;
};

async function notify(id: string, options: NotifOptions): Promise<string> {
  try {
    return await browser.notifications.create(
      id,
      options as Notifications.CreateNotificationOptions
    );
  } catch (err) {
    // Causas típicas: iconUrl que no se puede descargar ("Unable to download all
    // specified images") o `buttons`/`requireInteraction` no soportados. Reintentamos
    // con una notificación mínima para que el aviso salga igualmente.
    // eslint-disable-next-line no-console
    console.warn('[Trinity] notificación completa falló, reintento básico:', err);
    try {
      const { title, message } = options;
      return await browser.notifications.create(id, {
        type: 'basic',
        iconUrl: icon(),
        title: title ?? 'Trinity',
        message: message ?? '',
      } as Notifications.CreateNotificationOptions);
    } catch (err2) {
      // eslint-disable-next-line no-console
      console.error('[Trinity] no se pudo crear la notificación:', err2);
      return '';
    }
  }
}

function openPopup(): void {
  // openPopup existe en MV3 reciente; puede fallar según navegador/contexto.
  try {
    const maybe = browser.action.openPopup?.();
    if (maybe && typeof (maybe as Promise<void>).catch === 'function') {
      (maybe as Promise<void>).catch(() => {});
    }
  } catch {
    /* el usuario abrirá el popup manualmente */
  }
}

/** Abre el popup directamente en el formulario de registro (con prefill opcional). */
async function openRegister(): Promise<void> {
  const pending = await storage.getPendingRegistration();
  if (!pending) await storage.setPendingRegistration({});
  openPopup();
}

// ---------- Cierre de día ----------

/** Epoch ms de la próxima ocurrencia local de 'HH:mm'. */
function nextOccurrenceMs(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime();
}

async function scheduleEndOfDay(): Promise<void> {
  await browser.alarms.clear(ALARM_END_OF_DAY);
  const settings = await storage.getSettings();
  if (!settings.endOfDayEnabled) return;
  browser.alarms.create(ALARM_END_OF_DAY, {
    when: nextOccurrenceMs(settings.endOfDayTime),
    periodInMinutes: 24 * 60,
  });
}

async function handleEndOfDay(): Promise<void> {
  const settings = await storage.getSettings();
  const user = await storage.getUser();

  // worked = null cuando no se pudo verificar (sin sesión válida o error de red).
  // El summary lleva timeout: la red no debe impedir que el aviso salga.
  let worked: number | null = null;
  if (user && (await storage.isSessionValid())) {
    try {
      const { start, end } = dayRangeUtc(todayLocalDate());
      const summary = await withTimeout(getSummary(user.userId, start, end), 5000);
      worked = summary.totalHours ?? 0;
    } catch {
      worked = null;
    }
  }

  const { targetHours } = settings;
  let message: string;
  if (worked === null) {
    message = t('eodOpen');
  } else if (worked <= 0) {
    message = t('eodNone', { target: targetHours });
  } else if (worked < targetHours) {
    message = t('eodPartial', {
      worked,
      target: targetHours,
      remaining: targetHours - worked,
    });
  } else {
    message = t('eodDone', { worked });
  }

  // eslint-disable-next-line no-console
  console.log('[Trinity] cierre de día → worked:', worked, '· mensaje:', message);

  await notify(NOTIF_END_OF_DAY, {
    type: 'basic',
    iconUrl: icon(),
    title: t('eodTitle'),
    message,
    buttons: [{ title: t('btnLog') }],
    priority: 2,
    requireInteraction: true,
  });
}

// ---------- Cronómetro ----------

function scheduleTimerCheck(): void {
  browser.alarms.create(ALARM_TIMER_CHECK, { delayInMinutes: TIMER_CHECK_MINUTES });
}

async function handleTimerCheck(): Promise<void> {
  const timer = await storage.getActiveTimer();
  if (!timer) return;
  // El SW de MV3 se termina al quedar inactivo; await-eamos para que no muera
  // antes de que la notificación se cree (si no, "a ratos no sale").
  await notify(NOTIF_TIMER, {
    type: 'basic',
    iconUrl: icon(),
    title: t('timerStillTitle'),
    message: t('timerStillMessage', { min: elapsedMinutes(timer), label: timer.label }),
    buttons: [{ title: t('btnYes') }, { title: t('btnDone') }],
    priority: 2,
    requireInteraction: true,
  });
}

/** Comando de teclado / botón: alterna iniciar y terminar la actividad. */
async function toggleTimer(): Promise<void> {
  const timer = await storage.getActiveTimer();
  if (timer) {
    const initial = await stopActivity();
    if (initial) {
      await storage.setPendingRegistration(initial);
      await notify(NOTIF_TIMER_DONE, {
        type: 'basic',
        iconUrl: icon(),
        title: t('timerDoneTitle'),
        message: t('timerDoneMessage', {
          start: initial.startTime ?? '',
          end: initial.endTime ?? '',
        }),
        buttons: [{ title: t('btnLog') }],
        priority: 2,
      });
    }
    openPopup();
  } else {
    await startActivity();
    await notify(`${NOTIF_TIMER}-started`, {
      type: 'basic',
      iconUrl: icon(),
      title: t('timerStartedTitle'),
      message: t('timerStartedMessage'),
      priority: 1,
    });
  }
}

// ---------- Listeners ----------

async function handleAlarm(name: string): Promise<void> {
  if (name === ALARM_END_OF_DAY) await handleEndOfDay();
  else if (name === ALARM_TIMER_CHECK) await handleTimerCheck();
}

browser.alarms.onAlarm.addListener((alarm) => {
  handleAlarm(alarm.name).catch(() => {});
});

browser.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (notificationId === NOTIF_TIMER) {
    if (buttonIndex === 0) {
      scheduleTimerCheck(); // "Sigo": vuelve a preguntar en 30 min
    } else {
      toggleTimer(); // "Terminé": detiene y abre el formulario
    }
    browser.notifications.clear(notificationId);
  } else if (notificationId === NOTIF_END_OF_DAY) {
    openRegister();
    browser.notifications.clear(notificationId);
  } else if (notificationId === NOTIF_TIMER_DONE) {
    openPopup(); // el pending ya está guardado: el popup abre el formulario
    browser.notifications.clear(notificationId);
  }
});

browser.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('trinity-')) {
    openPopup();
    browser.notifications.clear(notificationId);
  }
});

browser.commands.onCommand.addListener((command) => {
  if (command === 'toggle-timer') toggleTimer();
});

// Permite probar el aviso de cierre de día al instante desde Ajustes.
browser.runtime.onMessage.addListener((message: unknown) => {
  if ((message as { type?: string } | null)?.type === 'trinity-test-eod') {
    // eslint-disable-next-line no-console
    console.log('[Trinity] test-eod recibido → generando aviso');
    // Devolver la promesa mantiene vivo el SW hasta crear la notificación.
    return handleEndOfDay();
  }
  return undefined;
});

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[STORAGE_KEY.SETTINGS]) scheduleEndOfDay();
  if (changes[STORAGE_KEY.ACTIVE_TIMER]) {
    if (changes[STORAGE_KEY.ACTIVE_TIMER].newValue) {
      scheduleTimerCheck();
    } else {
      browser.alarms.clear(ALARM_TIMER_CHECK);
    }
  }
});

browser.runtime.onInstalled.addListener(() => {
  scheduleEndOfDay();
});

browser.runtime.onStartup.addListener(() => {
  scheduleEndOfDay();
});

// Asegura la alarma también al despertar el service worker.
scheduleEndOfDay();
