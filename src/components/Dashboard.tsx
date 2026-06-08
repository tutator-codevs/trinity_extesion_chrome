import { useCallback, useEffect, useState, type JSX } from 'react';
import browser from 'webextension-polyfill';
import {
  Clock,
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
} from 'lucide-react';

import { AuthError } from '../utils/api';
import { getSummary } from '../utils/trinity';
import { currentWeekRangeUtc, todayLocalDate, utcIsoToLocalTime } from '../utils/time';
import { storage, STORAGE_KEY } from '../utils/storage';
import { elapsedMinutes, startActivity, stopActivity } from '../utils/timer';
import type {
  ActiveTimer,
  RegisterInitial,
  Settings as AppSettings,
  Summary,
  Timecard,
  User,
} from '../utils/types';
import { BRAND_GRADIENT } from '../lib/brand';
import RegisterForm from './RegisterForm';

type View = 'summary' | 'register' | 'settings';

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
  const tag = tc.projectId ?? 'Administrativo';
  return (
    <div className="flex items-stretch gap-2.5 rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm">
      <span
        className="w-1 shrink-0 rounded-full"
        style={{ background: isProject ? '#4f46e5' : '#9333ea' }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-800">
          {tc.description || 'Sin descripción'}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
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
          title="Reutilizar este registro"
        >
          <RotateCcw size={10} />
          Reutilizar
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
        Iniciar cronómetro (reunión)
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
            En curso · {elapsedMinutes(timer)} min
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onStop}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
      >
        <Square size={12} />
        Terminar
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
          aria-label="Volver"
          title="Volver"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-extrabold text-slate-800">Ajustes</h2>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <label className="flex cursor-pointer items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Aviso de cierre de día</span>
          <input
            type="checkbox"
            checked={settings.endOfDayEnabled}
            onChange={(e) => update({ endOfDayEnabled: e.target.checked })}
            className="size-4 accent-indigo-600"
          />
        </label>

        <div className="flex items-center justify-between">
          <label htmlFor="set-eod-time" className="text-sm font-semibold text-slate-700">
            Hora del aviso
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
            Horas objetivo / día
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

      <p className="px-1 text-[11px] text-slate-400">
        Te avisaremos a esa hora para cerrar el día e indicar si te faltan horas.
      </p>

      <button
        type="button"
        onClick={save}
        className="flex items-center justify-center gap-2 rounded-xl border-0 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95"
        style={{ background: BRAND_GRADIENT }}
      >
        <Save size={16} />
        {saved ? 'Guardado ✓' : 'Guardar ajustes'}
      </button>

      <button
        type="button"
        onClick={testNotification}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
      >
        <Bell size={14} />
        Probar aviso ahora
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
        const { start, end } = currentWeekRangeUtc();
        const data = await getSummary(user.userId, start, end);
        setSummary(data);
      } catch (err: unknown) {
        if (err instanceof AuthError) {
          onSessionExpired();
          return;
        }
        setError(err instanceof Error ? err.message : 'No se pudo cargar el resumen.');
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
    storage.getActiveTimer().then((t) => {
      if (active) setTimer(t);
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

  const days = summary?.hoursByDay ?? [];
  const maxDay = Math.max(1, ...days.map((d) => d.value));
  const timecards = summary?.timecards ?? [];

  let body: JSX.Element;
  if (loading) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <span className="size-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        <p className="animate-pulse text-sm font-medium text-slate-500">
          Cargando tu resumen…
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
          Reintentar
        </button>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<TrendingUp size={16} />}
            label="Total semana"
            value={`${summary?.totalHours ?? 0}h`}
            accent={BRAND_GRADIENT}
          />
          <StatCard
            icon={<CalendarRange size={16} />}
            label="Promedio / día"
            value={`${summary?.averageHours ?? 0}h`}
            accent="linear-gradient(135deg, #9333ea 0%, #db2777 100%)"
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Horas por día
          </h3>
          {days.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">
              Aún no hay horas registradas esta semana.
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
          <h3 className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <ClipboardList size={13} />
            Registros de la semana
          </h3>
          {timecards.length === 0 ? (
            <p className="py-3 text-center text-xs text-slate-400">
              Todavía no registras horas. ¡Empieza con tu primer registro!
            </p>
          ) : (
            <div className="flex max-h-56 flex-col gap-2 overflow-y-auto pr-0.5">
              {timecards.map((tc) => (
                <TimecardRow key={tc.id} tc={tc} onReuse={reuseTimecard} />
              ))}
            </div>
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
          <span>Registrar horas</span>
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
                ¡Hola, {(user.firstName || user.username).split(' ')[0]}!
              </h2>
              <p className="text-[11px] font-medium text-white/85">Trinity · Esta semana</p>
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
                  title="Actualizar"
                  aria-label="Actualizar resumen"
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setView('settings')}
                  className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                  title="Ajustes"
                  aria-label="Ajustes"
                >
                  <SettingsIcon size={15} />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onLogout}
              className="flex size-8 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-rose-500/90"
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {main}
    </div>
  );
}
