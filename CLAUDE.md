# CLAUDE.md — Trinity Extension

Guía para trabajar en este repositorio. Léela antes de tocar código.

> Idioma de la UI: **sigue el idioma del navegador** (`navigator.language`).
> Traducidos: **es / en / fr**; respaldo **español** para cualquier otro idioma.
> Todo texto visible al usuario pasa por `t()` (ver `src/i18n/locale.ts`): cada
> componente define su diccionario inline `{ es, en, fr }` y crea su `t` con `makeT`.
> NO hardcodees textos visibles. Los identificadores y comentarios de código, en inglés/español
> respectivamente (los comentarios existentes están en español).

## Qué es esto

Extensión de navegador (Chrome/Edge/Brave/Firefox, **Manifest V3**) que permite a
los empleados de **Tutator / Trinity** registrar sus horas de trabajo (timecard)
**mucho más rápido** que el formulario de la app web.

**Es una app autocontenida.** La extensión tiene su **propio formulario** y se
comunica con el **backend por API**. NO scrapea ni rellena la web de Tutator —
decisión de producto: *no invadir esa aplicación*. (El content script de scraping
heredado queda obsoleto, ver más abajo.)

El `README.md` y parte de `package.json` todavía son del starter
[`chrome-ext-starter`](https://github.com/rezasohrabi/chrome-ext-starter); hay que
renombrarlos a Trinity.

## Visión de producto

El usuario imputa horas a diario sobre catálogos (proyecto, tipo de tarea, etc.) y
hoy lo hace en un formulario web lento. La extensión lo agiliza con:

1. **Login** → backend. El **token dura ~4h**; hay que manejar la caducidad
   (guardar expiración, refrescar o forzar re-login al expirar / ante 401).
2. **Plantillas recurrentes y persistentes** — ej. "Reunión diaria 10:00" guardada
   una vez y reutilizable con 1 clic, sin reescribir. Sobre los catálogos del form.
3. **Cierre de día** — botón "Terminé mi día" (o a una hora configurable, p. ej.
   18:00): muestra lo pendiente de registrar y permite confirmar/volcar todo de golpe.
4. **Cronómetro de actividad en vivo** — el usuario marca "iniciar reunión"; a los
   ~30 min la extensión avisa *"¿sigues en reunión?"*; al cerrar, esa actividad se
   convierte en una entrada del timecard. Requiere **background service worker +
   `alarms` + `notifications`**.
5. **Atajo de teclado** para **abrir el popup** rápidamente (Chrome `commands` API).

### Alcance acordado (v1)

Todo lo anterior (1–5) entra en v1, **incluido el atajo de teclado**. Construir en
orden de dependencias (ver Roadmap).

## Stack y reglas ya documentadas

Stack (Vite 6, React 19, TS estricto, Tailwind v4, DaisyUI 5, shadcn/base-ui,
CRXJS, webextension-polyfill, pnpm) y convenciones de stack ya descritos en:
- `.cursor/rules/*.mdc` — arquitectura, estilos/shadow-DOM, cross-browser, build.
- `.agents/skills/*` — react-best-practices, tailwind, shadcn, composition, a11y.

**No dupliques esas reglas aquí.** Este documento cubre solo lo específico de Trinity.

## Mapa del código

| Área | Archivo | Estado |
|------|---------|--------|
| Manifest | `src/manifest.ts` | 🟡 Opera en `*.tutator.net`. Falta `commands` (atajo) y revisar permisos (`alarms`) |
| Popup / dashboard | `src/popup/Popup.tsx` | 🟡 Funcional. ~560 líneas en un solo componente; refactor + nuevo formulario propio |
| Login | `src/components/Login.tsx` | 🟡 OK; falta manejo de expiración de token (4h) |
| Cliente API | `src/utils/api.ts` | 🟡 Bearer auth OK; falta refresco/401 y quitar logs de debug |
| Storage | `src/utils/storage.ts` | ✅ token/user/plantillas en `storage.local` |
| Background | `src/background/index.ts` | 🔴 Vacío. Aquí van alarms, cronómetro y notificaciones |
| Options | `src/options/Options.tsx` | 🔴 Demo. Candidato a "ajustes" (hora de cierre, etc.) o eliminar |
| Content script | `src/content/Content.tsx` | ⚫ **Obsoleto** (scraping de Tutator). Se retira: no invadimos la web |
| UI primitives | `src/components/ui/*` | shadcn/base-ui (button, input, card, alert, label) |

## Backend (Trinity API)

Base URL: `https://trinity-backend.tutator.net` (constante en `src/utils/api.ts`).

| Método | Endpoint | Uso |
|--------|----------|-----|
| `POST` | `/user/login` | `{ username, password }` → `{ token, user }`. Sin auth. Token ~4h |
| `POST` | `/summary` | Resumen de timecards del usuario en un rango (ver payload abajo) |
| `POST` | `/catalogs/get-catalogs` | `{ catalogs: [...], lang }`. Códigos: `TR-WORK-TYPE`, `TR-TYPE-TASK`, `TR-ADM-TYPE`, `TR-TIMECARD-STATUS` |
| `POST` | `/gen/insert` | **Endpoint genérico** de escritura: `{ model, data, userId }`. NO hay API por modelo |
| `POST` | `/gen/find-many` | **Endpoint genérico** de lectura: `{ select, model, filter:{ orderBy, where } }` |

- Toda petición autenticada manda `Authorization: Bearer <token>` automáticamente.
  Para endpoints públicos: `{ useAuth: false }`. Usa siempre el cliente `api`, no `fetch`.

### Registrar una entrada de horas (`/gen/insert`, model `tri_timecard`)

El form web ("Actualizar horas de trabajo") tiene: Tipo de trabajo (radio
PROYECTO/ADMINISTRATIVO), Proyecto (select), Tipo de tarea (radios), Descripción
(textarea). La extensión replica ese form propio y envía:

```jsonc
POST /gen/insert
{
  "model": "tri_timecard",
  "data": {
    "workTypeCt":  "2",              // código de TR-WORK-TYPE (en este ejemplo "2" = ADMINISTRATIVO)
    "typeTaskCt":  "510-40 ",        // código de TR-TYPE-TASK (proyecto) o TR-ADM-TYPE (admin). ⚠️ conservar espacios
    "description": "PIVOT - PRD - DEVELOPMENT FULLSTACK",
    "projectId":   null,             // id de tri_project si PROYECTO; null si ADMINISTRATIVO
    "date":        "2026-06-08",     // fecha local YYYY-MM-DD
    "start":       "2026-06-08T13:00:00.000Z",  // UTC. 09:00 local = 13:00Z (UTC-4)
    "end":         "2026-06-08T16:00:00.000Z",  // UTC
    "hours":       "3",              // string; (end - start) en horas
    "statusCt":    "1",              // código de TR-TIMECARD-STATUS
    "softDelete":  false,
    "userId":      "U-0000-2026-09"  // del usuario logueado
  },
  "userId": "U-0000-2026-09"         // se repite a nivel raíz
}
```

### Summary inicial (`/summary`)

```jsonc
POST /summary
{
  "start":  "2026-06-08T04:00:00.000Z",  // inicio de rango (medianoche local = 04:00Z en UTC-4)
  "end":    "2026-06-15T04:00:00.000Z",  // típicamente la semana
  "userId": "U-0000-2026-09"
}
```

### Listar proyectos (select "Proyecto", solo si PROYECTO)

```jsonc
POST /gen/find-many
{ "select": ["id","name"], "model": "tri_project",
  "filter": { "orderBy": { "name": "asc" }, "where": { "statusCt": "1" } } }
// → [{ id, name }, ...]   →  projectId = id elegido
```

### Reglas derivadas del contrato (RESUELTAS)

- **Zona horaria = la del navegador del usuario.** El servidor guarda en UTC-0 y cada
  usuario está en una zona distinta; nosotros convertimos. Enviar `start`/`end` como
  instante UTC (`new Date(local).toISOString()`); `date` = fecha local `YYYY-MM-DD`.
  Para `/summary`, el rango va de medianoche local (convertida a UTC) a medianoche local.
  Al mostrar, convertir UTC → hora local.
- **Códigos de catálogo se usan tal cual** (`typeTaskCt: "510-40 "` lleva espacio
  final). NO hacer `.trim()` sobre los códigos enviados.
- El **mapeo etiqueta↔código** sale de `/catalogs/get-catalogs`. Cada ítem:
  `{ catalogCode, catalogCodeDep, label, order, value }` → `value` es el código que
  se envía (`*Ct`), `label` el texto visible; se ordena por `order`. El form muestra
  `label` y envía `value`. `lang` se toma del navegador (`navigator.language`).
- `workTypeCt` decide el catálogo de tarea y si hay proyecto: PROYECTO→`TR-TYPE-TASK`
  + `projectId` de `tri_project`; ADMINISTRATIVO→`TR-ADM-TYPE` + `projectId: null`.
- **`userId`** = campo `userId` del objeto `user` del login (ej. `"U-0000-2026-09"`).

### Forma de `/summary` (response)

```jsonc
{
  "totalHours": 3, "averageHours": 3,
  "hoursByDay":       [{ "label": "8/Jun/2026", "value": 3, "valueLabel": "3h" }],
  "hoursByProject":   [{ "label": "Administrative", "value": 3, "valueLabel": "3h" }],
  "hoursByStatus":    [{ "label": "1", "value": 3, "valueLabel": "3h" }],
  "hoursByTypeProject": [],
  "hoursByTypeAdministrative": [{ "label": "510-40 ", "value": 3, "valueLabel": "3h" }],
  "timecards": [ /* registros tri_timecard completos: id, start, end, hours, statusCt, ... */ ]
}
```

## Modelo de datos clave

`WorkTemplate` (en `src/utils/storage.ts`) — plantilla de imputación:
```ts
{ id, name, workType: 'PROYECTO' | 'ADMINISTRATIVO', project, taskType, description }
```
Probablemente evolucione con la v1 (hora recurrente, favorito para atajo, etc.).
Las plantillas viven en `storage.local`. Evaluar sincronizar con backend si existe endpoint.

## Roadmap v1 (orden sugerido por dependencias)

1. **Identidad** — `package.json` + `README.md` → Trinity. (rápido)
2. **Limpieza** — quitar `console.log('entro aca')` en `api.ts` y el placeholder de
   `background/index.ts`. Retirar el content script de scraping del manifest.
3. **Token 4h** — guardar expiración al hacer login; en `api.ts` interceptar 401 →
   limpiar auth y forzar re-login; avisar al usuario antes de expirar si procede.
4. **Formulario propio + registro** *(bloqueado por el JSON del backend)* — construir
   el form de imputación sobre catálogos y el `api.post` de registro.
5. **Plantillas recurrentes** — reutilizar con 1 clic; campo de hora recurrente;
   marcar una como favorita (para el atajo).
6. **Cierre de día** — botón "Terminé mi día" + opción de hora (Options): listar
   pendientes y registrar en lote.
7. **Cronómetro en vivo** — background service worker + `alarms` + `notifications`:
   iniciar/parar actividad, aviso "¿sigues en reunión?" a los ~30 min, volcado a timecard.
8. **Atajo de teclado** — `commands` en manifest → abrir el popup.
9. **Refactor de `Popup.tsx`** — extraer subcomponentes (Dashboard, Plantillas,
   Formulario, CierreDeDía) conforme crezca.

> Estado: contrato del backend **completo** (registro, find-many proyectos, summary,
> catálogos, zona horaria del navegador). Nada bloqueado; v1 lista para implementar.

## Convenciones del proyecto

- **TypeScript estricto**: `strict`, `noUnusedLocals`, `noUnusedParameters` activos.
  `pnpm build` corre `tsc` antes de Vite — sin variables/params sin usar.
- **Imports con alias**: `@/`, `@utils/`, `@assets/` (ver `tsconfig.json`).
- **Navegador**: usa `webextension-polyfill` (`import browser from 'webextension-polyfill'`),
  nunca `chrome.*` directo, para compatibilidad Chrome/Firefox.
- **Estilos**: Tailwind + DaisyUI.
- **Mensajes de UI en español**; errores: `err instanceof Error ? err.message : '<fallback es>'`.
- **Commits**: Conventional Commits (commitlint + husky). lint-staged corre eslint --fix y prettier.

## Comandos

```bash
pnpm install            # requiere pnpm
pnpm dev                # dev Chrome (HMR), salida dist_chrome
pnpm dev:firefox        # dev Firefox (watch build), salida dist_firefox
pnpm build              # tsc + build producción Chrome
pnpm build:firefox      # tsc + build producción Firefox
pnpm lint               # eslint (max-warnings 0)
pnpm lint:spell         # cspell
```

Cargar en Chrome: `chrome://extensions` → modo desarrollador → "Cargar
descomprimida" → carpeta `dist_chrome`.

## Al terminar un cambio

1. `pnpm build` debe pasar limpio (incluye `tsc`).
2. `pnpm lint` sin warnings.
3. Si tocas registro/login, verifica el flujo de auth y la caducidad del token.
