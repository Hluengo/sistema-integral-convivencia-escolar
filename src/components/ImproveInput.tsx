import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useTextImprovement } from '../hooks/useTextImprovement';

interface ImproveInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function ImproveInput({
  id, value, onChange, label, placeholder, required, className,
}: ImproveInputProps) {
  const { improveText, isImproving } = useTextImprovement();

  const handleImprove = async () => {
    const improved = await improveText(value);
    if (improved) onChange(improved);
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-[9px] font-semibold text-neutral-400 uppercase tracking-wide">{label}</label>
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
      <input
        id={id}
        type="text"
        required={required}
        spellCheck={true}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className || "w-full mt-1.5 border border-neutral-200 rounded-lg p-2.5 bg-neutral-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 text-xs transition-all"}
      />
    </div>
  );
}