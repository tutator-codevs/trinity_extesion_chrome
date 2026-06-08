# 07 · Atajo de teclado

**Estado: ✅ Base (abre el popup)**

## Objetivo

Abrir Trinity al instante con el teclado para registrar sin usar el ratón.

## Implementación actual

`src/manifest.ts` declara dos comandos:

```
_execute_action  → Ctrl/Cmd+Shift+Y   Abrir Trinity (popup)
toggle-timer     → Ctrl/Cmd+Shift+U   Iniciar / terminar cronómetro (global)
```

`_execute_action` abre el popup directamente. `toggle-timer` lo gestiona el background
y es **global** (`"global": true`): funciona aunque el navegador no tenga el foco.

### Sobre el atajo global

- Soportado en **Chrome/Edge/Brave en Windows y macOS**. **No** en Linux ni Firefox.
- El navegador debe estar **abierto** (su proceso en segundo plano).
- Un global solo dispara lógica del background (no puede abrir el popup si no hay
  ventana enfocada). Por eso es el de **iniciar/terminar cronómetro**: al terminar se
  muestra una **notificación del sistema** con botón "Registrar horas" y se guarda un
  `pending_registration` que abre el formulario al entrar al popup.
- El usuario puede ver/reasignar la tecla y el ámbito (Global/En Chrome) en
  `chrome://extensions/shortcuts`.

## Posibles mejoras (futuro)

- Comando adicional para **registrar la plantilla favorita** sin abrir UI (requiere
  módulo 04 con favorita).

## Pendientes

- [ ] Verificar el atajo en Firefox (puede requerir ajuste de `commands`).
