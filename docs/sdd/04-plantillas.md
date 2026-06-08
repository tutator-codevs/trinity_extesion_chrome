# 04 · Plantillas reutilizables

**Estado: ✅ Hecho (base)**

## Objetivo

Guardar combinaciones frecuentes (p.ej. "Reunión diaria") y registrarlas con un clic,
sin reescribir tipo de trabajo, proyecto, tarea y descripción. Incluye también
**reutilizar un registro ya creado** desde el resumen.

## Modelo

```ts
WorkTemplate {
  id, name,
  workTypeCt, workTypeLabel,   // código que se envía + etiqueta para mostrar
  typeTaskCt, taskLabel,
  projectId, projectName,      // null si ADMINISTRATIVO
  description
}
```
Guarda **códigos** (para aplicar sin re-resolver catálogos) y **etiquetas** (para
mostrar legible). Persisten en `storage.local`.

## UI / UX

- En `RegisterForm`: tira de **chips de plantillas** (clic = aplicar, ✕ = eliminar) y
  botón **"Guardar como plantilla"** (pide nombre y guarda los valores actuales).
- En el resumen (`Dashboard`): cada registro tiene **"Reutilizar"** → abre el
  formulario precargado con ese registro (tipo, proyecto, tarea, descripción y horas),
  con la fecha de hoy.

## Lógica

- Aplicar plantilla / reutilizar registro = precargar el formulario (prop `initial`).
- Aplicar no toca fecha; reutilizar pone fecha de hoy y copia las horas del registro.

## Pendientes

- [ ] Marcar una plantilla como **favorita** (para el atajo / registro rápido — módulo 07).
- [ ] (Opcional) Hora recurrente sugerida por plantilla.
- [ ] (Opcional) Sincronizar plantillas con backend (hoy locales por dispositivo).
- [ ] (Opcional) Editar plantilla existente (hoy: borrar + recrear).
