/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

interface Tab {
  id: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'pill';
  className?: string;
  children?: ReactNode;
}

const variantStyles = {
  underline: {
    container: 'flex gap-0 border-b border-neutral-200',
    tab: (isActive: boolean) =>
      `px-4 py-2.5 text-sm font-semibold transition-all duration-150 border-b-2 -mb-px ${
        isActive
          ? 'border-brand-600 text-brand-700'
          : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
      }`,
  },
  pill: {
    container: 'flex gap-1 rounded-xl bg-neutral-100 p-1',
    tab: (isActive: boolean) =>
      `px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
        isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
      }`,
  },
};

export default function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className = '',
}: TabsProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`${styles.container} ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className={`${styles.tab(activeTab === tab.id)} inline-flex items-center gap-2`}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-neutral-600">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
