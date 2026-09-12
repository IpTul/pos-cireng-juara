import { usePage } from '@inertiajs/react';
import {
  LayoutGrid,
  Package,
  Tag,
  ShoppingCart,
  History,
  Store,
  Wallet,
  Users,
  Activity,
  PlusCircle,
  UserPlus,
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

  const posItems: NavItem[] = [
    {
      title: 'Jual',
      href: '/pos',
      icon: ShoppingCart,
    },
  ];

  const operationalItems: NavItem[] = [
    {
      title: 'Halaman Utama',
      href: '/dashboard',
      icon: LayoutGrid,
    },
  ];

  const catalogItems: NavItem[] = [
    {
      title: 'Produk',
      href: '/products',
      icon: Package,
    },
    {
      title: 'Riwayat Stok',
      href: '/stok',
      icon: Activity,
    },
    {
      title: 'Paket',
      href: '/pack',
      icon: Package,
    },
    {
      title: 'Addon',
      href: '/addons',
      icon: PlusCircle,
    },
    {
      title: 'Member',
      href: '/members',
      icon: UserPlus,
    },
  ];

  const managementItems: NavItem[] = [
    {
      title: 'Cabang',
      href: '/categories',
      icon: Tag,
    },
    {
      title: 'Riwayat Transaksi',
      href: '/history',
      icon: History,
    },
    { title: 'Keuangan', href: '/keuangan', icon: Wallet },
    { title: 'Manajemen Pengguna', href: '/users', icon: Users },
  ];

  // const financeItems: NavItem[] = [
  //   { title: 'Keuangan', href: '/keuangan', icon: Wallet },
  // ];

  // const settingsItems: NavItem[] = [
  //   { title: 'Manajemen Pengguna', href: '/users', icon: Users },
  // ];

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">Cireng Juara</span>
            {/* <span className="text-xs text-muted-foreground">Cashier App</span> */}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-2 py-2">
        <SidebarGroup>
          <NavMain items={posItems} />
        </SidebarGroup>

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
            <SidebarGroupLabel>Manajemen</SidebarGroupLabel>
            <NavMain items={managementItems} />
          </SidebarGroup>
        )}

        {/* {auth.user?.role === 'owner' && (
          <SidebarGroup>
            <SidebarGroupLabel>Manajemen</SidebarGroupLabel>
            <NavMain items={financeItems} />
          </SidebarGroup>
        )}

        {auth.user?.role === 'owner' && (
          <SidebarGroup>
            <SidebarGroupLabel>Pengaturan</SidebarGroupLabel>
            <NavMain items={settingsItems} />
          </SidebarGroup>
        )} */}
      </SidebarContent>

      <SidebarFooter className="border-t px-2 py-3">
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
