import React from 'react';

export function BoldText({ text, strongClass = 'font-bold text-neutral-950' }: { text: string; strongClass?: string }) {
  const parts = text.split('**');
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={`b-${part.slice(0, 24)}-${i}`} className={strongClass}>{part}</strong>
        ) : (
          <React.Fragment key={`t-${part.slice(0, 24)}-${i}`}>{part}</React.Fragment>
        )
      )}
    </>
  );
}