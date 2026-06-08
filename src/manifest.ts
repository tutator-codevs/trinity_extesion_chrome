import { defineManifest } from '@crxjs/vite-plugin';

import packageData from '../package.json';

const isDev = process.env.NODE_ENV !== 'production';

export default defineManifest({
  manifest_version: 3,
  name: `${packageData.displayName || packageData.name}${
    isDev ? ` ➡️ Dev` : ''
  }`,
  version: packageData.version,
  description: packageData.description,
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      16: 'icon16.png',
      32: 'icon32.png',
      48: 'icon48.png',
      128: 'icon128.png',
    },
  },
  icons: {
    16: 'icon16.png',
    32: 'icon32.png',
    48: 'icon48.png',
    128: 'icon128.png',
  },
  // 'alarms' + 'notifications' alimentan el cronómetro de actividad (aviso "¿sigues
  // en reunión?"). 'storage' guarda token, usuario y plantillas.
  permissions: ['storage', 'alarms', 'notifications'],
  // Trinity es una app autocontenida: solo habla con su backend por API, no inyecta
  // scripts en la web de Tutator. Las URLs de IA son opcionales: solo se usan si el
  // usuario configura su propia API key para el llenado por voz (Camino B).
  host_permissions: [
    'https://*.tutator.net/*',
    'https://api.anthropic.com/*',
    'https://generativelanguage.googleapis.com/*',
  ],
  commands: {
    _execute_action: {
      suggested_key: {
        default: 'Ctrl+Shift+Y',
        mac: 'Command+Shift+Y',
      },
      description: 'Abrir Trinity',
    },
    'toggle-timer': {
      suggested_key: {
        default: 'Ctrl+Shift+U',
        mac: 'Command+Shift+U',
      },
      description: 'Iniciar / terminar cronómetro de actividad',
      // Funciona aunque el navegador no tenga el foco (Chrome/Edge/Brave en
      // Windows y macOS; no soportado en Linux ni Firefox).
      global: true,
    },
  },
});
