import { JSX, useEffect, useState } from 'react';
import { 
  ClipboardList, 
  Search, 
  Check, 
  Eye, 
  EyeOff, 
  Save, 
  Zap, 
  ChevronRight 
} from 'lucide-react';
import { storage, type WorkTemplate } from '../utils/storage';

export default function Content(): JSX.Element {
  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [templates, setTemplates] = useState<WorkTemplate[]>([]);
  const [availableProjects, setAvailableProjects] = useState<{ value: string; text: string }[]>([]);
  const [projectSearch, setProjectSearch] = useState('');
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Form capture state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showCaptureForm, setShowCaptureForm] = useState(false);

  // Load templates from storage
  const loadTemplates = async () => {
    const t = await storage.getTemplates();
    setTemplates(t);
  };

  // Poll DOM to detect if the work hours modal is open
  useEffect(() => {
    loadTemplates();

    const interval = setInterval(() => {
      // Find if there is a header or title containing "añadir horas"
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span'));
      const modalHeader = elements.find(el => 
        el.textContent?.trim().toLowerCase().includes('añadir horas de trabajo')
      );
      
      const isOpen = !!modalHeader;
      setModalOpen(isOpen);

      if (isOpen) {
        // Scrape available projects from select elements on the page
        const selectElement = document.querySelector('select');
        if (selectElement) {
          const options = Array.from(selectElement.options)
            .map(o => ({ value: o.value, text: o.text.trim() }))
            .filter(o => o.value && !o.text.toLowerCase().includes('selecciona'));
          
          setAvailableProjects(options);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleApplyTemplate = (tpl: WorkTemplate) => {
    try {
      // 1. Fill Work Type (Radio buttons)
      const labels = Array.from(document.querySelectorAll('label'));
      const workTypeLabel = labels.find(l => 
        l.textContent?.trim().toUpperCase() === tpl.workType
      );
      if (workTypeLabel) {
        workTypeLabel.click();
        const input = workTypeLabel.querySelector('input') || document.getElementById(workTypeLabel.htmlFor);
        if (input) {
          (input as HTMLInputElement).checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // 2. Fill Project (Select box)
      if (tpl.workType === 'PROYECTO') {
        const selectElement = document.querySelector('select');
        if (selectElement) {
          const options = Array.from(selectElement.options);
          const match = options.find(o => 
            o.text.trim().toLowerCase().includes(tpl.project.toLowerCase()) || 
            o.value.toLowerCase() === tpl.project.toLowerCase()
          );
          if (match) {
            selectElement.value = match.value;
            selectElement.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }

      // 3. Fill Task Type (Radio buttons)
      const taskLabel = labels.find(l => 
        l.textContent?.trim().toUpperCase() === tpl.taskType.toUpperCase()
      );
      if (taskLabel) {
        taskLabel.click();
        const input = taskLabel.querySelector('input') || document.getElementById(taskLabel.htmlFor);
        if (input) {
          (input as HTMLInputElement).checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // 4. Fill Description (Textarea)
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = tpl.description;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      setSaveSuccess(`Aplicada: ${tpl.name}`);
      setTimeout(() => setSaveSuccess(null), 2000);
    } catch (err) {
      console.error('Error al aplicar la plantilla', err);
    }
  };

  const handleSelectProject = (projectText: string, projectValue: string) => {
    const selectElement = document.querySelector('select');
    if (selectElement) {
      selectElement.value = projectValue;
      selectElement.dispatchEvent(new Event('change', { bubbles: true }));
      setProjectSearch('');
      
      setSaveSuccess(`Proyecto: ${projectText}`);
      setTimeout(() => setSaveSuccess(null), 1500);
    }
  };

  const handleCaptureForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    try {
      // Find Work Type
      let workType: 'PROYECTO' | 'ADMINISTRATIVO' = 'PROYECTO';
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      const checkedRadio = radios.find(r => (r as HTMLInputElement).checked);
      if (checkedRadio) {
        const labels = Array.from(document.querySelectorAll('label'));
        const associatedLabel = labels.find(l => 
          l.htmlFor === checkedRadio.id || l.contains(checkedRadio)
        );
        if (associatedLabel && associatedLabel.textContent?.trim().toUpperCase().includes('ADMINISTRATIVO')) {
          workType = 'ADMINISTRATIVO';
        }
      }

      // Find Project
      let project = 'N/A';
      if (workType === 'PROYECTO') {
        const select = document.querySelector('select');
        if (select) {
          const selectedOption = select.options[select.selectedIndex];
          if (selectedOption && selectedOption.value) {
            project = selectedOption.text.trim();
          }
        }
      }

      // Find Task Type
      let taskType = 'DESARROLLO';
      const checkedRadioElements = Array.from(document.querySelectorAll('input[type="radio"]:checked'));
      for (const rad of checkedRadioElements) {
        const labels = Array.from(document.querySelectorAll('label'));
        const associatedLabel = labels.find(l => l.htmlFor === rad.id || l.contains(rad));
        if (associatedLabel) {
          const labelText = associatedLabel.textContent?.trim() || '';
          if (
            labelText &&
            !labelText.toUpperCase().includes('PROYECTO') &&
            !labelText.toUpperCase().includes('ADMINISTRATIVO')
          ) {
            taskType = labelText;
            break;
          }
        }
      }

      // Find Description
      const textarea = document.querySelector('textarea');
      const description = textarea?.value || '';

      const capturedTemplate: WorkTemplate = {
        id: crypto.randomUUID(),
        name: newTemplateName,
        workType,
        project,
        taskType,
        description
      };

      await storage.saveTemplate(capturedTemplate);
      await loadTemplates();
      setNewTemplateName('');
      setShowCaptureForm(false);
      
      setSaveSuccess(`"${capturedTemplate.name}" guardada!`);
      setTimeout(() => setSaveSuccess(null), 2500);
    } catch (err) {
      console.error('Error al capturar formulario', err);
    }
  };

  const filteredProjects = availableProjects.filter(p => 
    p.text.toLowerCase().includes(projectSearch.toLowerCase())
  );

  if (!modalOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] font-sans">
        <div className="bg-gradient-to-r from-indigo-650 to-purple-650 text-white rounded-full p-2.5 shadow-lg flex items-center gap-2 border border-white/20 hover:scale-105 transition-transform duration-200 cursor-pointer" onClick={() => setModalOpen(true)}>
          <Zap size={14} className="animate-pulse text-yellow-300" />
          <span className="text-[9px] font-bold tracking-wider select-none pr-1">TRINITY AUX</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-sans flex flex-col items-end gap-2">
      {saveSuccess && (
        <div className="bg-emerald-600 text-white text-[11px] px-3.5 py-1.5 rounded-lg shadow-xl flex items-center gap-1.5 border border-emerald-500 animate-bounce">
          <Check size={12} />
          <span className="font-semibold">{saveSuccess}</span>
        </div>
      )}

      {expanded ? (
        <div className="w-80 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white p-3 flex justify-between items-center border-none">
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-yellow-300 fill-yellow-300 animate-pulse" />
              <span className="font-extrabold text-[11px] tracking-wider uppercase">Trinity Helper</span>
            </div>
            <button 
              onClick={() => setExpanded(false)}
              className="text-white/80 hover:text-white transition-colors"
              title="Minimizar panel"
            >
              <EyeOff size={14} />
            </button>
          </div>

          <div className="p-3.5 flex flex-col gap-3 max-h-[350px] overflow-y-auto">
            {/* SEARCH PROJECT Autocomplete dropdown enhancement */}
            {availableProjects.length > 0 && (
              <div className="flex flex-col gap-1.5 border-b border-gray-100 pb-3">
                <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <Search size={10} />
                  <span>Buscador de Proyectos ({availableProjects.length})</span>
                </span>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Escribe para filtrar proyectos..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800"
                  />
                  {projectSearch && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 mt-1 rounded-lg shadow-lg z-[10000] max-h-32 overflow-y-auto">
                      {filteredProjects.length === 0 ? (
                        <div className="text-[10px] text-gray-400 p-2 text-center">No hay coincidencias</div>
                      ) : (
                        filteredProjects.map(p => (
                          <button
                            key={p.value}
                            onClick={() => handleSelectProject(p.text, p.value)}
                            className="w-full text-left text-xs px-2.5 py-1.5 hover:bg-indigo-50 text-gray-700 font-medium truncate border-b border-gray-50 last:border-0"
                          >
                            📁 {p.text}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TEMPLATES AUTO-FILL */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-extrabold uppercase text-gray-400 tracking-wider flex items-center gap-1">
                  <ClipboardList size={10} />
                  <span>Relleno Rápido</span>
                </span>
                <button
                  onClick={() => {
                    loadTemplates();
                    setShowCaptureForm(!showCaptureForm);
                  }}
                  className="text-[9px] text-indigo-650 font-extrabold flex items-center gap-0.5 hover:underline"
                >
                  {showCaptureForm ? 'Ver lista' : 'Capturar formulario'}
                </button>
              </div>

              {showCaptureForm ? (
                <form onSubmit={handleCaptureForm} className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-indigo-800">Guardar como plantilla</span>
                  <input
                    type="text"
                    placeholder="Nombre ej: Reunión Scrum..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="text-xs px-2 py-1 bg-white border border-indigo-200 rounded-md focus:outline-none text-gray-800"
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowCaptureForm(false)}
                      className="text-[9px] font-bold text-gray-505 hover:underline"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-extrabold px-2.5 py-1 rounded flex items-center gap-1 shadow-sm"
                    >
                      <Save size={10} />
                      <span>Guardar</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
                  {templates.length === 0 ? (
                    <div className="text-[10px] text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl leading-relaxed">
                      Sin plantillas guardadas.<br/>
                      Usa <strong>"Capturar formulario"</strong> con los campos llenos para guardar una al instante.
                    </div>
                  ) : (
                    templates.map(tpl => (
                      <button
                        key={tpl.id}
                        onClick={() => handleApplyTemplate(tpl)}
                        className="w-full text-left bg-gray-50 hover:bg-indigo-50 border border-gray-100 hover:border-indigo-200 p-2 rounded-xl flex items-center justify-between group transition-all duration-200"
                      >
                        <div className="flex-1 min-w-0 pr-2">
                          <span className="font-bold text-[11px] text-gray-800 block truncate group-hover:text-indigo-700">
                            {tpl.name}
                          </span>
                          <div className="flex gap-1.5 mt-0.5 items-center">
                            <span className={`text-[7px] font-extrabold px-1 rounded ${
                              tpl.workType === 'PROYECTO' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {tpl.workType}
                            </span>
                            {tpl.workType === 'PROYECTO' && (
                              <span className="text-[8px] text-gray-450 truncate max-w-[80px] font-semibold">
                                📁 {tpl.project}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setExpanded(true)}
          className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-2xl px-3 py-2 shadow-2xl flex items-center gap-1.5 border border-white/20 hover:scale-105 transition-transform duration-200"
          title="Abrir Trinity Helper"
        >
          <Zap size={14} className="text-yellow-300 fill-yellow-300" />
          <span className="text-[10px] font-extrabold tracking-wider uppercase">Trinity Helper</span>
          <Eye size={12} className="ml-1 opacity-80" />
        </button>
      )}
    </div>
  );
}
