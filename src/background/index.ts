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

const ALARM_END_OF_DAY = 'trinity-end-of-day';
const ALARM_TIMER_CHECK = 'trinity-timer-check';
const NOTIF_END_OF_DAY = 'trinity-end-of-day';
const NOTIF_TIMER = 'trinity-timer-check';
const NOTIF_TIMER_DONE = 'trinity-timer-done';

const icon = () => browser.runtime.getURL('icon128.png');

// `buttons`/`requireInteraction` son de Chrome; los tipos del polyfill (subconjunto
// cross-browser) no los incluyen, así que tipamos aparte y casteamos al crear.
type NotifOptions = Notifications.CreateNotificationOptions & {
  buttons?: { title: string }[];
  requireInteraction?: boolean;
};

function notify(id: string, options: NotifOptions): Promise<string> {
  return browser.notifications
    .create(id, options as Notifications.CreateNotificationOptions)
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[Trinity] no se pudo crear la notificación:', err);
      return '';
    });
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
  let worked: number | null = null;
  if (user && (await storage.isSessionValid())) {
    try {
      const { start, end } = dayRangeUtc(todayLocalDate());
      const summary = await getSummary(user.userId, start, end);
      worked = summary.totalHours ?? 0;
    } catch {
      worked = null;
    }
  }

  const { targetHours } = settings;
  let message: string;
  if (worked === null) {
    message = 'Es hora de cerrar tu día. Abre Trinity para revisar y registrar tus horas.';
  } else if (worked <= 0) {
    message = `No has registrado horas hoy (objetivo ${targetHours}h). ¿Las registramos?`;
  } else if (worked < targetHours) {
    message = `Llevas ${worked}h de ${targetHours}h. Te faltan ${targetHours - worked}h por registrar.`;
  } else {
    message = `¡Listo! Registraste ${worked}h hoy. Buen trabajo.`;
  }

  // eslint-disable-next-line no-console
  console.log('[Trinity] cierre de día → worked:', worked, '· mensaje:', message);

  await notify(NOTIF_END_OF_DAY, {
    type: 'basic',
    iconUrl: icon(),
    title: 'Cierre de día · Trinity',
    message,
    buttons: [{ title: 'Registrar horas' }],
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
  notify(NOTIF_TIMER, {
    type: 'basic',
    iconUrl: icon(),
    title: '¿Sigues en tu actividad?',
    message: `Llevas ${elapsedMinutes(timer)} min en "${timer.label}".`,
    buttons: [{ title: 'Sigo' }, { title: 'Terminé' }],
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
      notify(NOTIF_TIMER_DONE, {
        type: 'basic',
        iconUrl: icon(),
        title: 'Actividad terminada · Trinity',
        message: `Registra ${initial.startTime}–${initial.endTime}. Abre Trinity para guardar.`,
        buttons: [{ title: 'Registrar horas' }],
        priority: 2,
      });
    }
    openPopup();
  } else {
    await startActivity();
    notify(`${NOTIF_TIMER}-started`, {
      type: 'basic',
      iconUrl: icon(),
      title: 'Cronómetro iniciado · Trinity',
      message: 'Registrando "Reunión". Te avisaré en 30 min.',
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
