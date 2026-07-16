import { AlertTriangle } from 'lucide-react';
import { BoldText } from '@/src/lib/markdownUtils';

export default function MarkdownRenderer({ text }: { text: string }) {
  if (!text) {
    return <p className="text-neutral-400 text-xs italic">No se ha generado contenido aún.</p>;
  }

  const lines = text.split('\n');
  return (
    <div className="space-y-2 font-sans text-neutral-700 text-xs leading-relaxed">
      {lines.map((line) => {
        const trimmed = line.trim();
        const lineKey = `line-${trimmed.length}-${trimmed.charCodeAt(0) || 0}`;

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={lineKey} className="mt-4 mb-2 border-neutral-100 border-b pb-1 font-bold text-neutral-900 text-sm">
              {trimmed.replace('### ', '')}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={lineKey} className="mt-5 mb-2 flex items-center gap-2 font-bold text-base text-emerald-700 text-neutral-900">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={lineKey} className="mt-6 mb-3 border-neutral-900 border-l-4 pl-2 font-bold text-lg text-neutral-950">
              {trimmed.replace('# ', '')}
            </h2>
          );
        }
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineKey} className="my-1 ml-4 flex items-start gap-2">
              <span className="mt-1 select-none text-brand-600">•</span>
              <span><BoldText text={trimmed.substring(2)} /></span>
            </div>
          );
        }
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={lineKey} className="my-1 ml-4 flex items-start gap-2">
              <span className="font-bold font-mono text-brand-700">{numMatch[1]}.</span>
              <span><BoldText text={numMatch[2]} /></span>
            </div>
          );
        }
        if (trimmed.startsWith('> ')) {
          return (
            <div key={lineKey} className="my-2 flex items-start gap-2 rounded-r-md border-amber-500 border-l-4 bg-amber-50 p-2.5 text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p className="italic"><BoldText text={trimmed.substring(2)} /></p>
            </div>
          );
        }
        if (trimmed === '') {
          return <div key={lineKey} className="h-2" />;
        }
        return (
          <p key={lineKey}><BoldText text={trimmed} /></p>
        );
      })}
    </div>
  );
}