import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, FileText, LayoutDashboard, Users, MessageSquare } from 'lucide-react';
import { Causa } from '../types';
import type { SidebarView } from './Sidebar';

interface CommandPaletteProps {
  causas: Causa[];
  onNavigate: (view: SidebarView) => void;
  onSelectCausa: (id: string) => void;
}

export default function CommandPalette({ causas, onNavigate, onSelectCausa }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const items = useMemo(() => [
    {
      id: 'view-dashboard',
      icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" />,
      label: 'Dashboard',
      description: 'Ver panel principal',
      action: () => { onNavigate('dashboard'); setIsOpen(false); },
      category: 'Vistas',
    },
    {
      id: 'view-causas',
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
      label: 'Expedientes',
      description: 'Gestionar expedientes',
      action: () => { onNavigate('causas'); setIsOpen(false); },
      category: 'Vistas',
    },
    {
      id: 'view-advisor',
      icon: <MessageSquare className="h-4 w-4" aria-hidden="true" />,
      label: 'Asesor Legal',
      description: 'Consultar asistente IA',
      action: () => { onNavigate('informes'); setIsOpen(false); },
      category: 'Vistas',
    },
    {
      id: 'view-students',
      icon: <Users className="h-4 w-4" aria-hidden="true" />,
      label: 'Estudiantes',
      description: 'Panel de estudiantes',
      action: () => { onNavigate('alumnos'); setIsOpen(false); },
      category: 'Vistas',
    },
    ...causas.map(c => ({
      id: `causa-${c.id}`,
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
      label: `${c.id} — ${c.estudianteNombre}`,
      description: `${c.tipoInfraccion} • ${c.estadoActual}`,
      action: () => { onNavigate('causas'); onSelectCausa(c.id); setIsOpen(false); },
      category: 'Expedientes',
    })),
  ], [causas, onNavigate, onSelectCausa]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.description?.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  const clampedIndex = Math.min(selectedIndex, filtered.length - 1);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          dialogRef.current?.close();
          setIsOpen(false);
        } else {
          dialogRef.current?.showModal();
          setIsOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      focusTimerRef.current = setTimeout(() => inputRef.current?.focus(), 50);
      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const el = listRef.current?.children[clampedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [clampedIndex]);

  const handleClose = useCallback(() => {
    dialogRef.current?.close();
    setIsOpen(false);
  }, []);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && filtered[clampedIndex]) {
      e.preventDefault();
      filtered[clampedIndex].action();
    }
  }, [filtered, clampedIndex]);

  const handleDialogClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const activeDescendantId = filtered[clampedIndex] ? `cmd-option-${filtered[clampedIndex].id}` : undefined;

  return (
    <dialog
      ref={dialogRef}
      className="rounded-2xl border border-neutral-200 shadow-2xl p-0 w-full max-w-lg backdrop:bg-black/30 backdrop:backdrop-blur-sm animate-palette-in"
      onClose={handleDialogClose}
      aria-label="Paleta de comandos"
    >
      <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-100" role="combobox" aria-expanded={isOpen} aria-haspopup="listbox" aria-controls="cmd-listbox">
        <Search className="h-4 w-4 text-neutral-400 shrink-0" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => handleQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar expedientes, vistas, acciones..."
          className="flex-1 text-sm text-neutral-800 placeholder-neutral-400 bg-transparent focus:outline-none"
          aria-label="Buscar en la paleta de comandos"
          aria-autocomplete="list"
          aria-controls="cmd-listbox"
          aria-activedescendant={activeDescendantId}
          role="searchbox"
        />
        <kbd aria-hidden="true" className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-neutral-400 bg-neutral-100 rounded border border-neutral-200">
          ESC
        </kbd>
      </div>

      <div ref={listRef} id="cmd-listbox" role="listbox" aria-label="Resultados de búsqueda" className="max-h-72 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <div role="status" className="px-4 py-8 text-center">
            <p className="text-xs text-neutral-500">Sin resultados para &quot;{query}&quot;</p>
          </div>
        ) : (
          filtered.map((item, idx) => (
            <button
              key={item.id}
              id={`cmd-option-${item.id}`}
              type="button"
              role="option"
              aria-selected={idx === clampedIndex}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                idx === clampedIndex
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              <span className={`shrink-0 ${idx === clampedIndex ? 'text-brand-600' : 'text-neutral-400'}`}>
                {item.icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.label}</p>
                {item.description && (
                  <p className="text-[11px] text-neutral-500 truncate">{item.description}</p>
                )}
              </div>
              <span className="text-[10px] font-medium text-neutral-400 shrink-0">{item.category}</span>
            </button>
          ))
        )}
      </div>

      <div className="px-4 py-2 border-t border-neutral-100 flex items-center gap-4 text-[10px] text-neutral-400">
        <span className="flex items-center gap-1">
          <kbd aria-hidden="true" className="font-mono px-1 py-0.5 bg-neutral-100 rounded border border-neutral-200">↑↓</kbd>
          navegar
        </span>
        <span className="flex items-center gap-1">
          <kbd aria-hidden="true" className="font-mono px-1 py-0.5 bg-neutral-100 rounded border border-neutral-200">↵</kbd>
          seleccionar
        </span>
        <span className="flex items-center gap-1">
          <kbd aria-hidden="true" className="font-mono px-1 py-0.5 bg-neutral-100 rounded border border-neutral-200">esc</kbd>
          cerrar
        </span>
      </div>
    </dialog>
  );
}
