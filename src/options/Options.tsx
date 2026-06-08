import { useState, type JSX } from 'react';
import { Mic, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

import { BRAND_GRADIENT } from '../lib/brand';

type Status = 'idle' | 'asking' | 'granted' | 'denied';

/**
 * Página de permisos. El popup de la extensión (MV3) no puede pedir el micrófono:
 * al aparecer el prompt del navegador, el popup pierde el foco y se cierra, así que
 * el permiso nunca se concede. Esta es una página real que permanece abierta, por lo
 * que `getUserMedia` sí muestra el prompt. Una vez concedido al origen de la
 * extensión, el dictado por voz funciona en el popup.
 */
export default function Options(): JSX.Element {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestMic = async () => {
    setStatus('asking');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Cerramos el stream: solo queríamos que se concediera el permiso.
      stream.getTracks().forEach((t) => t.stop());
      setStatus('granted');
    } catch (err: unknown) {
      setStatus('denied');
      setError(
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Bloqueaste el micrófono. Permítelo desde el icono de la barra de direcciones y reintenta.'
          : 'No se pudo acceder al micrófono. Revisa que haya uno conectado.'
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">
        <div
          className="flex size-12 items-center justify-center rounded-2xl text-white shadow-md"
          style={{ background: BRAND_GRADIENT }}
        >
          <Mic size={24} />
        </div>

        <div>
          <h1 className="text-lg font-extrabold text-slate-800">Permiso de micrófono</h1>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Para llenar el formulario dictando por voz, Trinity necesita permiso de
            micrófono. Concédelo aquí una sola vez; después funcionará desde el popup.
          </p>
        </div>

        {status === 'granted' ? (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>¡Listo! Ya puedes cerrar esta pestaña y dictar desde el popup.</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={requestMic}
            disabled={status === 'asking'}
            className="flex items-center justify-center gap-2 rounded-xl border-0 py-3 text-sm font-bold text-white shadow-md transition-opacity hover:opacity-95 disabled:opacity-60"
            style={{ background: BRAND_GRADIENT }}
          >
            {status === 'asking' ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Mic size={18} />
            )}
            <span>{status === 'asking' ? 'Solicitando…' : 'Permitir micrófono'}</span>
          </button>
        )}

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-slate-400">
          El audio lo procesa el navegador para transcribirlo. Solo se usa una IA externa
          si configuras tu propia API key en Ajustes.
        </p>
      </div>
    </div>
  );
}
