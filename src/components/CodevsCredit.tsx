import { type JSX } from 'react';

import { BRAND_GRADIENT } from '../lib/brand';

/** Crédito discreto "by Codevs". "Codevs" lleva el degradado de marca (aplicado con
 *  `style` inline porque las utilidades de gradiente de Tailwind no aplican en el
 *  shadow root del popup). Es una atribución, no copy de UI: no se traduce. */
export default function CodevsCredit({ className = '' }: { className?: string }): JSX.Element {
  return (
    <p className={`text-center text-[11px] font-medium text-slate-400 ${className}`}>
      by{' '}
      <a
        href="https://codevs.tech/"
        target="_blank"
        rel="noopener noreferrer"
        className="font-extrabold tracking-tight transition-opacity hover:opacity-80"
        style={{
          backgroundImage: BRAND_GRADIENT,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        Codevs
      </a>
    </p>
  );
}
