# 05 · Cierre de día

**Estado: ✅ Hecho (aviso). Cierre en lote: pendiente**

## Implementado

- Alarma diaria (`browser.alarms`) a la **hora configurable** (Ajustes; por defecto
  **18:00**). Se (re)programa al cambiar los ajustes (vía `storage.onChanged`) y en
  `onInstalled`/`onStartup`.
- Al disparar: consulta el resumen del **día** (`/summary` con `dayRangeUtc`) y lanza
  una **notificación** con uno de tres mensajes:
  - sin horas → "No has registrado horas hoy…";
  - por debajo del objetivo → "Llevas Xh de Yh. Te faltan Zh…";
  - cumplido → "¡Bien! Registraste Xh hoy.".
- La notificación trae el botón **"Registrar horas"** → abre el popup en el formulario.
- Ajustes en el popup (icono ⚙️): activar/desactivar aviso, hora y horas objetivo.

## Objetivo

Al final de la jornada (botón "Terminé mi día" o a una hora configurable, p.ej. 18:00),
revisar lo pendiente de registrar y confirmarlo/volcarlo de golpe.

## Alcance

- Botón "Terminé mi día" en el Dashboard.
- Comparar lo registrado hoy (de `/summary`) contra un objetivo (p.ej. 8h) y/o contra
  las plantillas/actividades del cronómetro.
- Registrar en lote lo que falte.

## Contrato

- Lectura: `POST /summary` con rango del **día** (`time.dayRangeUtc`).
- Escritura: varios `POST /gen/insert` (uno por entrada).

## UI / UX

- Vista "Cierre de día": lista de entradas propuestas (editables) + total vs objetivo.
- Acción "Registrar todo".

## Pendientes

- [x] Objetivo de horas configurable (Ajustes).
- [x] Recordatorio a la hora de cierre vía `alarms` + `notifications`.
- [ ] **Cierre en lote**: vista con entradas propuestas (de plantillas/cronómetro) y
      "Registrar todo" para completar el día de una vez.
