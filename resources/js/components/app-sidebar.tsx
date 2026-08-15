import { Link, usePage } from '@inertiajs/react';
import {
  LayoutGrid,
  Package,
  Tag,
  ShoppingCart,
  History,
  Store,
  Wallet,
  Users,
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
  ];

  const catalogItems: NavItem[] = [
    {
      title: 'Produk',
      href: '/products',
      icon: Package,
    },
    {
      title: 'Paket',
      href: '/pack',
      icon: Package,
    },
  ];

  const cabangItems: NavItem[] = [
    {
      title: 'Cabang',
      href: '/categories',
      icon: Tag,
    },
  ];

  const financeItems: NavItem[] = [
    { title: 'Keuangan', href: '/keuangan', icon: Wallet },
  ];

  const settingsItems: NavItem[] = [
    { title: 'Manajemen User', href: '/users', icon: Users },
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

        <SidebarGroup>
          <SidebarGroupLabel>Produk</SidebarGroupLabel>
          <NavMain items={catalogItems} />
        </SidebarGroup>

        {auth.user?.role === 'owner' && (
          <SidebarGroup>
            <SidebarGroupLabel>Cabang</SidebarGroupLabel>
            <NavMain items={cabangItems} />
          </SidebarGroup>
        )}

        {auth.user?.role === 'owner' && (
          <SidebarGroup>
            <SidebarGroupLabel>Laporan</SidebarGroupLabel>
            <NavMain items={financeItems} />
          </SidebarGroup>
        )}

        {auth.user?.role === 'owner' && (
          <SidebarGroup>
            <SidebarGroupLabel>Pengaturan</SidebarGroupLabel>
            <NavMain items={settingsItems} />
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t px-2 py-3">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
