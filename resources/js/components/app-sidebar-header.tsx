import { Link, usePage } from '@inertiajs/react';
import { ShoppingCart } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
  breadcrumbs = [],
}: {
  breadcrumbs?: BreadcrumbItemType[];
}) {
  const { url } = usePage();
  const path = url.split('?')[0];
  const onPos = path === '/pos' || path.startsWith('/pos/');

  return (
    <header className="no-print flex h-16 shrink-0 items-center gap-2 border-b border-sidebar-border/50 px-6 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Breadcrumbs breadcrumbs={breadcrumbs} />
      </div>

      {!onPos && (
        <Link
          href="/pos"
          aria-label="Buka Kasir"
          className="ml-auto inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 transition-colors hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30"
        >
          <ShoppingCart className="size-5" />
        </Link>
      )}
    </header>
  );
}
