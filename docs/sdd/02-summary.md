# 02 · Resumen semanal (Dashboard)

**Estado: ✅ Hecho**

## Objetivo

Al abrir la extensión, ver de un vistazo cuánto se ha registrado en la semana y los
registros existentes.

## Contrato

```
POST /summary  { start, end, userId }      // start/end ISO UTC
→ {
  totalHours, averageHours,
  hoursByDay[], hoursByProject[], hoursByStatus[],
  hoursByTypeProject[], hoursByTypeAdministrative[],
  timecards[]   // registros tri_timecard completos
}
```
Cada bucket: `{ label, value, valueLabel }`.

## UI / UX (`src/components/Dashboard.tsx`)

- Cabecera con saludo (primer nombre), botón **Actualizar** y **Logout**.
- 2 métricas: **Total semana**, **Promedio / día**.
- **Horas por día**: barras a partir de `hoursByDay`.
- **Registros de la semana**: lista de `timecards` con rango horario en hora local,
  chip de proyecto/Administrativo y horas.
- Estados: cargando, error (con reintentar), vacío.

## Lógica

- Rango = semana actual (lunes→lunes) vía `time.currentWeekRangeUtc()`.
- Horas de cada registro convertidas UTC→local con `time.utcIsoToLocalTime`.
- Ante `AuthError` → `onSessionExpired()` → login.

## Pendientes

- Selector de rango (hoy / semana / mes) — hoy fijo a semana.
- Mapear `workTypeCt` a etiqueta real del catálogo (hoy heurística `=== '2'`).
- Quitar `console.log` de debug de `trinity.getSummary`.
