import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Buscar causas, estudiantes, cursos...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
      <input
        id="global-search"
        type="text"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-neutral-200/60 bg-neutral-100 py-2 pr-16 pl-10 font-medium text-neutral-800 text-sm transition-all placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        aria-label="Búsqueda global"
      />
      <button
        type="button"
        onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
        className="absolute top-1/2 right-2 flex -translate-y-1/2 cursor-pointer items-center gap-1 rounded border border-neutral-200 bg-neutral-50 px-2 text-[11px] text-neutral-500 hover:bg-neutral-100"
        aria-label="Atajo de búsqueda: Ctrl+K"
      >
        <kbd className="h-5 px-1.5 rounded border border-neutral-200 bg-white text-neutral-600 font-mono text-[10px]">⌘K</kbd>
      </button>
    </div>
  );
}