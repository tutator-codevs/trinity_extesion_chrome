# Trinity Extension

Extensión de navegador (**Manifest V3**) para que el equipo de **Tutator / Trinity**
registre sus horas de trabajo (timecard) **mucho más rápido** que el formulario de la
app web. Es una app autocontenida: tiene su **propio formulario** y habla con el
backend **por API** (no scrapea ni rellena la web de Tutator).

Funciona en **Chrome, Edge, Brave y Firefox** desde una sola base de código.

## 📥 Descargar / instalar

- **Página de descarga:** **https://tutator-codevs.github.io/trinity_extesion_chrome/**
  (GitHub Pages servido desde [`docs/index.html`](docs/index.html); toma el último
  build de _Releases_ y ofrece el ZIP de Chrome y de Firefox).
- **Releases en GitHub:** https://github.com/tutator-codevs/trinity_extesion_chrome/releases

Instalación manual en Chrome: `chrome://extensions` → activa _Modo de desarrollador_
→ _Cargar descomprimida_ → selecciona la carpeta `dist_chrome`.

> ¿Un fallo o una idea? Abre un
> [issue](https://github.com/tutator-codevs/trinity_extesion_chrome/issues/new).

## ✨ Qué hace

- ⏱️ Registro de horas en segundos con formulario propio.
- 🔁 Plantillas reutilizables (con sus horas), gestionables desde Ajustes.
- 🎨 Paletas de color elegibles por usuario (Trinity, Océano, Naranja, Rojo o
  personalizada).
- 🟢 Cronómetro de actividad → se convierte en un registro al terminar.
- 🌙 Cierre de día con aviso a la hora que elijas.
- 🎙️ Llenado por voz (con respaldo de IA opcional).
- 📊 Resumen de horas por día / semana / mes.
- 🌐 Multi-idioma (es / en / fr según el navegador) y 🔐 sesión segura.

## 🧱 Stack

Vite 6 · React 19 · TypeScript (estricto) · Tailwind CSS v4 · DaisyUI 5 ·
shadcn/base-ui · [CRXJS](https://crxjs.dev/) · `webextension-polyfill` · pnpm.

## 🛠️ Desarrollo

Requiere **pnpm**.

```bash
pnpm install            # instala dependencias
pnpm dev                # dev Chrome (HMR) → dist_chrome
pnpm dev:firefox        # dev Firefox (watch)  → dist_firefox
pnpm build              # tsc + build producción Chrome
pnpm build:firefox      # tsc + build producción Firefox
pnpm lint               # eslint (max-warnings 0)
pnpm lint:spell         # cspell
```

## 🗂️ Estructura

| Ruta | Qué es |
|------|--------|
| `src/popup/` | Popup (dashboard, formulario, ajustes) |
| `src/background/` | Service worker (alarms, cronómetro, notificaciones) |
| `src/options/` | Página de opciones (permiso de micrófono) |
| `src/components/` | Componentes y primitivas de UI (shadcn/base-ui) |
| `src/utils/` | Cliente API, storage, tiempo, voz, tipos |
| `src/lib/` | Marca y **paletas de color** (theming) |
| `src/i18n/` | Internacionalización (`makeT`, diccionarios inline) |
| `docs/` | Página de descarga (`index.html`) y SDDs (`docs/sdd/`) |
| `CLAUDE.md` | Guía del repo (contrato del backend, convenciones, roadmap) |
| `.cursor/rules/`, `.agents/skills/` | Reglas de stack y skills de trabajo |

Antes de tocar código, lee **[`CLAUDE.md`](CLAUDE.md)**: documenta el contrato del
backend, las convenciones y el roadmap.

## 🧩 Cómo se construyó (receta del starter kit)

Este proyecto partió del starter
**[`chrome-ext-starter`](https://github.com/rezasohrabi/chrome-ext-starter)**
(Vite + React + TS + CRXJS + Tailwind + DaisyUI, con build cross-browser ya resuelto).
Pasos para arrancar **un proyecto futuro** desde el mismo punto:

1. **Clonar el starter** y renombrar el proyecto:
   ```bash
   git clone https://github.com/rezasohrabi/chrome-ext-starter.git mi-extension
   cd mi-extension && rm -rf .git && git init
   pnpm install
   ```
   Actualiza `package.json` (`name`, `description`, `version`) y este `README.md`.

2. **Definir la identidad** en `src/manifest.ts`: nombre, permisos (`alarms`,
   `notifications`, `storage`…), `host_permissions`, `commands` (atajos) e iconos.
   CRXJS genera el `manifest.json` final por navegador en el build.

3. **Construir tus pantallas** sobre las entradas del starter: `src/popup/`,
   `src/options/` y `src/background/` (service worker MV3). Cada entrada monta React
   dentro de un **shadow root** (ver `src/utils/createShadowRoot.tsx`) para aislar los
   estilos del host.

4. **Cross-browser**: usa siempre `import browser from 'webextension-polyfill'`
   (nunca `chrome.*`). El starter ya trae `pnpm dev/build` para Chrome y
   `pnpm dev:firefox / build:firefox` (salidas `dist_chrome` / `dist_firefox`).

5. **Convenciones que añadimos** (replicables): TypeScript estricto, alias de imports
   (`@/`, `@utils/`, `@assets/`), i18n con diccionarios inline por componente
   (`src/i18n/locale.ts`), theming por CSS variables (`src/lib/palettes.ts`,
   redefiniendo la rampa `--color-indigo-*` de Tailwind v4), Conventional Commits con
   commitlint + husky + lint-staged, y SDDs por feature en `docs/sdd/`.

6. **Publicar la página de descarga**: activa GitHub Pages con origen la carpeta
   `docs/` (Settings → Pages → _Deploy from a branch_ → `/docs`). El `index.html` lee
   el último _Release_ vía API de GitHub y enlaza los ZIP; queda publicado en
   `https://<owner>.github.io/<repo>/` (aquí,
   `https://tutator-codevs.github.io/trinity_extesion_chrome/`). Opcional: añade un
   `docs/CNAME` para usar un dominio propio.

## Soporte de navegadores

| Navegadores soportados (versión mínima)                   |
| --------------------------------------------------------- |
| 🟡 Chrome 88+ · 🟦 Edge 88+ · 🦁 Brave 88+ · 🦊 Firefox 109+ |

---

Hecho por [Codevs](https://codevs.tech/) · base inicial:
[chrome-ext-starter](https://github.com/rezasohrabi/chrome-ext-starter).
