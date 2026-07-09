import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface ImproveButtonProps {
  onClick: () => void;
  isImproving: boolean;
  label?: string;
}

export default function ImproveButton({ onClick, isImproving, label }: ImproveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isImproving}
      title="Mejorar redacción con IA"
      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:border-brand-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
    >
      {isImproving ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <Sparkles className="h-3 w-3" aria-hidden="true" />
      )}
      {label || 'Mejorar'}
    </button>
  );
}