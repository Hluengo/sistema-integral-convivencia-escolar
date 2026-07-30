/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';
import { DialogContent } from './Dialog';

export interface DetailModalTab<T extends string> {
  id: T;
  label: string;
  icon: ReactNode;
  indicator?: ReactNode;
}

interface DetailModalContentProps {
  ariaLabel: string;
  children: ReactNode;
}

interface DetailModalHeaderProps {
  avatarInitial: string;
  title: string;
  metadata: ReactNode;
  actions: ReactNode;
}

interface DetailModalTabsProps<T extends string> {
  activeTab: T;
  ariaLabel: string;
  onChange: (tab: T) => void;
  tabs: DetailModalTab<T>[];
}

interface DetailModalBodyProps {
  children: ReactNode;
  className?: string;
}

/**
 * Marco visual común para fichas individuales que requieren navegación por pestañas.
 * Mantiene un alto responsive y un único scroll interno para evitar que el diálogo se desplace.
 */
export function DetailModalContent({ ariaLabel, children }: DetailModalContentProps) {
  return (
    <DialogContent
      hideClose
      className="flex h-[min(92vh,900px)] max-h-[calc(100vh-2rem)] w-[min(96vw,1280px)] max-w-none flex-col overflow-hidden p-0"
      aria-label={ariaLabel}
    >
      {children}
    </DialogContent>
  );
}

export function DetailModalHeader({
  avatarInitial,
  title,
  metadata,
  actions,
}: DetailModalHeaderProps) {
  return (
    <header className="border-neutral-100 border-b px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
            <span className="font-bold text-brand-600 text-sm">{avatarInitial}</span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-base text-neutral-900">{title}</h2>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-neutral-500 text-xs">
              {metadata}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">{actions}</div>
      </div>
    </header>
  );
}

export function DetailModalTabs<T extends string>({
  activeTab,
  ariaLabel,
  onChange,
  tabs,
}: DetailModalTabsProps<T>) {
  return (
    <div
      className="border-neutral-100 border-b bg-white px-4 pb-2 sm:px-6"
      role="tablist"
      aria-label={ariaLabel}
    >
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100/60 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`relative flex min-w-fit flex-1 flex-col items-stretch justify-center gap-1 overflow-hidden rounded-lg px-3 py-2 font-medium text-xs transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-neutral-500 hover:bg-white/50 hover:text-neutral-700'
            }`}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              {tab.icon}
              {tab.label}
            </span>
            {tab.indicator}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DetailModalBody({ children, className = '' }: DetailModalBodyProps) {
  return <div className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 ${className}`}>{children}</div>;
}
