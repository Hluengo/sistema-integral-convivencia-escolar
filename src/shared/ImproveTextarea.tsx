import { Sparkles, Loader2 } from 'lucide-react';
import { useTextImprovement, type TextImprovementContext } from './lib/hooks/useTextImprovement';
import Button from './ui/Button';

interface ImproveTextareaProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  className?: string;
  ariaDescribedBy?: string;
  ariaInvalid?: boolean;
  improvementContext?: TextImprovementContext;
}

export default function ImproveTextarea({
  id,
  value,
  onChange,
  label,
  placeholder,
  rows = 3,
  required,
  className,
  ariaDescribedBy,
  ariaInvalid,
  improvementContext,
}: ImproveTextareaProps) {
  const { improveText, isImproving, error } = useTextImprovement();

  const handleImprove = async () => {
    const improved = await improveText(value, improvementContext);
    if (improved) {
      onChange(improved);
    }
  };

  return (
    <div>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className="block font-semibold text-neutral-500 text-xs uppercase tracking-wide"
          >
            {label}
          </label>
          <Button
            variant="custom"
            size="sm"
            onClick={handleImprove}
            disabled={isImproving || !value.trim()}
            title="Mejorar redacción con IA"
            className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700 hover:border-brand-300 hover:bg-brand-100"
          >
            {isImproving ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3 w-3" aria-hidden="true" />
            )}
            Mejorar
          </Button>
        </div>
      )}
      <textarea
        id={id}
        aria-label={label || placeholder || id}
        rows={rows}
        required={required}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        spellCheck={true}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ||
          'mt-1.5 w-full rounded-xl border border-neutral-200 bg-neutral-50 p-3 font-sans text-xs leading-relaxed transition-colors duration-200 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30'
        }
      />
      {error && (
        <p role="alert" className="mt-1 text-gravisima-600 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
