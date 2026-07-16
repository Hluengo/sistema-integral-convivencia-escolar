import { VIEW_TITLES } from './constants';

interface PageTitleProps {
  currentView: string;
}

export default function PageTitle({ currentView }: PageTitleProps) {
  const viewMeta = VIEW_TITLES[currentView as keyof typeof VIEW_TITLES] || VIEW_TITLES.dashboard;

  return (
    <div className="hidden min-w-0 shrink-0 sm:block">
      <h1 className="truncate font-bold text-neutral-900 text-sm leading-tight">{viewMeta.title}</h1>
      <p className="truncate font-medium text-neutral-400 text-xs">{viewMeta.subtitle}</p>
    </div>
  );
}