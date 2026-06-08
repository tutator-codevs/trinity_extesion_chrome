import { JSX, useEffect, useState } from 'react';
import {
  RefreshCw,
  Clock,
  CheckSquare,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  Plus,
  Trash2,
  X,
  Save
} from 'lucide-react';

import Login from '../components/Login';
import { api } from '../utils/api';
import { storage, type User, type WorkTemplate } from '../utils/storage';

export interface SummaryData {
  workedHoursToday?: number;
  targetHoursToday?: number;
  workedHoursWeek?: number;
  targetHoursWeek?: number;
  pendingTasksCount?: number;
  completedTasksCount?: number;
  recentActivities?: Array<{
    id: string;
    description: string;
    timestamp: string;
    type?: 'success' | 'warning' | 'info' | 'error';
  }>;
  [key: string]: any;
}

export default function Popup(): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'templates'>('dashboard');

  // Templates States
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTplId, setEditTplId] = useState<string | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplWorkType, setTplWorkType] = useState<'PROYECTO' | 'ADMINISTRATIVO'>('PROYECTO');
  const [tplProject, setTplProject] = useState('');
  const [tplTaskType, setTplTaskType] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [customProjectInput, setCustomProjectInput] = useState(false);

  // Catalogs
  const [catalogs, setCatalogs] = useState<{
    projects: string[];
    taskTypes: string[];
  }>({
    projects: [],
    taskTypes: [
      "CORRECCIÓN DE ERRORES", "DISEÑO", "DESARROLLO", "DOCUMENTACIÓN",
      "REUNIONES", "CONTROL DE CALIDAD", "INVESTIGACIÓN", "SOPORTE TÉCNICO", "CAPACITACIÓN"
    ]
  });

  const fetchSummary = async () => {
    try {
      setError(null);
      const data = await api.post<SummaryData>('/summary', {});
      setSummary(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al obtener el resumen';
      setError(msg);
    }
  };

  const loadTemplates = async () => {
    const t = await storage.getTemplates();
    setTemplates(t);
  };

  const fetchCatalogs = async () => {
    try {
      const response = await api.post<any>('/catalogs/get-catalogs', {
        catalogs: ["TR-TYPE-TASK", "TR-ADM-TYPE", "TR-TIMECARD-STATUS", "TR-WORK-TYPE"],
        lang: "es"
      });

      const rawTaskTypes = response["TR-TYPE-TASK"] || (response.catalogs && response.catalogs["TR-TYPE-TASK"]) || [];
      const taskTypes = rawTaskTypes.map((item: any) => item.value || item.name || item.code).filter(Boolean);

      const rawProjects = response["TR-WORK-TYPE"] || (response.catalogs && response.catalogs["TR-WORK-TYPE"]) || [];
      const projects = rawProjects.map((item: any) => item.value || item.name || item.code).filter(Boolean);

      setCatalogs({
        projects: projects.length ? projects : ["Proyecto Tutator", "Trinity Web", "Extension Testing"],
        taskTypes: taskTypes.length ? taskTypes : [
          "CORRECCIÓN DE ERRORES", "DISEÑO", "DESARROLLO", "DOCUMENTACIÓN",
          "REUNIONES", "CONTROL DE CALIDAD", "INVESTIGACIÓN", "SOPORTE TÉCNICO", "CAPACITACIÓN"
        ]
      });
    } catch (err) {
      console.warn("No se pudieron descargar los catálogos en vivo, usando estáticos:", err);
      setCatalogs({
        projects: ["Proyecto Tutator", "Trinity Web", "Extension Testing"],
        taskTypes: [
          "CORRECCIÓN DE ERRORES", "DISEÑO", "DESARROLLO", "DOCUMENTACIÓN",
          "REUNIONES", "CONTROL DE CALIDAD", "INVESTIGACIÓN", "SOPORTE TÉCNICO", "CAPACITACIÓN"
        ]
      });
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const storedUser = await storage.getUser();
      setUser(storedUser);
      if (storedUser) {
        await Promise.all([
          fetchSummary(),
          loadTemplates(),
          fetchCatalogs()
        ]);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleLoginSuccess = async (loggedInUser: User) => {
    setUser(loggedInUser);
    setLoading(true);
    await Promise.all([
      fetchSummary(),
      loadTemplates(),
      fetchCatalogs()
    ]);
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    await storage.clearAuth();
    setUser(null);
    setSummary(null);
    setError(null);
  };

  const handleCreateTemplateClick = () => {
    setIsEditing(true);
    setEditTplId(null);
    setTplName('');
    setTplWorkType('PROYECTO');
    setTplProject(catalogs.projects[0] || '');
    setTplTaskType(catalogs.taskTypes[0] || 'DESARROLLO');
    setTplDescription('');
    setCustomProjectInput(false);
  };

  const handleEditTemplateClick = (tpl: WorkTemplate) => {
    setIsEditing(true);
    setEditTplId(tpl.id);
    setTplName(tpl.name);
    setTplWorkType(tpl.workType);
    setTplProject(tpl.project);
    setTplTaskType(tpl.taskType);
    setTplDescription(tpl.description);
    setCustomProjectInput(!catalogs.projects.includes(tpl.project));
  };

  const handleSaveTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) return;

    const newTemplate: WorkTemplate = {
      id: editTplId || crypto.randomUUID(),
      name: tplName,
      workType: tplWorkType,
      project: tplWorkType === 'ADMINISTRATIVO' ? 'N/A' : tplProject,
      taskType: tplTaskType,
      description: tplDescription
    };

    await storage.saveTemplate(newTemplate);
    await loadTemplates();
    setIsEditing(false);
  };

  const handleDeleteTemplateClick = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta plantilla?')) {
      await storage.deleteTemplate(id);
      await loadTemplates();
    }
  };

  if (loading) {
    return (
      <div className='flex flex-col items-center justify-center p-12 min-w-[450px] bg-base-100 min-h-[500px]'>
        <span className="loading loading-ring loading-lg text-primary" />
        <p className="text-sm mt-4 text-base-content/60 animate-pulse">Cargando dashboard...</p>
      </div>
    );
  }

  const workedToday = summary?.workedHoursToday ?? 0;
  const targetToday = summary?.targetHoursToday ?? 8;
  const workedWeek = summary?.workedHoursWeek ?? 0;
  const targetWeek = summary?.targetHoursWeek ?? 40;
  const pendingTasks = summary?.pendingTasksCount ?? 0;
  const completedTasks = summary?.completedTasksCount ?? 0;
  const recentActivities = summary?.recentActivities ?? [];

  const progressToday = Math.min((workedToday / targetToday) * 100, 100);
  const progressWeek = Math.min((workedWeek / targetWeek) * 100, 100);

  return (
    <div id='my-ext' className='container p-4 min-w-[450px] max-w-[500px] bg-base-200 min-h-[530px] flex flex-col font-sans' data-theme='light'>
      {!user ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="flex flex-col gap-3 flex-1 pb-12">
          {/* Header Card with Gradient */}
          <div className="card bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-primary-content shadow-md border-none overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-lg -mr-6 -mt-6" />
            <div className="card-body p-4 relative z-10">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="card-title text-lg font-bold tracking-tight">¡Hola, {user.username}!</h2>
                  <p className="text-[10px] text-white/80">Trinity Extension • Corporativo</p>
                </div>
                <div className="flex gap-1.5">
                  {activeTab === 'dashboard' && (
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className={`btn btn-circle btn-xs bg-white/10 hover:bg-white/20 border-none text-white transition-all duration-300 ${refreshing ? 'animate-spin' : ''}`}
                      title="Actualizar datos"
                    >
                      <RefreshCw size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-circle btn-xs bg-white/10 hover:bg-red-500/20 hover:text-red-200 border-none text-white transition-all duration-200"
                    title="Cerrar sesión"
                  >
                    <LogOut size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TAB VIEW CONTENT */}
          {activeTab === 'dashboard' ? (
            <div className="flex flex-col gap-3">
              {error && (
                <div className="alert alert-error shadow-sm text-xs py-1.5 px-3 flex gap-2">
                  <span className="font-semibold">Error:</span>
                  <span className="flex-1 opacity-90">{error}</span>
                  <button onClick={handleRefresh} className="btn btn-xs btn-ghost p-1 h-auto min-h-0 text-white underline">Reintentar</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                <div className="card bg-base-100 shadow-sm border border-base-300">
                  <div className="card-body p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-base-content/60">
                      <Clock size={14} className="text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Hoy</span>
                    </div>
                    <div>
                      <div className="text-xl font-black text-base-content">
                        {workedToday}h <span className="text-[10px] text-base-content/40 font-normal">/ {targetToday}h</span>
                      </div>
                      <progress className="progress progress-primary w-full mt-1.5 h-1.5" value={progressToday} max="100" />
                    </div>
                    <div className="text-[9px] text-base-content/50 font-medium">
                      Progreso diario: {Math.round(progressToday)}%
                    </div>
                  </div>
                </div>

                <div className="card bg-base-100 shadow-sm border border-base-300">
                  <div className="card-body p-3.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-base-content/60">
                      <Clock size={14} className="text-purple-500" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Semana</span>
                    </div>
                    <div>
                      <div className="text-xl font-black text-base-content">
                        {workedWeek}h <span className="text-[10px] text-base-content/40 font-normal">/ {targetWeek}h</span>
                      </div>
                      <progress className="progress progress-secondary w-full mt-1.5 h-1.5" value={progressWeek} max="100" />
                    </div>
                    <div className="text-[9px] text-base-content/50 font-medium">
                      Progreso semanal: {Math.round(progressWeek)}%
                    </div>
                  </div>
                </div>
              </div>
              <div className="card bg-base-100 shadow-sm border border-base-300 flex-1">
                <div className="card-body p-3">
                  <h3 className="text-[10px] uppercase font-bold text-base-content/40 tracking-wider mb-1.5">Actividad Reciente</h3>
                  {recentActivities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-4 text-base-content/30 text-xs">
                      <span>Sin actividades recientes en la plataforma.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-[110px] overflow-y-auto pr-1">
                      {recentActivities.map((act) => (
                        <div key={act.id} className="flex gap-2 items-start text-xs border-b border-base-200 pb-1.5 last:border-0 last:pb-0">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            act.type === 'success' ? 'bg-success' :
                            act.type === 'warning' ? 'bg-warning' :
                            act.type === 'error' ? 'bg-error' : 'bg-info'
                          }`} />
                          <div className="flex-1 text-base-content/80 text-[11px] leading-tight">{act.description}</div>
                          <div className="text-[8px] text-base-content/40 whitespace-nowrap">{act.timestamp}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
              {isEditing ? (
                <form onSubmit={handleSaveTemplateSubmit} className="card bg-base-100 shadow-sm border border-base-300 p-4 flex flex-col gap-3 overflow-y-auto max-h-[380px]">
                  <div className="flex justify-between items-center border-b border-base-200 pb-2">
                    <span className="font-bold text-sm text-base-content">
                      {editTplId ? 'Editar Plantilla' : 'Nueva Plantilla'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="btn btn-ghost btn-circle btn-xs"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1 text-[10px] uppercase font-bold text-base-content/50">Nombre Identificador</label>
                    <input
                      type="text"
                      placeholder="Ej. Desarrollo Diario, Daily Scrum"
                      value={tplName}
                      onChange={(e) => setTplName(e.target.value)}
                      className="input input-bordered input-sm w-full"
                      required
                    />
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1 text-[10px] uppercase font-bold text-base-content/50">Tipo de Trabajo</label>
                    <div className="flex gap-4">
                      <label className="label cursor-pointer flex gap-1.5 py-1 text-xs">
                        <input
                          type="radio"
                          name="tpl_worktype"
                          checked={tplWorkType === 'PROYECTO'}
                          onChange={() => setTplWorkType('PROYECTO')}
                          className="radio radio-primary radio-sm"
                        />
                        <span>PROYECTO</span>
                      </label>
                      <label className="label cursor-pointer flex gap-1.5 py-1 text-xs">
                        <input
                          type="radio"
                          name="tpl_worktype"
                          checked={tplWorkType === 'ADMINISTRATIVO'}
                          onChange={() => setTplWorkType('ADMINISTRATIVO')}
                          className="radio radio-secondary radio-sm"
                        />
                        <span>ADMINISTRATIVO</span>
                      </label>
                    </div>
                  </div>

                  {tplWorkType === 'PROYECTO' && (
                    <div className="form-control w-full">
                      <div className="flex justify-between items-center">
                        <label className="label py-1 text-[10px] uppercase font-bold text-base-content/50">Proyecto</label>
                        <button
                          type="button"
                          className="text-[9px] text-primary hover:underline"
                          onClick={() => setCustomProjectInput(!customProjectInput)}
                        >
                          {customProjectInput ? 'Ver lista' : 'Escribir manual'}
                        </button>
                      </div>

                      {customProjectInput ? (
                        <input
                          type="text"
                          placeholder="Nombre exacto del proyecto"
                          value={tplProject}
                          onChange={(e) => setTplProject(e.target.value)}
                          className="input input-bordered input-sm w-full"
                          required
                        />
                      ) : (
                        <select
                          value={tplProject}
                          onChange={(e) => setTplProject(e.target.value)}
                          className="select select-bordered select-sm w-full"
                        >
                          {catalogs.projects.map((proj) => (
                            <option key={proj} value={proj}>{proj}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  <div className="form-control w-full">
                    <label className="label py-1 text-[10px] uppercase font-bold text-base-content/50">Tipo de Tarea</label>
                    <select
                      value={tplTaskType}
                      onChange={(e) => setTplTaskType(e.target.value)}
                      className="select select-bordered select-sm w-full"
                    >
                      {catalogs.taskTypes.map((task) => (
                        <option key={task} value={task}>{task}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-control w-full">
                    <label className="label py-1 text-[10px] uppercase font-bold text-base-content/50">Descripción Recurrente</label>
                    <textarea
                      placeholder="Escribe la descripción por defecto..."
                      value={tplDescription}
                      onChange={(e) => setTplDescription(e.target.value)}
                      className="textarea textarea-bordered textarea-sm w-full h-16 leading-tight resize-none"
                    />
                  </div>

                  <button type="submit" className="btn btn-primary btn-sm mt-1 w-full gap-1.5">
                    <Save size={14} />
                    <span>Guardar Plantilla</span>
                  </button>
                </form>
              ) : (
                <div className="flex-1 flex flex-col gap-2.5 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <h3 className="font-bold text-xs text-base-content/70 uppercase tracking-wider">Tus Plantillas</h3>
                    <button
                      type="button"
                      onClick={handleCreateTemplateClick}
                      className="btn btn-primary btn-xs gap-1"
                    >
                      <Plus size={12} />
                      <span>Nueva</span>
                    </button>
                  </div>

                  {templates.length === 0 ? (
                    <div className="flex-1 bg-base-100 rounded-lg p-8 border border-base-300 flex flex-col items-center justify-center text-center">
                      <ClipboardList size={32} className="text-base-content/20 mb-2" />
                      <span className="text-xs text-base-content/50">Aún no has creado ninguna plantilla.</span>
                      <button
                        onClick={handleCreateTemplateClick}
                        className="btn btn-outline btn-primary btn-xs mt-3"
                      >
                        Crear la primera
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
                      {templates.map((tpl) => (
                        <div key={tpl.id} className="card bg-base-100 border border-base-300 shadow-sm p-3 relative group hover:border-indigo-400 transition-colors">
                          <div className="flex justify-between items-start gap-2 pr-16">
                            <div>
                              <span className="font-bold text-xs text-base-content">{tpl.name}</span>
                              <div className="flex gap-1.5 mt-1 items-center flex-wrap">
                                <span className={`badge text-[8px] font-bold px-1.5 h-4 border-none ${
                                  tpl.workType === 'PROYECTO' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {tpl.workType}
                                </span>
                                {tpl.workType === 'PROYECTO' && (
                                  <span className="text-[9px] text-base-content/50 truncate max-w-[120px]">
                                    📁 {tpl.project}
                                  </span>
                                )}
                                <span className="text-[9px] text-base-content/60 font-semibold">
                                  ⚡ {tpl.taskType}
                                </span>
                              </div>
                            </div>
                          </div>

                          {tpl.description && (
                            <p className="text-[10px] text-base-content/50 mt-1.5 bg-base-200/50 p-1.5 rounded truncate italic">
                              "{tpl.description}"
                            </p>
                          )}

                          <div className="absolute right-2 top-2 flex gap-1">
                            <button
                              type="button"
                              onClick={() => handleEditTemplateClick(tpl)}
                              className="btn btn-ghost btn-circle btn-xs text-info hover:bg-info/10"
                              title="Editar"
                            >
                              <Plus size={12} className="rotate-45" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplateClick(tpl.id)}
                              className="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/10"
                              title="Eliminar"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 h-11 border-t border-base-300 bg-base-100 flex shadow-inner">
            <button
              type="button"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
                activeTab === 'dashboard' ? 'text-primary' : 'text-base-content/50 hover:text-base-content/85'
              }`}
              onClick={() => {
                setActiveTab('dashboard');
                setIsEditing(false);
              }}
            >
              <LayoutDashboard size={16} />
              <span className="text-[9px] font-bold">Resumen</span>
            </button>
            <button
              type="button"
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 ${
                activeTab === 'templates' ? 'text-primary' : 'text-base-content/50 hover:text-base-content/85'
              }`}
              onClick={() => setActiveTab('templates')}
            >
              <ClipboardList size={16} />
              <span className="text-[9px] font-bold">Plantillas</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
