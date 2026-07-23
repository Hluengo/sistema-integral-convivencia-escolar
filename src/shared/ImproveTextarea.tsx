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
    if (improved) { onChange(improved); }
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide">{label}</label>
          <button
            type="button"
            onClick={handleImprove}
            disabled={isImproving || !value.trim()}
            title="Mejorar redacción con IA"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 font-semibold text-[10px] text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
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
        aria-label={label || placeholder || id}
        rows={rows}
        required={required}
        spellCheck={true}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className || "mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-sans text-xs leading-relaxed transition-colors duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"}
      />
    </div>
  );
}