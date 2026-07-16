import { User } from 'lucide-react';

interface UserAvatarProps {
  user?: { email?: string } | null;
}

export default function UserAvatar({ user }: UserAvatarProps) {
  if (user?.email) {
    return (
      <div
        className="group relative flex h-8 w-8 shrink-0 cursor-default items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700 text-xs"
        title={user.email}
      >
        {user.email.charAt(0).toUpperCase()}
        <div className="pointer-events-none absolute top-full left-1/2 z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 font-medium text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
          {user.email}
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500">
      <User className="h-4 w-4" />
    </div>
  );
}