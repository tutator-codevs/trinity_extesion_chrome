import { useCallback, useEffect, useState, type JSX } from 'react';
import browser from 'webextension-polyfill';
import {
  Clock,
  CalendarDays,
  LogOut,
  RefreshCw,
  CalendarRange,
  TrendingUp,
  ClipboardList,
  AlertTriangle,
  FilePlus2,
  RotateCcw,
  Settings as SettingsIcon,
  Play,
  Square,
  ArrowLeft,
  Save,
  Bell,
  Mic,
} from 'lucide-react';

import { AuthError } from '../utils/api';
import { getSummary } from '../utils/trinity';
import {
  currentMonthToDateRangeUtc,
  currentMonthStartLocalDate,
  currentWeekStartLocalDate,
  dayLabelSortKey,
  localDateSortKey,
  formatLocalDateLabel,
  todayLocalDate,
  utcIsoToLocalTime,
} from '../utils/time';
import { storage, STORAGE_KEY } from '../utils/storage';
import { elapsedMinutes, startActivity, stopActivity } from '../utils/timer';
import type {
  ActiveTimer,
  AiProvider,
  RegisterInitial,
  Settings as AppSettings,
  Summary,
  Timecard,
  User,
} from '../utils/types';
import { BRAND_GRADIENT } from '../lib/brand';
import { makeT, type Dict } from '../i18n/locale';
import RegisterForm from './RegisterForm';
import CodevsCredit from './CodevsCredit';

const dict: Dict = {
  es: {
    administrative: 'Administrativo',
    noDescription: 'Sin descripción',
    reuse: 'Reutilizar',
    reuseRecord: 'Reutilizar este registro',
    startTimer: 'Iniciar cronómetro (reunión)',
    inProgress: 'En curso',
    minShort: 'min',
    stop: 'Terminar',
    back: 'Volver',
    settings: 'Ajustes',
    endOfDayReminder: 'Aviso de cierre de día',
    reminderTime: 'Hora del aviso',
    targetHoursPerDay: 'Horas objetivo / día',
    reminderHint: 'Te avisaremos a esa hora para cerrar el día e indicar si te faltan horas.',
    voiceFill: 'Llenado por voz (IA opcional)',
    aiProvider: 'Proveedor de IA',
    aiNone: 'Ninguno (solo local)',
    apiKey: 'API key',
    apiKeyHint:
      'Tu key se guarda solo en este equipo. Se usa como respaldo cuando el dictado local no basta; en ese caso la transcripción se envía a tu proveedor.',
    saved: 'Guardado ✓',
    saveSettings: 'Guardar ajustes',
    testReminderNow: 'Probar aviso ahora',
    loadSummaryError: 'No se pudo cargar el resumen.',
    loadingSummary: 'Cargando tu resumen…',
    retry: 'Reintentar',
    monthTotal: 'Total mes',
    avgPerDay: 'Promedio / día',
    hoursPerDay: 'Horas por día',
    noHoursThisMonth: 'Aún no hay horas registradas este mes.',
    records: 'Registros',
    period_today: 'Hoy',
    period_week: 'Semana',
    period_month: 'Mes',
    empty_today: 'Aún no registras horas hoy.',
    empty_week: 'Aún no registras horas esta semana.',
    empty_month: 'Aún no registras horas este mes.',
    entriesOne: 'registro',
    entriesMany: 'registros',
    logHours: 'Registrar horas',
    greeting: '¡Hola, {name}!',
    brandThisMonth: 'Este mes',
    refresh: 'Actualizar',
    refreshSummary: 'Actualizar resumen',
    signOut: 'Cerrar sesión',
  },
  en: {
    administrative: 'Administrative',
    noDescription: 'No description',
    reuse: 'Reuse',
    reuseRecord: 'Reuse this entry',
    startTimer: 'Start timer (meeting)',
    inProgress: 'In progress',
    minShort: 'min',
    stop: 'Stop',
    back: 'Back',
    settings: 'Settings',
    endOfDayReminder: 'End-of-day reminder',
    reminderTime: 'Reminder time',
    targetHoursPerDay: 'Target hours / day',
    reminderHint:
      "We'll remind you at that time to close out the day and flag any missing hours.",
    voiceFill: 'Voice fill (optional AI)',
    aiProvider: 'AI provider',
    aiNone: 'None (local only)',
    apiKey: 'API key',
    apiKeyHint:
      'Your key is stored only on this device. It is used as a fallback when local dictation is not enough; in that case the transcript is sent to your provider.',
    saved: 'Saved ✓',
    saveSettings: 'Save settings',
    testReminderNow: 'Test reminder now',
    loadSummaryError: 'Could not load the summary.',
    loadingSummary: 'Loading your summary…',
    retry: 'Retry',
    monthTotal: 'Month total',
    avgPerDay: 'Avg / day',
    hoursPerDay: 'Hours per day',
    noHoursThisMonth: 'No hours logged this month yet.',
    records: 'Entries',
    period_today: 'Today',
    period_week: 'Week',
    period_month: 'Month',
    empty_today: 'No hours logged today yet.',
    empty_week: 'No hours logged this week yet.',
    empty_month: 'No hours logged this month yet.',
    entriesOne: 'entry',
    entriesMany: 'entries',
    logHours: 'Log hours',
    greeting: 'Hi, {name}!',
    brandThisMonth: 'This month',
    refresh: 'Refresh',
    refreshSummary: 'Refresh summary',
    signOut: 'Sign out',
  },
  fr: {
    administrative: 'Administratif',
    noDescription: 'Sans description',
    reuse: 'Réutiliser',
    reuseRecord: 'Réutiliser cette saisie',
    startTimer: 'Démarrer le chronomètre (réunion)',
    inProgress: 'En cours',
    minShort: 'min',
    stop: 'Arrêter',
    back: 'Retour',
    settings: 'Paramètres',
    endOfDayReminder: 'Rappel de fin de journée',
    reminderTime: 'Heure du rappel',
    targetHoursPerDay: 'Heures cibles / jour',
    reminderHint:
      'Nous vous préviendrons à cette heure pour clôturer la journée et signaler les heures manquantes.',
    voiceFill: 'Saisie vocale (IA optionnelle)',
    aiProvider: 'Fournisseur d’IA',
    aiNone: 'Aucun (local uniquement)',
    apiKey: 'Clé API',
    apiKeyHint:
      'Votre clé est enregistrée uniquement sur cet appareil. Elle sert de secours lorsque la dictée locale ne suffit pas ; dans ce cas, la transcription est envoyée à votre fournisseur.',
    saved: 'Enregistré ✓',
    saveSettings: 'Enregistrer les paramètres',
    testReminderNow: 'Tester le rappel maintenant',
    loadSummaryError: 'Impossible de charger le résumé.',
    loadingSummary: 'Chargement de votre résumé…',
    retry: 'Réessayer',
    monthTotal: 'Total du mois',
    avgPerDay: 'Moy. / jour',
    hoursPerDay: 'Heures par jour',
    noHoursThisMonth: 'Aucune heure enregistrée ce mois-ci.',
    records: 'Saisies',
    period_today: 'Aujourd’hui',
    period_week: 'Semaine',
    period_month: 'Mois',
    empty_today: 'Aucune heure enregistrée aujourd’hui.',
    empty_week: 'Aucune heure enregistrée cette semaine.',
    empty_month: 'Aucune heure enregistrée ce mois-ci.',
    entriesOne: 'saisie',
    entriesMany: 'saisies',
    logHours: 'Saisir les heures',
    greeting: 'Bonjour, {name} !',
    brandThisMonth: 'Ce mois',
    refresh: 'Actualiser',
    refreshSummary: 'Actualiser le résumé',
    signOut: 'Se déconnecter',
  },
};

const t = makeT(dict);

type View = 'summary' | 'register' | 'settings';

/** Periodo de los registros listados. El resumen siempre se trae del mes; este
 *  filtro acota la lista de registros del lado del cliente. */
type RecordPeriod = 'today' | 'week' | 'month';

// Solo el value vive a nivel de módulo; la etiqueta se traduce en render con t().
const RECORD_PERIODS: { value: RecordPeriod }[] = [
  { value: 'today' },
  { value: 'week' },
  { value: 'month' },
];

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onSessionExpired: () => void;
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: JSX.Element;
  label: string;
  value: string;
  accent: string;
}): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div
        className="flex size-8 items-center justify-center rounded-lg text-white"
        style={{ background: accent }}
      >
        {icon}
      </div>
      <span className="text-2xl font-black leading-none text-slate-800">{value}</span>
      <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
    </div>
  );
}

function TimecardRow({
  tc,
  onReuse,
}: {
  tc: Timecard;
  onReuse: (tc: Timecard) => void;
}): JSX.Element {
  const isProject = tc.workTypeCt !== '2' && tc.projectId !== null;
  const tag = tc.projectId ?? t('administrative');
  return (
    <div className="flex items-stretch gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
      <span
        className="w-1 shrink-0 rounded-full"
        style={{ background: isProject ? '#4f46e5' : '#9333ea' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-800">
          {tc.description || t('noDescription')}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <CalendarDays size={11} />
            {formatLocalDateLabel(tc.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {utcIsoToLocalTime(tc.start)}–{utcIsoToLocalTime(tc.end)}
          </span>
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
            style={{
              background: isProject ? '#e0e7ff' : '#f3e8ff',
              color: isProject ? '#4338ca' : '#7e22ce',
            }}
          >
            {tag}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end justify-between gap-1">
        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
          {tc.hours}h
        </span>
        <button
          type="button"
          onClick={() => onReuse(tc)}
          className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-500 hover:text-indigo-700"
          title={t('reuseRecord')}
        >
          <RotateCcw size={10} />
          {t('reuse')}
        </button>
      </div>
    </div>
  );
}

function TimerCard({
  timer,
  onStart,
  onStop,
}: {
  timer: ActiveTimer | null;
  onStart: () => void;
  onStop: () => void;
}): JSX.Element {
  if (!timer) {
    return (
      <button
        type="button"
        onClick={onStart}
        className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700"
      >
        <Play size={15} />
        {t('startTimer')}
      </button>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <div>
          <p className="text-[13px] font-bold text-emerald-800">{timer.label}</p>
          <p className="text-[11px] font-medium text-emerald-600">
            {t('inProgress')} · {elapsedMinutes(timer)} {t('minShort')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onStop}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
      >
        <Square size={12} />
        {t('stop')}
      </button>
    </div>
  );
}

function SettingsPanel({ onBack }: { onBack: () => void }): JSX.Element {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    storage.getSettings().then(setSettings);
  }, []);

  if (!settings) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <span className="size-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  const update = (patch: Partial<AppSettings>) => setSettings({ ...settings, ...patch });
  const save = async () => {
    await storage.setSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const testNotification = () => {
    browser.runtime.sendMessage({ type: 'trinity-test-eod' }).catch(() => {});
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-slate-800"
          aria-label={t('back')}
          title={t('back')}
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-extrabold text-slate-800">{t('settings')}</h2>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{t('endOfDayReminder')}</span>
          <input
            type="checkbox"
            checked={settings.endOfDayEnabled}
            onChange={(e) => update({ endOfDayEnabled: e.target.checked })}
            className="size-4 accent-indigo-600"
          />
        </label>

        <div className="flex items-center justify-between">
          <label htmlFor="set-eod-time" className="text-sm font-semibold text-slate-700">
            {t('reminderTime')}
          </label>
          <input
            id="set-eod-time"
            type="time"
            value={settings.endOfDayTime}
            onChange={(e) => update({ endOfDayTime: e.target.value })}
            disabled={!settings.endOfDayEnabled}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400 disabled:opacity-50"
          />
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="set-target" className="text-sm font-semibold text-slate-700">
            {t('targetHoursPerDay')}
          </label>
          <input
            id="set-target"
            type="number"
            min={1}
            max={24}
            value={settings.targetHours}
            onChange={(e) => update({ targetHours: Number(e.target.value) || 0 })}
            className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
          />
        </div>
      </div>

      <p className="px-1 text-[11px] text-slate-400">{t('reminderHint')}</p>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Mic size={14} className="text-indigo-600" />
          <span className="text-sm font-bold text-slate-700">{t('voiceFill')}</span>
        </div>

        <div className="flex items-center justify-between">
          <label htmlFor="set-ai" className="text-sm font-semibold text-slate-700">
            {t('aiProvider')}
          </label>
          <select
            id="set-ai"
            value={settings.aiProvider}
            onChange={(e) => update({ aiProvider: e.target.value as AiProvider })}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
          >
            <option value="none">{t('aiNone')}</option>
            <option value="anthropic">Claude (Anthropic)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
        </div>

        {settings.aiProvider !== 'none' ? (
          <div className="flex flex-col gap-1">
            <label
              htmlFor="set-ai-key"
              className="text-[11px] font-bold uppercase tracking-wide text-slate-400"
            >
              {t('apiKey')}
            </label>
            <input
              id="set-ai-key"
              type="password"
              value={settings.aiApiKey}
              onChange={(e) => update({ aiApiKey: e.target.value })}
              placeholder={settings.aiProvider === 'anthropic' ? 'sk-ant-…' : 'AIza…'}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
            />
            <p className="text-[10px] text-slate-400">{t('apiKeyHint')}</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={save}
        className="flex items-center justify-center gap-2 rounded-xl border-0 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95"
        style={{ background: BRAND_GRADIENT }}
      >
        <Save size={16} />
        {saved ? t('saved') : t('saveSettings')}
      </button>

      <button
        type="button"
        onClick={testNotification}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
      >
        <Bell size={14} />
        {t('testReminderNow')}
      </button>
    </div>
  );
}

export default function Dashboard({
  user,
  onLogout,
  onSessionExpired,
}: DashboardProps): JSX.Element {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('summary');
  const [prefill, setPrefill] = useState<RegisterInitial | undefined>(undefined);
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [recordPeriod, setRecordPeriod] = useState<RecordPeriod>('today');
  const [, setTick] = useState(0);

  const openRegister = (initial?: RegisterInitial) => {
    setPrefill(initial);
    setView('register');
  };

  const reuseTimecard = (tc: Timecard) => {
    openRegister({
      workTypeCt: tc.workTypeCt,
      typeTaskCt: tc.typeTaskCt,
      projectId: tc.projectId,
      description: tc.description,
      date: todayLocalDate(),
      startTime: utcIsoToLocalTime(tc.start),
      endTime: utcIsoToLocalTime(tc.end),
    });
  };

  const handleStartTimer = () => {
    startActivity();
  };

  const handleStopTimer = async () => {
    const initial = await stopActivity();
    if (initial) openRegister(initial);
  };

  const fetchSummary = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        const { start, end } = currentMonthToDateRangeUtc();
        const data = await getSummary(user.userId, start, end);
        setSummary(data);
      } catch (err: unknown) {
        if (err instanceof AuthError) {
          onSessionExpired();
          return;
        }
        setError(err instanceof Error ? err.message : t('loadSummaryError'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user.userId, onSessionExpired]
  );

  useEffect(() => {
    fetchSummary(false);
  }, [fetchSummary]);

  // Registro pendiente (p.ej. al terminar el cronómetro desde el teclado).
  useEffect(() => {
    let active = true;
    storage.getPendingRegistration().then((pending) => {
      if (active && pending) {
        storage.clearPendingRegistration();
        setPrefill(pending);
        setView('register');
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Estado del cronómetro, sincronizado con el background vía storage.
  useEffect(() => {
    let active = true;
    storage.getActiveTimer().then((current) => {
      if (active) setTimer(current);
    });
    const onChange = (
      changes: Record<string, { newValue?: unknown }>,
      area: string
    ) => {
      if (area === 'local' && changes[STORAGE_KEY.ACTIVE_TIMER]) {
        setTimer((changes[STORAGE_KEY.ACTIVE_TIMER].newValue as ActiveTimer) ?? null);
      }
    };
    browser.storage.onChanged.addListener(onChange);
    return () => {
      active = false;
      browser.storage.onChanged.removeListener(onChange);
    };
  }, []);

  // Refresca el contador de minutos mientras el cronómetro está activo.
  useEffect(() => {
    if (!timer) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [timer]);

  // El backend devuelve hoursByDay del mes en curso, ordenado por el texto del label
  // ("1","10","2"...). Lo acotamos a la semana actual y lo ordenamos de hoy hacia atrás.
  const weekStartKey = localDateSortKey(currentWeekStartLocalDate());
  const days = [...(summary?.hoursByDay ?? [])]
    .filter((d) => dayLabelSortKey(d.label) >= weekStartKey)
    .sort((a, b) => dayLabelSortKey(b.label) - dayLabelSortKey(a.label));
  const maxDay = Math.max(1, ...days.map((d) => d.value));
  const allTimecards = summary?.timecards ?? [];
  const periodStartByPeriod: Record<RecordPeriod, string> = {
    today: todayLocalDate(),
    week: currentWeekStartLocalDate(),
    month: currentMonthStartLocalDate(),
  };
  // tc.date es 'YYYY-MM-DD' local; comparación lexicográfica = comparación de fecha.
  // Orden descendente por instante de inicio: lo más reciente arriba, lo más antiguo al final.
  const timecards = allTimecards
    .filter((tc) => tc.date >= periodStartByPeriod[recordPeriod])
    .sort((a, b) => b.start.localeCompare(a.start));
  const periodHours = timecards.reduce((sum, tc) => sum + (Number(tc.hours) || 0), 0);

  let body: JSX.Element;
  if (loading) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <span className="size-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        <p className="animate-pulse text-sm font-medium text-slate-500">
          {t('loadingSummary')}
        </p>
      </div>
    );
  } else if (error) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
        <AlertTriangle className="text-rose-500" size={28} />
        <p className="text-sm font-medium text-rose-700">{error}</p>
        <button
          type="button"
          onClick={() => fetchSummary(true)}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
        >
          {t('retry')}
        </button>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<TrendingUp size={16} />}
            label={t('monthTotal')}
            value={`${summary?.totalHours ?? 0}h`}
            accent={BRAND_GRADIENT}
          />
          <StatCard
            icon={<CalendarRange size={16} />}
            label={t('avgPerDay')}
            value={`${summary?.averageHours ?? 0}h`}
            accent="linear-gradient(135deg, #9333ea 0%, #db2777 100%)"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {t('hoursPerDay')}
          </h3>
          {days.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">
              {t('noHoursThisMonth')}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {days.map((d) => (
                <div key={d.label} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[11px] font-medium text-slate-500">
                    {d.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${Math.max(6, (d.value / maxDay) * 100)}%`,
                        background: BRAND_GRADIENT,
                      }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-[11px] font-bold text-slate-700">
                    {d.valueLabel}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <ClipboardList size={13} />
              {t('records')}
            </h3>
            <div className="flex items-center gap-1">
              {RECORD_PERIODS.map((p) => {
                const active = recordPeriod === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setRecordPeriod(p.value)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors ${
                      active
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {t(`period_${p.value}`)}
                  </button>
                );
              })}
            </div>
          </div>
          {timecards.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">
              {t(`empty_${recordPeriod}`)}
            </p>
          ) : (
            <>
              <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-0.5">
                {timecards.map((tc) => (
                  <TimecardRow key={tc.id} tc={tc} onReuse={reuseTimecard} />
                ))}
              </div>
              <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] font-semibold text-slate-500">
                <span>
                  {timecards.length} {timecards.length === 1 ? t('entriesOne') : t('entriesMany')}
                </span>
                <span className="text-slate-700">{periodHours}h</span>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  let main: JSX.Element;
  if (view === 'register') {
    main = (
      <RegisterForm
        user={user}
        initial={prefill}
        onCancel={() => {
          setView('summary');
          setPrefill(undefined);
        }}
        onDone={() => {
          setView('summary');
          setPrefill(undefined);
          fetchSummary(true);
        }}
        onSessionExpired={onSessionExpired}
      />
    );
  } else if (view === 'settings') {
    main = <SettingsPanel onBack={() => setView('summary')} />;
  } else {
    main = (
      <>
        <TimerCard timer={timer} onStart={handleStartTimer} onStop={handleStopTimer} />
        <button
          type="button"
          onClick={() => openRegister()}
          className="flex items-center justify-center gap-2 rounded-2xl border-0 py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95"
          style={{ background: BRAND_GRADIENT }}
        >
          <FilePlus2 size={17} />
          <span>{t('logHours')}</span>
        </button>
        {body}
      </>
    );
  }

  return (
    <div className="flex min-h-[500px] flex-col gap-3 bg-slate-100 p-3.5">
      <header
        className="relative overflow-hidden rounded-2xl p-4 text-white shadow-lg"
        style={{ background: BRAND_GRADIENT }}
      >
        <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/15 blur-xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Clock size={18} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-base font-extrabold leading-tight tracking-tight">
                {t('greeting', { name: (user.firstName || user.username).split(' ')[0] })}
              </h2>
              <p className="text-[11px] font-medium text-white/85">
                Trinity · {t('brandThisMonth')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {view === 'summary' ? (
              <>
                <button
                  type="button"
                  onClick={() => fetchSummary(true)}
                  disabled={refreshing}
                  className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 disabled:opacity-60"
                  title={t('refresh')}
                  aria-label={t('refreshSummary')}
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('settings')}
                  className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                  title={t('settings')}
                  aria-label={t('settings')}
                >
                  <SettingsIcon size={15} />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-rose-500/90"
              title={t('signOut')}
              aria-label={t('signOut')}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {main}

      <CodevsCredit className="pt-1 pb-0.5" />
    </div>
  );
}
