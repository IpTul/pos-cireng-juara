export type * from './auth';
export type * from './navigation';
export type * from './ui';

export interface Cabang {
  id: number;
  name: string;
  description: string | null;
}

export interface Product {
  id: number;
  cabang_id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image: string | null;
  is_active: boolean;
  cabang: Cabang;
}

export interface Addon {
  id: number;
  name: string;
  cabang_id: number;
  cabang?: Cabang;
  description: string | null;
  price: string;
  is_active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PackVariant {
  product_id: number;
  product: Product;
  quantity: number;
}

export interface PackCartItem {
  pack: Pack;
  quantity: number;
  variants: PackVariant[];
}

export interface AddonSelection {
  addon: Addon;
  quantity: number;
}

export interface SaleItem {
  id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  is_free?: boolean;
  cabang_name?: string;
  addon_name?: string;
  addon_id?: number;
}

export interface Sale {
  id: number;
  customer_name?: string | null;
  member_id?: number | null;
  member?: Member | null;
  total: number;
  cash_tendered: number;
  change_amount: number;
  payment_method: 'cash' | 'qris' | 'grab';
  status: string;
  created_at: string;
  items: SaleItem[];
}

export interface PackItem {
  id: number;
  pack_id: number;
  product_id: number;
  quantity: number;
  product: Product;
}

export interface Pack {
  id: number;
  name: string;
  cabang_id: number;
  cabang?: Cabang;
  description: string | null;
  price: string;
  image: string | null;
  is_active: boolean;
  max_items: number;
  pack_items: PackItem[];
  is_available?: boolean;
}

export interface Member {
  id: number;
  name: string;
  cabang_id: number | null;
  phone: string;
  points: number;
  last_purchase_at: string | null;
  is_deleted: boolean;
  created_at: string;
}

export interface PaginatedData<T> {
  data: T[];
  links: { url: string | null; label: string; active: boolean }[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}
