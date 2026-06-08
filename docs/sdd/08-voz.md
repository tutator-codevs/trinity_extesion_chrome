# 08 — Llenado por voz

## Objetivo

Que el usuario llene el formulario de registro **dictando** una frase en español o
inglés (p. ej. *"Proyecto Pivot, desarrollo fullstack, de 9 a 11"*), en lugar de
seleccionar cada campo a mano.

## Alcance

- **Sin backend.** Todo corre en la extensión (no hay endpoint intermedio).
- **Camino A (por defecto, gratis):** voz→texto con la Web Speech API del navegador +
  parser local que empareja con los catálogos y reconoce fechas/horas. Coste $0.
- **Camino B (opcional, de pago):** respaldo con IA (Claude/Gemini) **solo si** el
  usuario configura proveedor + API key en Ajustes, y **solo** cuando el parser local
  no está seguro (confianza < `VOICE_AI_THRESHOLD = 0.6`).
- No registra solo: **precarga** el formulario y el usuario confirma con "Guardar".

## Arquitectura

| Pieza | Archivo |
|-------|---------|
| STT (Web Speech API) | [`src/utils/voice.ts`](../../src/utils/voice.ts) |
| Parser local + resolución a códigos | [`src/utils/voiceParse.ts`](../../src/utils/voiceParse.ts) |
| Adaptador de IA (Anthropic / Gemini) | [`src/utils/voiceAi.ts`](../../src/utils/voiceAi.ts) |
| UI del micrófono | [`src/components/VoicePanel.tsx`](../../src/components/VoicePanel.tsx) |
| Integración + Ajustes | `RegisterForm.tsx`, `Dashboard.tsx` (SettingsPanel) |

Flujo: `VoicePanel` (transcripción) → `RegisterForm.handleVoiceSubmit` →
`parseLocal` → si confianza baja y hay IA, `parseWithAI` → `resolveFields`
(etiquetas → códigos del backend) → precarga del formulario.

## Lógica

- **STT:** `webkitSpeechRecognition`, idioma `es-ES`/`en-US` (toggle). Solo
  Chrome/Edge/Brave; Firefox muestra aviso de no soportado.
- **Parser local:** normaliza (minúsculas, sin acentos), empareja tarea/proyecto por
  solapamiento de tokens, detecta tipo de trabajo por palabras clave, y reconoce:
  - **Horas:** rango ("de 9 a 11", "from 9 to 5pm", "9-11") o inicio + duración
    ("a las 9 por 2 horas", "at 9 for 90 minutes").
  - **Fecha:** hoy/ayer/antier y equivalentes en inglés.
- **Resolución:** etiquetas → códigos `*Ct` / `projectId` reusando los catálogos ya
  cargados. El redondeo a 15 min y la conversión UTC los hace el `RegisterForm` al
  guardar (no cambia aquí).
- **IA (respaldo):** devuelve el mismo esquema de campos eligiendo `taskLabel`/
  `projectName` **exactamente** de las listas; si falla la llamada, se cae al
  resultado local (nunca rompe el flujo).

## Seguridad / coste

- **Nunca** se incrusta una key compartida en el bundle. La key es del usuario, vive
  en `storage.local` y solo se usa como respaldo. Modelos económicos:
  `claude-haiku-4-5` ($1/$5 por 1M) o `gemini-1.5-flash`.
- `host_permissions` añade `api.anthropic.com` y `generativelanguage.googleapis.com`
  (opcionales; sin key no se llaman).

## Estado y pendientes

- ✅ Camino A completo (STT + parser local + precarga).
- ✅ Camino B con Anthropic y Gemini (BYOK desde Ajustes).
- ⏳ Permiso de micrófono en el popup MV3 puede requerir gesto/permiso del navegador;
  si `not-allowed`, se muestra aviso. Evaluar `offscreen`/página de opciones si algún
  navegador lo bloquea.
- ⏳ Posible feedback visual de qué campos rellenó la voz (resaltado temporal).
