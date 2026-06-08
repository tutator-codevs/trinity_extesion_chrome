# 00 · Visión y arquitectura

## Objetivo

Extensión de navegador (Chrome/Edge/Brave/Firefox, MV3) para registrar horas de
trabajo en **Trinity** de forma más ágil que el formulario web. **App autocontenida**:
formulario propio + comunicación por **API**; no scrapea ni inyecta nada en la web de
Tutator.

## Arquitectura

```
popup (React)
 ├─ Login ──────────► trinity.login() ──► POST /user/login
 └─ Dashboard
     ├─ Resumen ────► trinity.getSummary() ──► POST /summary
     └─ RegisterForm ─► trinity.findProjects()  ─► POST /gen/find-many
                       trinity.getCatalogs()    ─► POST /catalogs/get-catalogs
                       trinity.insertTimecard() ─► POST /gen/insert
background (service worker)  ── cronómetro: alarms + notifications (futuro)
```

## Capas

| Capa | Archivos | Rol |
|------|----------|-----|
| Transporte | `src/utils/api.ts` | fetch + Bearer + manejo de 401 (`AuthError`) |
| Dominio | `src/utils/trinity.ts` | funciones tipadas por endpoint |
| Persistencia | `src/utils/storage.ts` | token (+expiración 4h), usuario, plantillas |
| Tipos | `src/utils/types.ts` | `User`, `Timecard`, `Summary`, `Project`, `CatalogItem`… |
| Tiempo | `src/utils/time.ts` | conversión local ↔ UTC (zona del navegador) |
| UI | `src/popup/*`, `src/components/*` | React + Tailwind v4 + shadcn |

## Decisiones clave

- **Zona horaria**: el backend guarda en UTC-0; cada usuario en su zona. La extensión
  convierte con la zona del navegador (`time.ts`).
- **Marca visual**: degradado en `src/lib/brand.ts` aplicado con `style` inline
  (las utilidades `bg-gradient-*` de Tailwind v4 no aplican dentro del shadow root).
- **userId**: es el `id` del objeto `user` del login (p.ej. `U-0000-2026-09`).
