# 06 · Cronómetro de actividad

**Estado: ✅ Hecho**

## Implementado

- **Iniciar/terminar** con el comando de teclado `toggle-timer` (`Ctrl/Cmd+Shift+U`)
  o con el botón del Dashboard (banner verde con minutos en vivo).
- Estado en `storage.local` (`active_timer`) → sobrevive a la suspensión del SW y se
  sincroniza con el popup vía `storage.onChanged`.
- A los **30 min** (`TIMER_CHECK_MINUTES`) el background notifica *"¿Sigues en…?"* con
  botones **[Sigo]** (re-programa otros 30 min) y **[Terminé]** (detiene).
- Al terminar: calcula `inicio → fin`, guarda un `pending_registration` y abre el
  popup con el **formulario precargado** (descripción = etiqueta, horas = lo que duró).
  El usuario completa tipo de trabajo/tarea y guarda.
- **Bloques de 15 min**: los timecards van de cuarto en cuarto, así que al terminar se
  redondea el inicio hacia abajo y el fin hacia arriba (mínimo un bloque de 15 min).
  Los selectores de hora del formulario también saltan de 15 en 15 (`step=900`).

## Objetivo

Marcar el inicio de una actividad ("iniciar reunión"), recibir un aviso a los ~30 min
("¿sigues en reunión?") y, al cerrar, convertir el tiempo transcurrido en una entrada
de timecard.

## Alcance

- Iniciar / pausar / detener una actividad en curso.
- Aviso periódico (~30 min) mientras siga activa.
- Al detener: precargar el formulario de registro con la duración calculada.

## Arquitectura

- **Background service worker** (`src/background/index.ts`) con `browser.alarms`.
- Estado del cronómetro en `storage.local` (sobrevive a la suspensión del SW en MV3).
- Notificación con `browser.notifications` (permiso ya declarado).
- El popup lee/escribe el estado y muestra el cronómetro en vivo.

## Flujo

```
[Iniciar] → guarda { startedAt, label } + alarms.create(cada 30m)
   alarm → notifications.create("¿Sigues en <label>?  [Sí] [Terminé]")
[Terminé] → calcula duración → abre RegisterForm precargado → /gen/insert → limpia estado
```

## Pendientes

- [x] Interacción de la notificación (botones Sigo/Terminé; clic abre popup).
- [x] Al cerrar, se elige tarea en el formulario precargado.
- [ ] (Opcional) Elegir **etiqueta** al iniciar desde la UI (hoy fija "Reunión").
- [ ] (Opcional) Iniciar el cronómetro **desde una plantilla** (tipo/tarea ya puestos).
- [ ] Verificar `chrome.action.openPopup()` en cada navegador (fallback: el `pending`
      abre el formulario al abrir el popup manualmente).
