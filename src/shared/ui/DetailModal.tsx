/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef } from "react";
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
}: DetailModalContentProps) {
  return (
    <DialogContent
      hideClose
      className="flex h-[min(94vh,980px)] max-h-[calc(100vh-1rem)] w-[min(96vw,112rem)] max-w-none flex-col overflow-hidden border-neutral-150 bg-neutral-50 p-0 shadow-2xl reduce-motion:[animation-duration:0ms,transition-duration:0ms]"
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
    <header className="relative z-20 border-neutral-200 border-b bg-white px-4 py-3.5 sm:px-6">
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-700 shadow-sm ring-2 ${avatarClassName ?? "ring-brand-200"}`}
          >
            <span className="font-bold text-sm text-white">
              {avatarInitial}
            </span>
          </div>
          <div className="min-w-0">
            <h2
              title={titleTooltip ?? title}
              className="truncate font-bold text-[1.05rem] tracking-tight text-neutral-900"
            >
              {title}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-neutral-600 text-xs">
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
      className="sticky top-0 z-10 border-neutral-150 border-b bg-white/95 px-4 py-2 backdrop-blur sm:px-6"
      role="tablist"
      aria-label={ariaLabel}
    >
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100/90 p-1">
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
            aria-label={tab.ariaLabel}
            aria-selected={activeTab === tab.id}
            aria-controls={`detail-tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`relative flex min-h-11 min-w-[9.5rem] flex-1 flex-col items-stretch justify-center gap-1 overflow-hidden rounded-md px-3 py-2 font-semibold text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-100 sm:min-w-0 ${
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
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-brand-600 transition-transform duration-150 motion-reduce:transition-none ${
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
  return (
    <div
      id={activeTabId ? `detail-tabpanel-${activeTabId}` : undefined}
      role={activeTabId ? "tabpanel" : undefined}
      aria-labelledby={activeTabId ? `detail-tab-${activeTabId}` : undefined}
      tabIndex={0}
      className={`min-h-0 flex-1 overflow-y-auto p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 sm:p-5 ${className}`}
    >
      {children}
    </div>
  );
}
