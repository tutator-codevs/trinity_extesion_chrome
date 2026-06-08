import { useEffect, useRef, useState, type JSX } from 'react';
import browser from 'webextension-polyfill';
import { Mic, Square, X, Loader2, Sparkles, AlertTriangle, ExternalLink } from 'lucide-react';

import { isVoiceSupported, startRecognition, type VoiceSession } from '../utils/voice';
import { BRAND_GRADIENT } from '../lib/brand';

export type VoiceLang = 'es' | 'en';

interface VoicePanelProps {
  lang: VoiceLang;
  onLangChange: (l: VoiceLang) => void;
  /** Si hay un proveedor de IA configurado (cambia el texto de ayuda). */
  aiEnabled: boolean;
  /** Mientras se interpreta la transcripción. */
  busy: boolean;
  onSubmit: (transcript: string) => void;
  onClose: () => void;
}

const LANG_TAG: Record<VoiceLang, string> = { es: 'es-ES', en: 'en-US' };

export default function VoicePanel({
  lang,
  onLangChange,
  aiEnabled,
  busy,
  onSubmit,
  onClose,
}: VoicePanelProps): JSX.Element {
  const supported = isVoiceSupported();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsPermission, setNeedsPermission] = useState(false);
  const baseRef = useRef('');
  const sessionRef = useRef<VoiceSession | null>(null);

  const openPermissionPage = () => {
    browser.runtime.openOptionsPage().catch(() => {});
  };

  const stop = () => {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setListening(false);
  };

  useEffect(
    () => () => {
      sessionRef.current?.stop();
    },
    []
  );

  const start = () => {
    setError(null);
    setNeedsPermission(false);
    baseRef.current = transcript ? `${transcript.trim()} ` : '';
    const session = startRecognition(LANG_TAG[lang], {
      onResult: (text, isFinal) => {
        if (isFinal) {
          baseRef.current = `${baseRef.current}${text} `;
          setTranscript(baseRef.current.trim());
        } else {
          setTranscript(`${baseRef.current}${text}`.trim());
        }
      },
      onError: (code) => {
        const permission = code === 'not-allowed' || code === 'service-not-allowed';
        setNeedsPermission(permission);
        setError(
          permission
            ? 'Falta permiso de micrófono. Concédelo una vez para activar el dictado.'
            : 'No se pudo escuchar. Revisa el micrófono e inténtalo de nuevo.'
        );
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    if (!session) {
      setError('Tu navegador no soporta dictado por voz.');
      return;
    }
    sessionRef.current = session;
    setListening(true);
  };

  const toggle = () => (listening ? stop() : start());

  const submit = () => {
    const value = transcript.trim();
    if (!value) return;
    stop();
    onSubmit(value);
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-800">
          <Mic size={15} className="text-indigo-600" />
          Llenado por voz
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="flex size-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={16} />
        </button>
      </div>

      {!supported ? (
        <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Tu navegador no soporta dictado por voz. Usa Chrome, Edge o Brave.</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5 self-center rounded-full bg-slate-100 p-0.5">
            {(['es', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLangChange(l)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                  lang === l ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                }`}
              >
                {l === 'es' ? 'Español' : 'English'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className={`mx-auto flex size-16 items-center justify-center rounded-full text-white shadow-lg transition-transform active:scale-95 disabled:opacity-60 ${
              listening ? 'animate-pulse' : ''
            }`}
            style={{ background: listening ? '#e11d48' : BRAND_GRADIENT }}
            aria-label={listening ? 'Detener' : 'Hablar'}
          >
            {listening ? <Square size={22} /> : <Mic size={24} />}
          </button>
          <p className="text-center text-[11px] font-medium text-slate-400">
            {listening ? 'Escuchando… toca para detener' : 'Toca el micrófono y dicta tu registro'}
          </p>

          <textarea
            value={transcript}
            onChange={(e) => {
              baseRef.current = `${e.target.value} `;
              setTranscript(e.target.value);
            }}
            placeholder={'Ej. "Proyecto Pivot, desarrollo fullstack, de 9 a 11"'}
            rows={3}
            className="resize-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm leading-snug text-slate-800 outline-none focus:border-indigo-400"
          />

          {error ? (
            <div className="flex flex-col gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
              {needsPermission ? (
                <button
                  type="button"
                  onClick={openPermissionPage}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <ExternalLink size={13} />
                  Conceder permiso de micrófono
                </button>
              ) : null}
            </div>
          ) : null}

          <button
            type="button"
            onClick={submit}
            disabled={busy || !transcript.trim()}
            className="flex items-center justify-center gap-2 rounded-xl border-0 py-2.5 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
            style={{ background: BRAND_GRADIENT }}
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            <span>{busy ? 'Interpretando…' : 'Llenar formulario'}</span>
          </button>
          <p className="text-center text-[10px] text-slate-400">
            {aiEnabled
              ? 'Se interpreta localmente y, si hace falta, con tu IA configurada.'
              : 'Interpretación local (sin IA). Configura una IA en Ajustes para frases complejas.'}
          </p>
        </>
      )}
    </div>
  );
}
