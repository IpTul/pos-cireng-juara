// resources/js/components/bottom-nav.tsx

import { Link, usePage } from '@inertiajs/react';
import { Menu } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type BottomNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

interface Props {
  items: BottomNavItem[];
  /** Dipanggil saat tombol "Lainnya" ditekan (buka sidebar) */
  onMore?: () => void;
}

const base =
  'flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-all';
const activeCls =
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
const idleCls = 'text-muted-foreground hover:text-foreground';

export default function BottomNav({ items, onMore }: Props) {
  const { url } = usePage();
  const path = url.split('?')[0];

  const isActive = (href: string) =>
    path === href || path.startsWith(`${href}/`);

  // Kalau halaman aktif tidak ada di bar, tandai "Lainnya" sebagai aktif
  const moreActive = !items.some((item) => isActive(item.href));

  return (
    <nav
      aria-label="Navigasi utama"
      className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                aria-current={active ? 'page' : undefined}
                aria-label={item.title}
                className={`${base} ${active ? activeCls : idleCls}`}
              >
                <Icon
                  className="size-5 shrink-0"
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {active && (
                  <span className="max-w-20 truncate">{item.title}</span>
                )}
              </Link>
            </li>
          );
        })}

        {onMore && (
          <li>
            <button
              type="button"
              onClick={onMore}
              aria-label="Menu lainnya"
              className={`${base} ${moreActive ? activeCls : idleCls}`}
            >
              <Menu
                className="size-5 shrink-0"
                strokeWidth={moreActive ? 2.4 : 1.8}
              />
              {moreActive && <span>Lainnya</span>}
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
