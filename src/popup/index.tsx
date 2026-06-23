import styles from '@assets/styles/index.css?inline';
import createShadowRoot from '@utils/createShadowRoot';

import { initPalette } from '../lib/initPalette';
import Popup from './Popup';

const root = createShadowRoot(styles);

// Tras createShadowRoot (registra el nodo de tema): aplica la paleta guardada.
initPalette();

root.render(<Popup />);
