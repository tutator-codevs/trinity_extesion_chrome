// i18n: la UI sigue el idioma del navegador (navigator.language), igual que los
// catálogos del backend. Idiomas traducidos: español, inglés, francés. Para
// cualquier otro idioma se usa el de respaldo (español).
//
// Cada componente define su propio diccionario inline y crea su `t` con `makeT`.
// No hay un diccionario central compartido (evita conflictos y mantiene cada texto
// junto a su pantalla).

export type Locale = 'es' | 'en' | 'fr';

const SUPPORTED: Locale[] = ['es', 'en', 'fr'];
/** Idioma de respaldo para navegadores en un idioma no traducido. */
export const FALLBACK_LOCALE: Locale = 'es';

/** Locale activo, derivado del idioma del navegador (p.ej. "en-US" -> "en"). */
export function currentLocale(): Locale {
  const nav = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
  const base = nav.split('-')[0].toLowerCase();
  return (SUPPORTED as string[]).includes(base) ? (base as Locale) : FALLBACK_LOCALE;
}

/** Diccionario de una pantalla: un mapa clave->texto por cada idioma. */
export type Dict = Record<Locale, Record<string, string>>;

/** Interpola `{nombre}` con los valores de `params`. */
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return Object.entries(params).reduce(
    (out, [key, value]) => out.split(`{${key}}`).join(String(value)),
    str
  );
}

/** Crea la función de traducción de una pantalla a partir de su diccionario.
 *  Resuelve por locale actual; si falta la clave, cae al respaldo; si tampoco está,
 *  devuelve la clave (señal visible de traducción faltante). */
export function makeT(dict: Dict) {
  return (key: string, params?: Record<string, string | number>): string => {
    const table = dict[currentLocale()] ?? dict[FALLBACK_LOCALE];
    const text = table?.[key] ?? dict[FALLBACK_LOCALE]?.[key] ?? key;
    return interpolate(text, params);
  };
}
