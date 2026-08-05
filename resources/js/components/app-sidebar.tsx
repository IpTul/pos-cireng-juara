import { Link, usePage } from '@inertiajs/react';
import {
  LayoutGrid,
  Package,
  Tag,
  ShoppingCart,
  History,
  Store,
} from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

export function AppSidebar() {
  const { auth } = usePage().props;
  const isKasir = auth.user?.role === 'kasir';

  const operationalItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/dashboard',
      icon: LayoutGrid,
    },
    {
      title: 'Point of Sale',
      href: '/pos',
      icon: ShoppingCart,
    },
    {
      title: 'History',
      href: '/history',
      icon: History,
    },
  ].filter((item) => !(item.title === 'History' && isKasir));

  const catalogItems: NavItem[] = [
    {
      title: 'Products',
      href: '/products',
      icon: Package,
    },
    {
      title: 'Categories',
      href: '/categories',
      icon: Tag,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Cireng Juara</span>
            <span className="text-xs text-muted-foreground">Cashier App</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-4 py-2">
        <SidebarGroup>
          <SidebarGroupLabel>Operasional</SidebarGroupLabel>
          <NavMain items={operationalItems} />
        </SidebarGroup>

        {!isKasir && (
          <SidebarGroup>
            <SidebarGroupLabel>Katalog</SidebarGroupLabel>
            <NavMain items={catalogItems} />
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t px-2 py-3">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
