# Trinity Extension — SDD (planes por módulo)

Este directorio contiene los **documentos de diseño (SDD)** de cada módulo de la
extensión. Cada archivo describe objetivo, alcance, contrato con el backend, UI,
estado y pendientes de un módulo.

> El contrato global del backend, las convenciones y el roadmap viven en
> [`/CLAUDE.md`](../../CLAUDE.md). Aquí se detalla módulo a módulo.

## Índice

| # | Módulo | Estado | Doc |
|---|--------|--------|-----|
| 0 | Visión y arquitectura | — | [00-overview.md](00-overview.md) |
| 1 | Autenticación (login / logout / token 4h) | ✅ Hecho | [01-auth.md](01-auth.md) |
| 2 | Resumen semanal (dashboard) | ✅ Hecho | [02-summary.md](02-summary.md) |
| 3 | Registro de horas (formulario propio) | 🚧 En curso | [03-registro.md](03-registro.md) |
| 4 | Plantillas reutilizables | ✅ Hecho | [04-plantillas.md](04-plantillas.md) |
| 5 | Cierre de día | ✅ Aviso (lote pend.) | [05-cierre-dia.md](05-cierre-dia.md) |
| 6 | Cronómetro de actividad | ✅ Hecho | [06-cronometro.md](06-cronometro.md) |
| 7 | Atajo de teclado | ✅ Base | [07-atajo-teclado.md](07-atajo-teclado.md) |

Leyenda: ✅ Hecho · 🚧 En curso · ⏳ Plan

## Convención de cada SDD

1. **Objetivo** — qué resuelve para el usuario.
2. **Alcance** — qué entra y qué no.
3. **Contrato** — endpoints / payloads / tipos.
4. **UI / UX** — pantallas, estados, navegación.
5. **Lógica** — reglas, validaciones, casos borde.
6. **Estado y pendientes** — qué falta.
