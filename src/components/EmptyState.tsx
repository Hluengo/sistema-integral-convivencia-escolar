
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100">
        <Icon className="h-8 w-8 text-neutral-400" />
      </div>
      <h3 className="mb-1.5 font-semibold text-base text-neutral-700">{title}</h3>
      <p className="mb-6 max-w-sm text-neutral-500 text-sm">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-sm text-white transition-all duration-200 hover:bg-brand-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
