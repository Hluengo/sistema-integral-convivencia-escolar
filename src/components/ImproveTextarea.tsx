import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTextImprovement } from '../hooks/useTextImprovement';

interface ImproveTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
}

export default function ImproveTextarea({
  id, value, onChange, label, placeholder, rows = 3, required, className,
}: ImproveTextareaProps) {
  const { improveText, isImproving } = useTextImprovement();

  const handleImprove = async () => {
    const improved = await improveText(value);
    if (improved) onChange(improved);
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide">{label}</label>
          <button
            type="button"
            onClick={handleImprove}
            disabled={isImproving || !value.trim()}
            title="Mejorar redacción con IA"
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:border-brand-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            {isImproving ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            )}
            Mejorar
          </button>
        </div>
      )}
      <textarea
        id={id}
        rows={rows}
        required={required}
        spellCheck={true}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className || "w-full mt-1.5 border border-neutral-200 rounded-xl p-3 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 leading-relaxed font-sans text-xs transition-all duration-200"}
      />
    </div>
  );
}