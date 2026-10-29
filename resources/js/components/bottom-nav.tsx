import { Link, usePage } from '@inertiajs/react';
import {
  Activity,
  Package,
  LayoutGrid,
  Menu,
  ShoppingCart,
  History,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useSidebar } from '@/components/ui/sidebar';

type BottomNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

// Menu yang tampil di bottom bar. Sisanya lewat tombol "Lainnya".
const items: BottomNavItem[] = [
  { title: 'Utama', href: '/dashboard', icon: LayoutGrid },
  { title: 'Produk', href: '/products', icon: Package },
  { title: 'Jual', href: '/pos', icon: ShoppingCart },
  { title: 'Riwayat', href: '/history', icon: History },
];

const base =
  'flex h-11 items-center gap-2 rounded-full px-3 text-sm font-medium transition-all';
const activeCls =
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
const idleCls = 'text-muted-foreground hover:text-foreground';

/**
 * Bottom bar untuk HP dan tablet (portrait/landscape).
 * Dirender di dalam konten (lewat AppFooter), jadi otomatis mengikuti
 * lebar area konten dan tidak menutupi sidebar.
 */
export default function BottomNav() {
  const { url, props } = usePage();
  const { toggleSidebar } = useSidebar();
  const path = url.split('?')[0];

  const isActive = (href: string) =>
    path === href || path.startsWith(`${href}/`);

  const { auth } = props as unknown as {
    auth: { user: { role: string } };
  };

  const navItems =
    auth.user?.role === 'produksi'
      ? [{ title: 'Stok', href: '/stok', icon: Activity }]
      : items;

  // Kalau halaman aktif tidak ada di bar, tandai "Lainnya" sebagai aktif
  const moreActive = !navItems.some((item) => isActive(item.href));

  return (
    <nav
      aria-label="Navigasi utama"
      className="no-print sticky bottom-[var(--footer-total-h)] z-40 mt-auto box-border h-[var(--bottom-nav-h)] shrink-0 border-t border-border bg-background desk:hidden"
    >
      <ul className="mx-auto flex h-full max-w-xl items-center justify-around px-2">
        {navItems.map((item) => {
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
                  <span className="max-w-24 truncate">{item.title}</span>
                )}
              </Link>
            </li>
          );
        })}

        <li>
          <button
            type="button"
            onClick={toggleSidebar}
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
      </ul>
    </nav>
  );
}
