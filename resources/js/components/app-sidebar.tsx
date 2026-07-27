import { Link } from '@inertiajs/react';
import { LayoutGrid, Package, Tag, ShoppingCart, History } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { usePage } from '@inertiajs/react';
import type { NavItem } from '@/types';

export function AppSidebar() {
  const { auth } = usePage().props;
  const isKasir = auth.user?.role === 'kasir';

  const mainNavItems: NavItem[] = [
    {
      title: 'Dashboard',
      href: '/',
      icon: LayoutGrid,
    },
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

  const filteredItems = mainNavItems.filter(
    item => !(item.title === 'History' && isKasir)
  );

  return (
    <Sidebar>
      <SidebarHeader className="space-y-2">
        <AppLogo />
        <p className="text-xs text-muted-foreground">Cashier App</p>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}