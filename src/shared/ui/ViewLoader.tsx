/** @license SPDX-License-Identifier: Apache-2.0 */

import { useEffect, useState } from 'react';
import { PHRASES, type ViewLoaderView } from './viewLoaderPhrases';

const ROTATION_MS = 900;

interface ViewLoaderProps {
  view: ViewLoaderView;
  compact?: boolean;
}

export default function ViewLoader({ view, compact = false }: ViewLoaderProps) {
  const phrases = PHRASES[view];
  const [index, setIndex] = useState(0);
  const logoSize = compact ? 'h-12 w-12 rounded-xl' : 'h-16 w-16 rounded-2xl';
  const logoImageSize = compact ? 'h-7' : 'h-10';
  const padding = compact ? 'px-4 py-8' : 'px-6 py-12';

  useEffect(() => {
    setIndex(0);
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % phrases.length);
    }, ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [view, phrases.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${padding}`}
    >
      <div
        className={`relative mx-auto flex items-center justify-center overflow-hidden bg-neutral-900 shadow-lg ${logoSize}`}
      >
        <img
          src="/logo.svg"
          alt=""
          aria-hidden="true"
          className={`animate-logo-pulse w-auto invert ${logoImageSize}`}
        />
        <span
          className="animate-logo-shine pointer-events-none absolute inset-0"
          aria-hidden="true"
        />
      </div>
      <p key={index} className="animate-fade-in mt-5 text-sm font-medium text-neutral-500">
        {phrases[index]}
      </p>
      <div
        className="mx-auto mt-5 h-1.5 w-32 overflow-hidden rounded-full bg-neutral-200"
        aria-hidden="true"
      >
        <div className="animate-progress-sweep h-full w-[42%] rounded-full bg-brand-600" />
      </div>
      <span className="sr-only">Cargando</span>
    </div>
  );
}
