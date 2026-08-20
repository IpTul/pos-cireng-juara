export type * from './auth';
export type * from './navigation';
export type * from './ui';

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: string;
  stock: number;
  image: string | null;
  is_active: boolean;
  category: Category;
}

export interface Addon {
  id: number;
  name: string;
  description: string | null;
  price: string; // or number if we want to treat as numeric
  is_active: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PackCartItem {
  pack: Pack;
  quantity: number;
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
  category_name?: string;
  addon_name?: string; // For display: name of the addon if this is an addon item
  addon_id?: number; // Reference to addons table
}

export interface Sale {
  id: number;
  total: number;
  cash_tendered: number;
  change_amount: number;
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
  description: string | null;
  price: string;
  image: string | null;
  is_active: boolean;
  pack_items: PackItem[];
}
