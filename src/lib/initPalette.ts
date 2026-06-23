import { storage } from '../utils/storage';
import { applyTheme, resolveGradient, resolveAccent } from './palettes';

/** Lee la paleta guardada en ajustes y la aplica. Fire-and-forget: hasta que
 *  resuelve, el fallback de `BRAND_GRADIENT` (Trinity) y el índigo base cubren la UI. */
export function initPalette(): void {
  storage
    .getSettings()
    .then((settings) =>
      applyTheme(
        resolveGradient(settings.paletteId, settings.customColors),
        resolveAccent(settings.paletteId, settings.customColors)
      )
    )
    .catch(() => {});
}
