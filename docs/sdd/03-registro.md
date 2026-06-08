# 03 · Registro de horas (formulario propio)

**Estado: 🚧 En curso**

## Objetivo

Registrar una entrada de horas desde la extensión, replicando el formulario web
"Actualizar horas de trabajo" pero más ágil, enviando directo al backend.

## Alcance

- Formulario propio: fecha, desde/hasta, tipo de trabajo, proyecto, tipo de tarea,
  descripción.
- Envío vía `POST /gen/insert` (`model: tri_timecard`).
- Al guardar, refrescar el resumen.
- **No** entra aún: editar/eliminar registros, plantillas (módulo 04).

## Contrato

```
POST /gen/find-many        // proyectos activos (si tipo = PROYECTO)
{ select:["id","name"], model:"tri_project",
  filter:{ orderBy:{name:"asc"}, where:{statusCt:"1"} } }
→ [{ id, name }]

POST /catalogs/get-catalogs  // TR-WORK-TYPE, TR-TYPE-TASK, TR-ADM-TYPE
{ catalogs:[...], lang }      // lang del navegador (navigator.language)
→ { "<COD>": [{ catalogCode, catalogCodeDep, label, order, value }] }
  // value = código que se envía (*Ct); label = visible; ordenar por `order`

POST /gen/insert
{ model:"tri_timecard", userId, data: {
    workTypeCt, typeTaskCt, description, projectId,
    date, start, end, hours, statusCt:"1", softDelete:false, userId
}}
```

### Mapeo de campos

| Campo UI | Payload | Origen |
|----------|---------|--------|
| Tipo de trabajo | `workTypeCt` | código de `TR-WORK-TYPE` |
| Proyecto (solo PROYECTO) | `projectId` | `id` de `tri_project`; `null` si ADMINISTRATIVO |
| Tipo de tarea | `typeTaskCt` | código de `TR-TYPE-TASK` (proy.) o `TR-ADM-TYPE` (adm.) |
| Descripción | `description` | textarea |
| Fecha | `date` | fecha local `YYYY-MM-DD` |
| Desde/Hasta | `start`/`end` | hora local → ISO UTC (`time.localToUtcIso`) |
| (auto) | `hours` | `time.diffHours(desde, hasta)` |
| (fijo) | `statusCt` | `"1"` |
| (sesión) | `userId` | `user.userId` |

⚠️ Los **códigos de catálogo se envían tal cual** (pueden llevar espacios, p.ej.
`"510-40 "`). No hacer `.trim()`.

## UI / UX (`src/components/RegisterForm.tsx`)

- Botón **Registrar horas** en el Dashboard abre el formulario (vista dedicada).
- Tipo de trabajo como segmentado PROYECTO/ADMINISTRATIVO.
- Proyecto visible solo si PROYECTO.
- Tipo de tarea según el tipo de trabajo.
- Duración calculada en vivo a partir de desde/hasta.
- Botón **Guardar horas** (degradado) y **Cancelar**; éxito → vuelve y refresca resumen.

## Lógica / validaciones

- Requeridos: tipo de trabajo, tarea, descripción, fecha, desde/hasta; proyecto si PROYECTO.
- `hasta` debe ser mayor que `desde`.
- El "tipo de trabajo es PROYECTO o ADMINISTRATIVO" se decide por la etiqueta del
  catálogo (contiene "ADMIN") para no depender de un código fijo.

## Estado y pendientes

- [x] Mapeo de catálogos confirmado (`value`→código, `label`→visible, orden por `order`).
- [x] Idioma de catálogos tomado del navegador.
- [ ] Probar guardado real end-to-end y manejo de errores de validación del backend.
- [ ] Reutilizar este formulario para plantillas (módulo 04).
- [ ] Considerar `catalogCodeDep` (¿tareas dependientes del proyecto/tipo?).
