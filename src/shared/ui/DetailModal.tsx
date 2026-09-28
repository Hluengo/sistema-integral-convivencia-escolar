/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { DialogContent } from "./Dialog";

export interface DetailModalTab<T extends string> {
  id: T;
  label: string;
  ariaLabel?: string;
  icon: ReactNode;
  indicator?: ReactNode;
}

interface DetailModalContentProps {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
}

interface DetailModalHeaderProps {
  avatarInitial: string;
  avatarClassName?: string;
  title: string;
  titleTooltip?: string;
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
  activeTabId?: string;
}

/**
 * Marco visual común para fichas individuales que requieren navegación por pestañas.
 * Mantiene un alto responsive y un único scroll interno para evitar que el diálogo se desplace.
 */
export function DetailModalContent({
  ariaLabel,
  children,
  className = "",
}: DetailModalContentProps) {
  return (
    <DialogContent
      hideClose
      className={`flex h-[min(94vh,980px)] max-h-[calc(100vh-1rem)] w-[min(94vw,64rem)] max-w-none flex-col overflow-hidden border-slate-200 bg-[#F8FAFC] p-0 shadow-2xl reduce-motion:[animation-duration:0ms,transition-duration:0ms] ${className}`}
      aria-label={ariaLabel}
    >
      {children}
    </DialogContent>
  );
}

export function DetailModalHeader({
  avatarInitial,
  avatarClassName,
  title,
  titleTooltip,
  metadata,
  actions,
}: DetailModalHeaderProps) {
  return (
    <header className="relative z-20 border-neutral-200 border-b bg-white px-3 py-3 sm:px-4">
      <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            aria-hidden="true"
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-950 shadow-inner ring-2 ${avatarClassName ?? "ring-brand-200"}`}
          >
            <span className="font-bold text-sm text-white">
              {avatarInitial}
            </span>
          </div>
          <div className="min-w-0">
            <h2
              title={titleTooltip ?? title}
              className="truncate text-lg font-bold tracking-tight text-neutral-900"
            >
              {title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-neutral-600 text-[11px]">
              {metadata}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
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
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const focusTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    onChange(tab.id);
    tabRefs.current[tab.id]?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    focusTab(nextIndex);
  };

  return (
    <div
      className="sticky top-0 z-10 border-slate-200 border-b bg-white px-6 py-0 sm:px-8"
      role="tablist"
      aria-label={ariaLabel}
    >
      <div className="flex gap-8 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            ref={(element) => {
              tabRefs.current[tab.id] = element;
            }}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, tabs.indexOf(tab))}
            id={`detail-tab-${tab.id}`}
            role="tab"
            aria-label={tab.ariaLabel ?? tab.label}
            aria-selected={activeTab === tab.id}
            aria-controls={`detail-tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`relative flex min-h-11 min-w-[7.25rem] flex-1 flex-col items-center justify-center gap-1 overflow-hidden rounded-none border-b-2 border-transparent px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white sm:min-w-0 sm:flex-row sm:gap-2 ${
              activeTab === tab.id
                ? "border-brand-600 text-brand-600 font-semibold"
                : "text-neutral-500 hover:border-neutral-300 hover:text-neutral-800"
            }`}
          >
            <span className="flex items-center justify-center gap-1.5 whitespace-nowrap">
              {tab.icon}
              {tab.label}
            </span>
            {tab.indicator}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-brand-600 transition-transform duration-150 motion-reduce:transition-none ${
                activeTab === tab.id ? "scale-x-100" : "scale-x-0"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export function DetailModalBody({
  children,
  className = "",
  activeTabId,
}: DetailModalBodyProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prevTabId = useRef(activeTabId);
  useEffect(() => {
    if (prevTabId.current !== activeTabId) {
      prevTabId.current = activeTabId;
      // Solo mueve el foco cuando la navegación viene desde dentro del panel
      // (ej. botones "Ir a Carta"), no al tabular entre tabs.
      const active = document.activeElement;
      if (active && panelRef.current?.contains(active)) {
        panelRef.current?.focus();
      }
    }
  }, [activeTabId]);
  return (
    <div
      ref={panelRef}
      id={activeTabId ? `detail-tabpanel-${activeTabId}` : undefined}
      role={activeTabId ? "tabpanel" : undefined}
      aria-labelledby={activeTabId ? `detail-tab-${activeTabId}` : undefined}
      tabIndex={0}
      className={`min-h-0 flex-1 overflow-y-auto p-3 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:p-4 ${className}`}
    >
      {children}
    </div>
  );
}
