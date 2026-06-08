// Reconocimiento de voz del navegador (Web Speech API). Es gratis y no consume IA.
// Soportado en Chrome/Edge/Brave; Firefox no lo trae. La transcripción la procesa el
// navegador (servicio de Google), no el backend de Trinity.

interface SpeechResultAlt {
  transcript: string;
}
interface SpeechResult {
  0: SpeechResultAlt;
  isFinal: boolean;
}
interface SpeechResultList {
  length: number;
  [index: number]: SpeechResult;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechResultList;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** true si el navegador soporta dictado por voz. */
export function isVoiceSupported(): boolean {
  return getCtor() !== null;
}

export interface VoiceSession {
  stop: () => void;
}

interface RecognitionHandlers {
  /** `text` es el acumulado del tramo; `isFinal` indica si ya está consolidado. */
  onResult: (text: string, isFinal: boolean) => void;
  onError: (code: string) => void;
  onEnd: () => void;
}

/** Arranca el reconocimiento en el idioma dado ('es-ES' | 'en-US' | …). */
export function startRecognition(
  lang: string,
  handlers: RecognitionHandlers
): VoiceSession | null {
  const Ctor = getCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;

  rec.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i += 1) {
      const r = e.results[i];
      if (r.isFinal) final += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onResult(final || interim, Boolean(final));
  };
  rec.onerror = (e) => handlers.onError(e.error);
  rec.onend = () => handlers.onEnd();

  rec.start();
  return { stop: () => rec.stop() };
}
