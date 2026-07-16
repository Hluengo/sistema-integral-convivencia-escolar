/** @license SPDX-License-Identifier: Apache-2.0 */

import { BoldText } from '../lib/markdownUtils';

function renderBoldText(text: string) {
  return <BoldText text={text} />;
}

export default function MessageContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-left font-sans text-xs leading-relaxed">
      {lines.map((line) => {
        const trimmed = line.trim();
        const lineKey = `line-${trimmed.length}-${trimmed.charCodeAt(0) || 0}`;

        if (trimmed.startsWith('### ')) {
          return (
            <h4
              key={lineKey}
              className="mt-2 border-neutral-150 border-b pb-0.5 font-bold text-neutral-900"
            >
              {trimmed.substring(4)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lineKey} className="mt-3 flex items-center gap-1.5 font-bold text-brand-700 text-xs">
              {trimmed.substring(3)}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={lineKey} className="mt-4 border-neutral-700 border-l-2 pl-1 font-bold text-neutral-950 text-sm">
              {trimmed.substring(2)}
            </h2>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineKey} className="ml-3 flex items-start gap-1 font-medium text-neutral-600">
              <span className="select-none text-brand-500">•</span>
              <span>{renderBoldText(trimmed.substring(2))}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineKey} className="ml-3 flex items-start gap-1.5 font-medium text-neutral-600">
              <span className="font-bold font-mono text-brand-700">{numMatch[1]}.</span>
              <span>{renderBoldText(numMatch[2])}</span>
            </div>
          );
        }

        if (trimmed === '') { return <div key={lineKey} className="h-1" />; }

        return (
          <p key={lineKey} className="font-medium text-neutral-700">
            {renderBoldText(trimmed)}
          </p>
        );
      })}
    </div>
  );
}
