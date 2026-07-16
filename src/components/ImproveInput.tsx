
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
    if (improved) { onChange(improved); }
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block font-semibold text-[9px] text-neutral-400 uppercase tracking-wide">{label}</label>
          <button
            type="button"
            onClick={handleImprove}
            disabled={isImproving || !value.trim()}
            title="Mejorar redacción con IA"
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 font-semibold text-[10px] text-brand-700 transition-all hover:border-brand-300 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-50"
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
        className={className || "mt-1.5 w-full rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-xs transition-all focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"}
      />
    </div>
  );
}