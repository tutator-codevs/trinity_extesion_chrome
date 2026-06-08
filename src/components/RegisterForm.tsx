import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type JSX,
} from 'react';
import {
  ArrowLeft,
  Save,
  AlertTriangle,
  Briefcase,
  Building2,
  BookmarkPlus,
  Trash2,
  Clock3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Mic,
} from 'lucide-react';

import { AuthError } from '../utils/api';
import {
  CATALOG_CODES,
  findProjects,
  getCatalogs,
  insertTimecard,
} from '../utils/trinity';
import { storage } from '../utils/storage';
import { parseLocal, resolveFields, type VoiceContext } from '../utils/voiceParse';
import { parseWithAI } from '../utils/voiceAi';
import VoicePanel, { type VoiceLang } from './VoicePanel';
import {
  addDaysToLocalDate,
  addMinutes,
  diffHours,
  floorToQuarter,
  formatLocalDateLabel,
  localTimeOf,
  localToUtcIso,
  todayLocalDate,
} from '../utils/time';
import type {
  AiProvider,
  CatalogItem,
  Project,
  RegisterInitial,
  User,
  WorkTemplate,
} from '../utils/types';
import { BRAND_GRADIENT } from '../lib/brand';

/** Umbral de confianza del parser local por debajo del cual se intenta la IA. */
const VOICE_AI_THRESHOLD = 0.6;

function defaultVoiceLang(): VoiceLang {
  const nav = typeof navigator !== 'undefined' ? navigator.language : '';
  return nav.toLowerCase().startsWith('en') ? 'en' : 'es';
}

interface RegisterFormProps {
  user: User;
  initial?: RegisterInitial;
  onDone: () => void;
  onCancel: () => void;
  onSessionExpired: () => void;
}

const DURATION_PRESETS = [
  { label: '30 min', mins: 30 },
  { label: '1 h', mins: 60 },
  { label: '2 h', mins: 120 },
  { label: '4 h', mins: 240 },
  { label: '8 h', mins: 480 },
];

/** Decide si una opción de TR-WORK-TYPE es administrativa por su etiqueta, para no
 *  depender de un código fijo del backend. */
function isAdministrative(label: string): boolean {
  return label.toUpperCase().includes('ADMIN');
}

/** Abre el selector nativo (calendario/reloj) de un input date/time. */
function openNativePicker(el: HTMLInputElement): void {
  try {
    el.showPicker?.();
  } catch {
    /* showPicker no soportado: el clic ya enfoca el input */
  }
}

function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}): JSX.Element {
  const today = todayLocalDate();
  const yesterday = addDaysToLocalDate(today, -1);
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
      active
        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
    }`;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        Fecha
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addDaysToLocalDate(value, -1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
          aria-label="Día anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="relative flex-1">
          <div className="pointer-events-none flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <CalendarDays size={15} className="text-indigo-500" />
            <span className="text-sm font-semibold capitalize text-slate-800">
              {formatLocalDateLabel(value)}
            </span>
          </div>
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onClick={(e) => openNativePicker(e.currentTarget)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Elegir fecha"
            required
          />
        </div>
        <button
          type="button"
          onClick={() => onChange(addDaysToLocalDate(value, 1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
          aria-label="Día siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onChange(today)} className={chip(value === today)}>
          Hoy
        </button>
        <button
          type="button"
          onClick={() => onChange(yesterday)}
          className={chip(value === yesterday)}
        >
          Ayer
        </button>
      </div>
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
  action,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (time: string) => void;
  action?: JSX.Element;
}): JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex h-4 items-center justify-between">
        <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </label>
        {action}
      </div>
      <div className="relative">
        <div className="pointer-events-none flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2">
          <Clock3 size={14} className="text-indigo-500" />
          <span className="text-sm font-bold tabular-nums text-slate-800">{value}</span>
        </div>
        <input
          id={id}
          type="time"
          step={900}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => openNativePicker(e.currentTarget)}
          className="absolute inset-0 cursor-pointer opacity-0"
          required
        />
      </div>
    </div>
  );
}

export default function RegisterForm({
  user,
  initial,
  onDone,
  onCancel,
  onSessionExpired,
}: RegisterFormProps): JSX.Element {
  const initialRef = useRef(initial);

  const [workTypes, setWorkTypes] = useState<CatalogItem[]>([]);
  const [taskProject, setTaskProject] = useState<CatalogItem[]>([]);
  const [taskAdmin, setTaskAdmin] = useState<CatalogItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  // Campos del formulario
  const [date, setDate] = useState(initial?.date ?? todayLocalDate());
  const [startTime, setStartTime] = useState(initial?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '10:00');
  const [workTypeCode, setWorkTypeCode] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskCode, setTaskCode] = useState('');
  const [description, setDescription] = useState(initial?.description ?? '');

  // Guardar como plantilla
  const [showSaveTpl, setShowSaveTpl] = useState(false);
  const [tplName, setTplName] = useState('');

  // Llenado por voz
  const [showVoice, setShowVoice] = useState(false);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>(defaultVoiceLang);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [aiProvider, setAiProvider] = useState<AiProvider>('none');
  const [aiApiKey, setAiApiKey] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWorkType = workTypes.find((w) => w.code === workTypeCode);
  const isAdmin = selectedWorkType ? isAdministrative(selectedWorkType.label) : false;
  const taskOptions = isAdmin ? taskAdmin : taskProject;

  const duration = useMemo(() => diffHours(startTime, endTime), [startTime, endTime]);

  useEffect(() => {
    let active = true;
    const loadMeta = async () => {
      setLoadingMeta(true);
      setMetaError(null);
      try {
        const [cats, projs, tpls, settings] = await Promise.all([
          getCatalogs([
            CATALOG_CODES.WORK_TYPE,
            CATALOG_CODES.TASK_TYPE,
            CATALOG_CODES.ADM_TYPE,
          ]),
          findProjects(),
          storage.getTemplates(),
          storage.getSettings(),
        ]);
        if (!active) return;

        const wt = cats[CATALOG_CODES.WORK_TYPE] ?? [];
        const tp = cats[CATALOG_CODES.TASK_TYPE] ?? [];
        const ta = cats[CATALOG_CODES.ADM_TYPE] ?? [];
        setWorkTypes(wt);
        setTaskProject(tp);
        setTaskAdmin(ta);
        setProjects(projs);
        setTemplates(tpls);
        setAiProvider(settings.aiProvider);
        setAiApiKey(settings.aiApiKey);

        // Prefill (plantilla / reutilizar) o valores por defecto.
        const init = initialRef.current;
        if (init?.workTypeCt) {
          setWorkTypeCode(init.workTypeCt);
          setTaskCode(init.typeTaskCt ?? '');
          if (init.projectId) setProjectId(init.projectId);
        } else {
          const firstWt = wt[0];
          if (firstWt) {
            setWorkTypeCode(firstWt.code);
            const firstTask = (isAdministrative(firstWt.label) ? ta : tp)[0];
            if (firstTask) setTaskCode(firstTask.code);
          }
          if (projs[0]) setProjectId(projs[0].id);
        }
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof AuthError) {
          onSessionExpired();
          return;
        }
        setMetaError(
          err instanceof Error ? err.message : 'No se pudieron cargar los catálogos.'
        );
      } finally {
        if (active) setLoadingMeta(false);
      }
    };
    loadMeta();
    return () => {
      active = false;
    };
  }, [onSessionExpired]);

  const handleWorkTypeChange = (code: string) => {
    setWorkTypeCode(code);
    const wt = workTypes.find((w) => w.code === code);
    const nextTasks = wt && isAdministrative(wt.label) ? taskAdmin : taskProject;
    setTaskCode(nextTasks[0]?.code ?? '');
  };

  /** Precarga el formulario con los campos resueltos (voz, plantilla, etc.). */
  const applyInitial = (init: RegisterInitial) => {
    if (init.workTypeCt) setWorkTypeCode(init.workTypeCt);
    if (init.typeTaskCt) setTaskCode(init.typeTaskCt);
    if (init.projectId) setProjectId(init.projectId);
    if (init.description) setDescription(init.description);
    if (init.date) setDate(init.date);
    if (init.startTime) setStartTime(init.startTime);
    if (init.endTime) setEndTime(init.endTime);
    setError(null);
  };

  /** Interpreta lo dictado: parser local primero, IA como respaldo si está configurada. */
  const handleVoiceSubmit = async (transcript: string) => {
    setVoiceBusy(true);
    try {
      const ctx: VoiceContext = { workTypes, taskProject, taskAdmin, projects };
      const local = parseLocal(transcript, ctx);
      let { fields } = local;
      if (local.confidence < VOICE_AI_THRESHOLD && aiProvider !== 'none' && aiApiKey) {
        const ai = await parseWithAI(transcript, ctx, { provider: aiProvider, apiKey: aiApiKey });
        if (ai) fields = ai;
      }
      if (!fields.description) fields = { ...fields, description: transcript.trim() };
      applyInitial(resolveFields(fields, ctx));
      setShowVoice(false);
    } finally {
      setVoiceBusy(false);
    }
  };

  const applyTemplate = (t: WorkTemplate) => {
    setWorkTypeCode(t.workTypeCt);
    setTaskCode(t.typeTaskCt);
    setProjectId(t.projectId ?? '');
    setDescription(t.description);
    setError(null);
  };

  const deleteTemplate = async (id: string) => {
    await storage.deleteTemplate(id);
    setTemplates(await storage.getTemplates());
  };

  const saveAsTemplate = async () => {
    if (!tplName.trim() || !workTypeCode || !taskCode) return;
    const template: WorkTemplate = {
      id: crypto.randomUUID(),
      name: tplName.trim(),
      workTypeCt: workTypeCode,
      workTypeLabel: selectedWorkType?.label ?? '',
      typeTaskCt: taskCode,
      taskLabel: taskOptions.find((t) => t.code === taskCode)?.label ?? '',
      projectId: isAdmin ? null : projectId || null,
      projectName: isAdmin
        ? null
        : projects.find((p) => p.id === projectId)?.name ?? null,
      description: description.trim(),
    };
    await storage.saveTemplate(template);
    setTplName('');
    setShowSaveTpl(false);
    setTemplates(await storage.getTemplates());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!workTypeCode) {
      setError('Selecciona el tipo de trabajo.');
      return;
    }
    if (!isAdmin && !projectId) {
      setError('Selecciona un proyecto.');
      return;
    }
    if (!taskCode) {
      setError('Selecciona el tipo de tarea.');
      return;
    }
    if (!description.trim()) {
      setError('Escribe una descripción.');
      return;
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    setSubmitting(true);
    try {
      await insertTimecard({
        workTypeCt: workTypeCode,
        typeTaskCt: taskCode,
        description: description.trim(),
        projectId: isAdmin ? null : projectId,
        date,
        start: localToUtcIso(date, startTime),
        end: localToUtcIso(date, endTime),
        hours: duration,
        statusCt: '1',
        softDelete: false,
        userId: user.userId,
      });
      onDone();
    } catch (err: unknown) {
      if (err instanceof AuthError) {
        onSessionExpired();
        return;
      }
      setError(err instanceof Error ? err.message : 'No se pudo guardar el registro.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <span className="size-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        <p className="animate-pulse text-sm font-medium text-slate-500">
          Preparando el formulario…
        </p>
      </div>
    );
  }

  if (metaError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
        <AlertTriangle className="text-rose-500" size={28} />
        <p className="text-sm font-medium text-rose-700">{metaError}</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-300"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
      {showVoice ? (
        <VoicePanel
          lang={voiceLang}
          onLangChange={setVoiceLang}
          aiEnabled={aiProvider !== 'none' && Boolean(aiApiKey)}
          busy={voiceBusy}
          onSubmit={handleVoiceSubmit}
          onClose={() => setShowVoice(false)}
        />
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex size-8 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm hover:text-slate-800"
          aria-label="Volver"
          title="Volver"
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-extrabold text-slate-800">Registrar horas</h2>
        <button
          type="button"
          onClick={() => setShowVoice(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
          title="Llenar el formulario dictando por voz"
        >
          <Mic size={14} />
          Por voz
        </button>
      </div>

      {/* Plantillas */}
      {templates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Plantillas
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {templates.map((t) => (
              <span
                key={t.id}
                className="group flex shrink-0 items-center gap-1 rounded-full border border-indigo-200 bg-white py-1 pr-1 pl-2.5 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                  title="Aplicar plantilla"
                >
                  {t.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteTemplate(t.id)}
                  className="flex size-4 items-center justify-center rounded-full text-slate-300 hover:bg-rose-100 hover:text-rose-600"
                  aria-label={`Eliminar plantilla ${t.name}`}
                  title="Eliminar"
                >
                  <Trash2 size={11} />
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
        {/* Fecha */}
        <DateField value={date} onChange={setDate} />

        {/* Desde / Hasta */}
        <div className="flex items-end gap-2">
          <TimeField
            id="rf-start"
            label="Desde"
            value={startTime}
            onChange={setStartTime}
            action={
              <button
                type="button"
                onClick={() => setStartTime(localTimeOf(floorToQuarter(new Date())))}
                className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-500 hover:text-indigo-700"
                title="Usar la hora actual"
              >
                <Clock3 size={10} />
                Ahora
              </button>
            }
          />
          <TimeField id="rf-end" label="Hasta" value={endTime} onChange={setEndTime} />
          <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-50 px-2.5 py-2">
            <span className="text-[9px] font-bold uppercase text-indigo-400">Total</span>
            <span className="text-sm font-black text-indigo-700">{duration}h</span>
          </div>
        </div>

        {/* Atajos de duración */}
        <div className="flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.mins}
              type="button"
              onClick={() => setEndTime(addMinutes(startTime, p.mins))}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-indigo-300 hover:text-indigo-700"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Tipo de trabajo */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Tipo de trabajo
          </span>
          <div className="grid grid-cols-2 gap-2">
            {workTypes.map((wt) => {
              const active = wt.code === workTypeCode;
              const admin = isAdministrative(wt.label);
              return (
                <label
                  key={wt.code}
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-bold transition-colors ${
                    active
                      ? 'border-transparent text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                  style={active ? { background: BRAND_GRADIENT } : undefined}
                >
                  <input
                    type="radio"
                    name="rf-worktype"
                    value={wt.code}
                    checked={active}
                    onChange={() => handleWorkTypeChange(wt.code)}
                    className="sr-only"
                  />
                  {admin ? <Building2 size={14} /> : <Briefcase size={14} />}
                  <span className="truncate">{wt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Proyecto (solo PROYECTO) */}
        {!isAdmin ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="rf-project" className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Proyecto
            </label>
            <select
              id="rf-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
            >
              <option value="" disabled>
                Selecciona una opción
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Tipo de tarea */}
        <div className="flex flex-col gap-1">
          <label htmlFor="rf-task" className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Tipo de tarea
          </label>
          <select
            id="rf-task"
            value={taskCode}
            onChange={(e) => setTaskCode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
          >
            <option value="" disabled>
              Selecciona una opción
            </option>
            {taskOptions.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1">
          <label htmlFor="rf-desc" className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Descripción
          </label>
          <textarea
            id="rf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej. PIVOT - PRD - DEVELOPMENT FULLSTACK"
            rows={3}
            className="resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm leading-snug text-slate-800 outline-none focus:border-indigo-400"
            required
          />
        </div>
      </div>

      {/* Guardar como plantilla */}
      {showSaveTpl ? (
        <div className="flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2">
          <input
            type="text"
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            placeholder="Nombre de la plantilla"
            className="flex-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={saveAsTemplate}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setShowSaveTpl(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSaveTpl(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-200 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
        >
          <BookmarkPlus size={14} />
          Guardar como plantilla
        </button>
      )}

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="flex items-center justify-center gap-2 rounded-xl border-0 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
        style={{ background: BRAND_GRADIENT }}
      >
        {submitting ? (
          <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        ) : (
          <Save size={16} />
        )}
        <span>{submitting ? 'Guardando…' : 'Guardar horas'}</span>
      </button>
    </form>
  );
}
