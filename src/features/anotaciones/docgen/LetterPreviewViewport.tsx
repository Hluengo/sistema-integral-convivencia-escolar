/** @license SPDX-License-Identifier: Apache-2.0 */

import { type ReactNode, useRef, useEffect, useState, useCallback } from 'react';

interface LetterPreviewViewportProps {
  children: ReactNode;
  className?: string;
  onOverflowChange?: (hasOverflow: boolean) => void;
}

const FOLIO_WIDTH_MM = 216;

export default function LetterPreviewViewport({
  children,
  className = '',
  onOverflowChange,
}: LetterPreviewViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const checkOverflow = useCallback(() => {
    const el = containerRef.current?.querySelector('.letter-document') as HTMLElement | null;
    if (!el) return;
    const overflow = el.scrollHeight > el.clientHeight + 2;
    onOverflowChange?.(overflow);
  }, [onOverflowChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateScale = () => {
      const containerWidth = container.clientWidth;
      const folioWidthPx = (FOLIO_WIDTH_MM / 25.4) * 96;
      const newScale = Math.min(1, containerWidth / folioWidthPx);
      setScale(newScale);
    };

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    checkOverflow();
  }, [scale, checkOverflow]);

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden ${className}`}
      style={{
        display: 'flex',
        justifyContent: 'center',
        background: '#f3f4f6',
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
          width: `${(FOLIO_WIDTH_MM / 25.4) * 96}px`,
          flexShrink: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export { FOLIO_WIDTH_MM };
