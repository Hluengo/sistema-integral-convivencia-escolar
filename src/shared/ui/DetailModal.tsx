/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from "react";
import { DialogContent } from "./Dialog";

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
export function DetailModalContent({
  ariaLabel,
  children,
}: DetailModalContentProps) {
  return (
    <DialogContent
      hideClose
      className="flex h-[min(94vh,940px)] max-h-[calc(100vh-1rem)] w-[min(98vw,120rem)] max-w-none flex-col overflow-hidden border-neutral-150 bg-neutral-50 p-0 shadow-2xl reduce-motion:[animation-duration:0ms,transition-duration:0ms]"
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
    <header className="relative z-20 overflow-hidden border-neutral-800 border-b bg-brand-950 px-4 py-4 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(135deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]"
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <span className="font-bold text-neutral-100 text-sm">
              {avatarInitial}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-bold text-lg text-white">{title}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-neutral-150 text-xs">
              {metadata}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
          {actions}
        </div>
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
      className="z-10 border-neutral-150 border-b bg-white/95 px-4 py-2 backdrop-blur sm:px-6"
      role="tablist"
      aria-label={ariaLabel}
    >
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-neutral-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`relative flex min-w-[9.5rem] flex-1 flex-col items-stretch justify-center gap-1 overflow-hidden rounded-md px-3 py-2 font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-100 sm:min-w-0 ${
              activeTab === tab.id
                ? "bg-white text-brand-950 shadow-sm ring-1 ring-neutral-150"
                : "text-neutral-600 hover:bg-white/70 hover:text-neutral-900"
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

export function DetailModalBody({
  children,
  className = "",
}: DetailModalBodyProps) {
  return (
    <div
      tabIndex={0}
      className={`min-h-0 flex-1 overflow-y-auto p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}
