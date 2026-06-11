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
  ChevronDown,
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
  toLocalDateString,
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
import { makeT, currentLocale, type Dict } from '../i18n/locale';

const dict: Dict = {
  es: {
    dateLabel: 'Fecha',
    prevDay: 'Día anterior',
    nextDay: 'Día siguiente',
    chooseDate: 'Elegir fecha',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    today: 'Hoy',
    yesterday: 'Ayer',
    title: 'Registrar horas',
    back: 'Volver',
    byVoice: 'Por voz',
    byVoiceTitle: 'Llenar el formulario dictando por voz',
    templates: 'Plantillas',
    applyTemplate: 'Aplicar plantilla',
    deleteTemplate: 'Eliminar plantilla {name}',
    delete: 'Eliminar',
    startLabel: 'Desde',
    endLabel: 'Hasta',
    now: 'Ahora',
    nowTitle: 'Usar la hora actual',
    total: 'Total',
    workType: 'Tipo de trabajo',
    project: 'Proyecto',
    taskType: 'Tipo de tarea',
    selectOption: 'Selecciona una opción',
    description: 'Descripción',
    descriptionPlaceholder: 'Ej. PIVOT - PRD - DEVELOPMENT FULLSTACK',
    tplNamePlaceholder: 'Nombre de la plantilla',
    save: 'Guardar',
    cancel: 'Cancelar',
    saveAsTemplate: 'Guardar como plantilla',
    saveHours: 'Guardar horas',
    saving: 'Guardando…',
    preparingForm: 'Preparando el formulario…',
    errLoadCatalogs: 'No se pudieron cargar los catálogos.',
    errSelectWorkType: 'Selecciona el tipo de trabajo.',
    errSelectProject: 'Selecciona un proyecto.',
    errSelectTask: 'Selecciona el tipo de tarea.',
    errDescription: 'Escribe una descripción.',
    errEndBeforeStart: 'La hora de fin debe ser posterior a la de inicio.',
    errSave: 'No se pudo guardar el registro.',
  },
  en: {
    dateLabel: 'Date',
    prevDay: 'Previous day',
    nextDay: 'Next day',
    chooseDate: 'Choose date',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    today: 'Today',
    yesterday: 'Yesterday',
    title: 'Log hours',
    back: 'Back',
    byVoice: 'By voice',
    byVoiceTitle: 'Fill the form by voice',
    templates: 'Templates',
    applyTemplate: 'Apply template',
    deleteTemplate: 'Delete template {name}',
    delete: 'Delete',
    startLabel: 'From',
    endLabel: 'To',
    now: 'Now',
    nowTitle: 'Use the current time',
    total: 'Total',
    workType: 'Work type',
    project: 'Project',
    taskType: 'Task type',
    selectOption: 'Select an option',
    description: 'Description',
    descriptionPlaceholder: 'E.g. PIVOT - PRD - DEVELOPMENT FULLSTACK',
    tplNamePlaceholder: 'Template name',
    save: 'Save',
    cancel: 'Cancel',
    saveAsTemplate: 'Save as template',
    saveHours: 'Save hours',
    saving: 'Saving…',
    preparingForm: 'Preparing the form…',
    errLoadCatalogs: 'Couldn’t load the catalogs.',
    errSelectWorkType: 'Select the work type.',
    errSelectProject: 'Select a project.',
    errSelectTask: 'Select the task type.',
    errDescription: 'Enter a description.',
    errEndBeforeStart: 'The end time must be after the start time.',
    errSave: 'Couldn’t save the entry.',
  },
  fr: {
    dateLabel: 'Date',
    prevDay: 'Jour précédent',
    nextDay: 'Jour suivant',
    chooseDate: 'Choisir la date',
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    today: 'Aujourd’hui',
    yesterday: 'Hier',
    title: 'Saisir les heures',
    back: 'Retour',
    byVoice: 'À la voix',
    byVoiceTitle: 'Remplir le formulaire à la voix',
    templates: 'Modèles',
    applyTemplate: 'Appliquer le modèle',
    deleteTemplate: 'Supprimer le modèle {name}',
    delete: 'Supprimer',
    startLabel: 'De',
    endLabel: 'À',
    now: 'Maintenant',
    nowTitle: 'Utiliser l’heure actuelle',
    total: 'Total',
    workType: 'Type de travail',
    project: 'Projet',
    taskType: 'Type de tâche',
    selectOption: 'Sélectionner une option',
    description: 'Description',
    descriptionPlaceholder: 'Ex. PIVOT - PRD - DEVELOPMENT FULLSTACK',
    tplNamePlaceholder: 'Nom du modèle',
    save: 'Enregistrer',
    cancel: 'Annuler',
    saveAsTemplate: 'Enregistrer comme modèle',
    saveHours: 'Enregistrer les heures',
    saving: 'Enregistrement…',
    preparingForm: 'Préparation du formulaire…',
    errLoadCatalogs: 'Impossible de charger les catalogues.',
    errSelectWorkType: 'Sélectionnez le type de travail.',
    errSelectProject: 'Sélectionnez un projet.',
    errSelectTask: 'Sélectionnez le type de tâche.',
    errDescription: 'Saisissez une description.',
    errEndBeforeStart: 'L’heure de fin doit être postérieure à l’heure de début.',
    errSave: 'Échec de l’enregistrement.',
  },
};

const t = makeT(dict);

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

/** ¿El evento ocurrió dentro de alguno de estos elementos? Usa `composedPath` para
 *  funcionar también dentro del shadow root del popup, donde `e.target` se retargetea
 *  al host y `contains()` daría falso negativo para clics internos. */
function eventInside(e: MouseEvent, ...els: (HTMLElement | null)[]): boolean {
  const path = e.composedPath();
  return els.some((el) => el != null && path.includes(el));
}

/** Matriz de 42 días (6 semanas) que cubre el mes visible, respetando el primer día
 *  de la semana del locale (domingo en inglés, lunes en el resto). */
function monthGrid(viewY: number, viewM: number, firstDow: number): Date[] {
  const first = new Date(viewY, viewM, 1);
  const lead = (first.getDay() - firstDow + 7) % 7;
  const start = new Date(viewY, viewM, 1 - lead);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
  );
}

function DateField({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const today = todayLocalDate();
  const yesterday = addDaysToLocalDate(today, -1);
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
      active
        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
        : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-300'
    }`;

  const loc = currentLocale();
  const firstDow = loc === 'en' ? 0 : 1;
  const [view, setView] = useState(() => {
    const [y, m] = value.split('-').map(Number);
    return { y, m: m - 1 };
  });

  // Cierra al pulsar fuera del trigger y del popover (dos refs: no depende del DOM).
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (eventInside(e, triggerRef.current, popRef.current)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openCalendar = () => {
    const [y, m] = value.split('-').map(Number);
    setView({ y, m: m - 1 });
    setOpen((o) => !o);
  };
  const shiftMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const pick = (ds: string) => {
    onChange(ds);
    setOpen(false);
  };

  const cells = monthGrid(view.y, view.m, firstDow);
  const weekdayFmt = new Intl.DateTimeFormat(loc, { weekday: 'short' });
  const monthFmt = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' });
  const weekdays = cells.slice(0, 7).map((d) => weekdayFmt.format(d));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {t('dateLabel')}
      </span>
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(addDaysToLocalDate(value, -1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
          aria-label={t('prevDay')}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          ref={triggerRef}
          type="button"
          onClick={openCalendar}
          aria-label={t('chooseDate')}
          aria-expanded={open}
          className={`flex flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2 transition-colors ${
            open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'
          }`}
        >
          <CalendarDays size={15} className="text-indigo-500" />
          <span className="text-sm font-semibold capitalize text-slate-800">
            {formatLocalDateLabel(value)}
          </span>
          <ChevronDown
            size={13}
            className={`ml-auto text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={() => onChange(addDaysToLocalDate(value, 1))}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:border-indigo-300 hover:text-indigo-600"
          aria-label={t('nextDay')}
        >
          <ChevronRight size={16} />
        </button>

        {open ? (
          <div
            ref={popRef}
            className="absolute inset-x-0 top-full z-50 mx-auto mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-slate-900/5"
          >
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="flex size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                aria-label={t('prevMonth')}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold capitalize text-slate-800">
                {monthFmt.format(new Date(view.y, view.m, 1))}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="flex size-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-indigo-600"
                aria-label={t('nextMonth')}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {weekdays.map((w) => (
                <span
                  key={w}
                  className="pb-1 text-center text-[10px] font-bold uppercase text-slate-400"
                >
                  {w}
                </span>
              ))}
              {cells.map((d) => {
                const ds = toLocalDateString(d);
                const inMonth = d.getMonth() === view.m;
                const isSelected = ds === value;
                const isToday = ds === today;
                let cls = 'text-slate-700 hover:bg-slate-100';
                if (!inMonth) cls = 'text-slate-300 hover:bg-slate-50';
                if (isSelected) cls = 'bg-indigo-600 font-bold text-white';
                else if (isToday) cls = 'font-bold text-indigo-600 ring-1 ring-inset ring-indigo-200';
                return (
                  <button
                    key={ds}
                    type="button"
                    onClick={() => pick(ds)}
                    className={`flex h-8 items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors ${cls}`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => pick(today)}
              className="mt-2 w-full rounded-lg border border-slate-200 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              {t('today')}
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => onChange(today)} className={chip(value === today)}>
          {t('today')}
        </button>
        <button
          type="button"
          onClick={() => onChange(yesterday)}
          className={chip(value === yesterday)}
        >
          {t('yesterday')}
        </button>
      </div>
    </div>
  );
}

const pad2 = (n: number): string => String(n).padStart(2, '0');
const HOURS = Array.from({ length: 24 }, (_, i) => i);
// Los timecards van en bloques de 15 min: el selector solo ofrece cuartos de hora.
const QUARTERS = [0, 15, 30, 45];

/** Selector de hora propio: popover con columna de horas (scroll) + cuartos de hora.
 *  Sustituye al picker nativo del navegador (más rápido y acorde a la política 15 min). */
function TimePicker({
  id,
  label,
  value,
  onChange,
  align = 'left',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (time: string) => void;
  align?: 'left' | 'right';
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [hh, mm] = value.split(':');
  const hour = Number(hh) || 0;
  const minute = Number(mm) || 0;

  // Cierre por clic fuera o Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      if (!eventInside(e, ref.current)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Al abrir, centra la hora seleccionada en su columna (sin mover la página).
  useEffect(() => {
    if (!open || !ref.current) return;
    const active = ref.current.querySelector<HTMLElement>('[data-active="true"]');
    const col = active?.parentElement;
    if (active && col) {
      col.scrollTop = active.offsetTop - col.clientHeight / 2 + active.clientHeight / 2;
    }
  }, [open]);

  const optBase =
    'w-full rounded-md py-1.5 text-center text-sm font-bold tabular-nums transition-colors';
  const optOn = 'bg-indigo-600 text-white';
  const optOff = 'text-slate-600 hover:bg-slate-100';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-expanded={open}
        className={`flex w-full items-center gap-1.5 rounded-lg border bg-white px-2.5 py-2 transition-colors ${
          open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'
        }`}
      >
        <Clock3 size={14} className="text-indigo-500" />
        <span className="text-sm font-bold tabular-nums text-slate-800">{value}</span>
        <ChevronDown
          size={13}
          className={`ml-auto text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <div
          className={`absolute top-full z-30 mt-1.5 flex w-40 gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="flex-1">
            <p className="pb-1 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
              h
            </p>
            <div className="flex max-h-44 flex-col gap-0.5 overflow-y-auto pr-0.5">
              {HOURS.map((h) => {
                const on = h === hour;
                return (
                  <button
                    key={h}
                    type="button"
                    data-active={on}
                    onClick={() => onChange(`${pad2(h)}:${pad2(minute)}`)}
                    className={`${optBase} ${on ? optOn : optOff}`}
                  >
                    {pad2(h)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="w-12">
            <p className="pb-1 text-center text-[9px] font-bold uppercase tracking-wider text-slate-400">
              min
            </p>
            <div className="flex flex-col gap-1">
              {QUARTERS.map((m) => {
                const on = m === minute;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChange(`${pad2(hour)}:${pad2(m)}`)}
                    className={`${optBase} ${on ? optOn : optOff}`}
                  >
                    {pad2(m)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeField({
  id,
  label,
  value,
  onChange,
  action,
  align = 'left',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (time: string) => void;
  action?: JSX.Element;
  align?: 'left' | 'right';
}): JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-1">
      <div className="flex h-4 items-center justify-between">
        <label htmlFor={id} className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </label>
        {action}
      </div>
      <TimePicker id={id} label={label} value={value} onChange={onChange} align={align} />
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
        setMetaError(err instanceof Error ? err.message : t('errLoadCatalogs'));
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

  const applyTemplate = (tpl: WorkTemplate) => {
    setWorkTypeCode(tpl.workTypeCt);
    setTaskCode(tpl.typeTaskCt);
    setProjectId(tpl.projectId ?? '');
    setDescription(tpl.description);
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
      taskLabel: taskOptions.find((opt) => opt.code === taskCode)?.label ?? '',
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
      setError(t('errSelectWorkType'));
      return;
    }
    if (!isAdmin && !projectId) {
      setError(t('errSelectProject'));
      return;
    }
    if (!taskCode) {
      setError(t('errSelectTask'));
      return;
    }
    if (!description.trim()) {
      setError(t('errDescription'));
      return;
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      setError(t('errEndBeforeStart'));
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
      setError(err instanceof Error ? err.message : t('errSave'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeta) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16">
        <span className="size-8 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
        <p className="animate-pulse text-sm font-medium text-slate-500">
          {t('preparingForm')}
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
          {t('back')}
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
          aria-label={t('back')}
          title={t('back')}
        >
          <ArrowLeft size={16} />
        </button>
        <h2 className="text-sm font-extrabold text-slate-800">{t('title')}</h2>
        <button
          type="button"
          onClick={() => setShowVoice(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-bold text-indigo-600 shadow-sm transition-colors hover:bg-indigo-50"
          title={t('byVoiceTitle')}
        >
          <Mic size={14} />
          {t('byVoice')}
        </button>
      </div>

      {/* Plantillas */}
      {templates.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {t('templates')}
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {templates.map((tpl) => (
              <span
                key={tpl.id}
                className="group flex shrink-0 items-center gap-1 rounded-full border border-indigo-200 bg-white py-1 pr-1 pl-2.5 shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                  title={t('applyTemplate')}
                >
                  {tpl.name}
                </button>
                <button
                  type="button"
                  onClick={() => deleteTemplate(tpl.id)}
                  className="flex size-4 items-center justify-center rounded-full text-slate-300 hover:bg-rose-100 hover:text-rose-600"
                  aria-label={t('deleteTemplate', { name: tpl.name })}
                  title={t('delete')}
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
            label={t('startLabel')}
            value={startTime}
            onChange={setStartTime}
            action={
              <button
                type="button"
                onClick={() => setStartTime(localTimeOf(floorToQuarter(new Date())))}
                className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-500 hover:text-indigo-700"
                title={t('nowTitle')}
              >
                <Clock3 size={10} />
                {t('now')}
              </button>
            }
          />
          <TimeField
            id="rf-end"
            label={t('endLabel')}
            value={endTime}
            onChange={setEndTime}
            align="right"
          />
          <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-50 px-2.5 py-2">
            <span className="text-[9px] font-bold uppercase text-indigo-400">{t('total')}</span>
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
            {t('workType')}
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
              {t('project')}
            </label>
            <select
              id="rf-project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
            >
              <option value="" disabled>
                {t('selectOption')}
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
            {t('taskType')}
          </label>
          <select
            id="rf-task"
            value={taskCode}
            onChange={(e) => setTaskCode(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
          >
            <option value="" disabled>
              {t('selectOption')}
            </option>
            {taskOptions.map((opt) => (
              <option key={opt.code} value={opt.code}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Descripción */}
        <div className="flex flex-col gap-1">
          <label htmlFor="rf-desc" className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
            {t('description')}
          </label>
          <textarea
            id="rf-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('descriptionPlaceholder')}
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
            placeholder={t('tplNamePlaceholder')}
            className="flex-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 outline-none focus:border-indigo-400"
          />
          <button
            type="button"
            onClick={saveAsTemplate}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            {t('save')}
          </button>
          <button
            type="button"
            onClick={() => setShowSaveTpl(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-600"
          >
            {t('cancel')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSaveTpl(true)}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-indigo-200 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50"
        >
          <BookmarkPlus size={14} />
          {t('saveAsTemplate')}
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
        <span>{submitting ? t('saving') : t('saveHours')}</span>
      </button>
    </form>
  );
}
