import styles from '@assets/styles/index.css?inline';
import createShadowRoot from '@utils/createShadowRoot';

import { initPalette } from '../lib/initPalette';
import Options from './Options';

const root = createShadowRoot(styles);

// Tras createShadowRoot (registra el nodo de tema): aplica la paleta guardada.
initPalette();

root.render(<Options />);
