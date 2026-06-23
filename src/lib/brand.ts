// Degradado de marca. Se aplica con `style` inline porque las utilidades
// `bg-gradient-*` de Tailwind v4 no aplican dentro del shadow root del popup.
// El valor real lo define la paleta activa vía la CSS variable `--brand-gradient`
// (ver `src/lib/palettes.ts`); el fallback es la paleta Trinity, por si aún no se
// ha aplicado ninguna (p. ej. pantalla de login antes de cargar ajustes).
export const BRAND_GRADIENT =
  'var(--brand-gradient, linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%))';
