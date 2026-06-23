// Paletas de color de la extensión. Una paleta define dos cosas:
//   1. el **degradado de marca** (cabecera, botones primarios, badges de icono), y
//   2. el **color de acento**, que retiñe toda la rampa `indigo-*` de Tailwind
//      (botones, links "Reuse", badges, checkbox, focus…).
//
// Tailwind v4 compila `bg-indigo-600` → `var(--color-indigo-600)` y define esas
// variables en `:root, :host`. Por eso, para retiñirlas dentro del shadow root del
// popup, sobrescribimos las `--color-indigo-*` en el **nodo de montaje** del shadow
// (un inline style en un descendiente gana a la declaración de `:host`). La rampa se
// genera desde un único color base con `color-mix`, así una paleta = un color.
//
// El usuario elige su paleta en Ajustes (persistida en `Settings.paletteId`); la
// "personalizada" usa los colores de `Settings.customColors`.

export interface Palette {
  id: string;
  /** Color representativo para el swatch del selector. */
  swatch: string;
  /** Degradado de marca (CSS). */
  gradient: string;
  /** Color base de la rampa de acento. `null` = usar el índigo por defecto de Tailwind. */
  accent: string | null;
}

/** Paletas predefinidas. La primera es la de por defecto. */
export const PALETTES: Palette[] = [
  {
    id: 'trinity',
    swatch: '#7c3aed',
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%)',
    accent: null, // índigo por defecto de Tailwind
  },
  {
    id: 'ocean',
    swatch: '#2563eb',
    gradient: 'linear-gradient(135deg, #0891b2 0%, #2563eb 50%, #4f46e5 100%)',
    accent: '#2563eb',
  },
  {
    id: 'sunset',
    swatch: '#ea580c',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ea580c 100%)',
    accent: '#ea580c',
  },
  {
    id: 'ruby',
    swatch: '#dc2626',
    gradient: 'linear-gradient(135deg, #fb7185 0%, #ef4444 50%, #dc2626 100%)',
    accent: '#dc2626',
  },
];

export const DEFAULT_PALETTE_ID = PALETTES[0].id;

/** Id reservado para la paleta personalizada (colores elegidos por el usuario). */
export const CUSTOM_PALETTE_ID = 'custom';

/** Colores por defecto de la paleta personalizada (los de Trinity). */
export const DEFAULT_CUSTOM_COLORS: [string, string, string] = ['#4f46e5', '#7c3aed', '#db2777'];

/** Construye el degradado de marca a partir de 3 colores. */
export function buildGradient(colors: string[]): string {
  const [a, b, c] = [
    colors[0] ?? DEFAULT_CUSTOM_COLORS[0],
    colors[1] ?? DEFAULT_CUSTOM_COLORS[1],
    colors[2] ?? DEFAULT_CUSTOM_COLORS[2],
  ];
  return `linear-gradient(135deg, ${a} 0%, ${b} 50%, ${c} 100%)`;
}

/** Devuelve la paleta predefinida por id, o la de por defecto si no existe. */
export function getPalette(id: string | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}

/** Resuelve el degradado activo: personalizado si toca, o el de la paleta predefinida. */
export function resolveGradient(paletteId: string | undefined, customColors: string[]): string {
  if (paletteId === CUSTOM_PALETTE_ID) return buildGradient(customColors);
  return getPalette(paletteId).gradient;
}

/** Resuelve el color base de acento: el central del custom, o el de la paleta. */
export function resolveAccent(paletteId: string | undefined, customColors: string[]): string | null {
  if (paletteId === CUSTOM_PALETTE_ID) return customColors[1] ?? DEFAULT_CUSTOM_COLORS[1];
  return getPalette(paletteId).accent;
}

// Receta de la rampa: cada tono se obtiene mezclando el color base con blanco
// (tonos claros) o negro (tonos oscuros). El 500 es el color base tal cual.
const RAMP: ReadonlyArray<readonly [shade: string, mix: 'white' | 'black' | null, pct: number]> = [
  ['50', 'white', 92],
  ['100', 'white', 84],
  ['200', 'white', 68],
  ['300', 'white', 48],
  ['400', 'white', 24],
  ['500', null, 0],
  ['600', 'black', 12],
  ['700', 'black', 26],
  ['800', 'black', 40],
  ['900', 'black', 52],
  ['950', 'black', 62],
];

/** Variables CSS de la rampa `--color-indigo-*` derivadas de un color base. */
function accentVars(base: string): Record<string, string> {
  return Object.fromEntries(
    RAMP.map(([shade, mix, pct]) => [
      `--color-indigo-${shade}`,
      mix === null ? base : `color-mix(in oklab, ${base}, ${mix} ${pct}%)`,
    ])
  );
}

// Nodo donde se aplican las variables de tema. El shadow root registra su nodo de
// montaje (ver createShadowRoot) para retiñir el `:host`. Se resuelve de forma perezosa
// para no tocar `document` al importar: este módulo lo importa también el service
// worker (vía storage), donde `document` no existe.
let themeTarget: HTMLElement | null = null;

/** Registra el nodo sobre el que se aplican las variables de tema. */
export function setThemeTarget(el: HTMLElement): void {
  themeTarget = el;
}

function resolveTarget(): HTMLElement | null {
  if (themeTarget) return themeTarget;
  return typeof document !== 'undefined' ? document.documentElement : null;
}

/** Aplica degradado y acento al nodo de tema. `accent: null` revierte al índigo base. */
export function applyTheme(gradient: string, accent: string | null): void {
  const target = resolveTarget();
  if (!target) return;
  target.style.setProperty('--brand-gradient', gradient);
  const vars = accent ? accentVars(accent) : null;
  RAMP.forEach(([shade]) => {
    const key = `--color-indigo-${shade}`;
    if (vars) target.style.setProperty(key, vars[key]);
    else target.style.removeProperty(key);
  });
}
