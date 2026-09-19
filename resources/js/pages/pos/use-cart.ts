import { useReducer, useMemo, useEffect } from 'react';
import {
  CartItem,
  PackCartItem,
  Product,
  Pack,
  Addon,
  AddonSelection,
  PackVariant,
} from '@/types';
import { toast } from 'sonner';

// Cart localStorage key
const CART_STORAGE_KEY = 'cireng-juara-cart';

function loadCartFromStorage(): CartState {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load cart from localStorage', e);
  }
  return { items: [], addons: [] };
}

function saveCartToStorage(state: CartState) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save cart to localStorage', e);
  }
}

type CartItemUnion = CartItem | PackCartItem;

export type FreeItemSelection = { product_id: number; quantity: number };

interface CartItemWithFree extends CartItem {
  freeQuantity: number;
  totalQuantity: number;
  freeItems: FreeItemSelection[];
}

interface PackCartItemWithFree extends PackCartItem {
  variants: PackVariant[];
  freeQuantity: number;
  totalQuantity: number;
  freeItems: FreeItemSelection[];
}

interface CartState {
  items: (CartItemWithFree | PackCartItemWithFree)[];
  addons: AddonSelection[]; // addon level-cart, sekali untuk seluruh transaksi
}

type CartAction =
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'ADD_PACK'; pack: Pack; variants: PackVariant[] }
  | { type: 'REMOVE_PRODUCT'; productId: number }
  | { type: 'REMOVE_PACK'; packId: number }
  | { type: 'SET_QTY_PRODUCT'; productId: number; quantity: number }
  | { type: 'SET_QTY_PACK'; packId: number; quantity: number }
  | { type: 'SET_PACK_VARIANTS'; packId: number; variants: PackVariant[] }
  | { type: 'SET_FREE_ITEMS'; freeItems: FreeItemSelection[] }
  | { type: 'ADD_ADDON'; addon: Addon }
  | { type: 'REMOVE_ADDON'; addonId: number }
  | { type: 'SET_ADDON_QUANTITY'; addon: Addon; quantity: number }
  | { type: 'CLEAR' };

function isCartItem(item: CartItemUnion): item is CartItem {
  return 'product' in item;
}

function isPackCartItem(
  item: CartItemUnion,
): item is PackCartItem & { variants: PackVariant[] } {
  return 'pack' in item && 'variants' in item;
}

// Calculate free quantity (1 free per 10 purchased) - GLOBAL across all items
function getGlobalFreeQuantity(
  items: (CartItemWithFree | PackCartItemWithFree)[],
): number {
  const totalPaidQty = items.reduce((sum, i) => sum + i.quantity, 0);
  return Math.floor(totalPaidQty / 10);
}

// Distribute global free quantity across items (all free items shown on first item)
function distributeFreeQuantity(
  items: (CartItemWithFree | PackCartItemWithFree)[],
  globalFreeQty: number,
): (CartItemWithFree | PackCartItemWithFree)[] {
  return items.map((i, index) => {
    if (index === 0) {
      return {
        ...i,
        freeQuantity: globalFreeQty,
        totalQuantity: i.quantity + globalFreeQty,
      };
    }
    return { ...i, freeQuantity: 0, totalQuantity: i.quantity };
  });
}

function cartReducer(state: CartState, action: CartAction): CartState {
  let newItems: (CartItemWithFree | PackCartItemWithFree)[];

  switch (action.type) {
    case 'ADD_PRODUCT': {
      const existing = state.items.find(
        (i) => isCartItem(i) && i.product.id === action.product.id,
      );
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > action.product.stock) {
          toast.error(
            `Stok "${action.product.name}" hanya tersisa ${action.product.stock}`,
          );
          return state;
        }
        newItems = state.items.map((i) =>
          isCartItem(i) && i.product.id === action.product.id
            ? { ...i, quantity: newQty }
            : i,
        );
      } else {
        // When stock <= 0, still add the product to the cart list but it cannot be selected/increased
        // The existing SET_QTY_PRODUCT logic will restrict quantity when product.stock <= 0
        const initialQty = action.product.stock <= 0 ? 0 : 1;
        newItems = [
          ...state.items,
          {
            product: action.product,
            quantity: initialQty,
            freeQuantity: 0,
            totalQuantity: initialQty,
            freeItems: [],
          },
        ];
      }
      const globalFreeQty = getGlobalFreeQuantity(newItems);
      return {
        ...state,
        items: distributeFreeQuantity(newItems, globalFreeQty),
      };
    }

    case 'ADD_PACK': {
      const existing = state.items.find(
        (i): i is PackCartItemWithFree =>
          isPackCartItem(i) && i.pack.id === action.pack.id,
      );
      if (existing) {
        const newQty = existing.quantity + 1;
        // Check stock for all selected variants
        const requiredStock: Record<number, number> = {};
        for (const variant of existing.variants) {
          requiredStock[variant.product_id] =
            (requiredStock[variant.product_id] || 0) +
            variant.quantity * newQty;
        }
        for (const [productId, required] of Object.entries(requiredStock)) {
          const product = action.pack.pack_items?.find(
            (pi) => pi.product_id === Number(productId),
          )?.product;
          if (product && product.stock < required) {
            toast.error(
              `Stok "${product.name}" tidak mencukupi untuk paket "${action.pack.name}"`,
            );
            return state;
          }
        }
        newItems = state.items.map((i) =>
          isPackCartItem(i) && i.pack.id === action.pack.id
            ? { ...i, quantity: newQty }
            : i,
        );
      } else {
        // Check stock for all selected variants
        const variants = action.variants || [];
        if (variants.length === 0) {
          toast.error('Silakan pilih varian produk untuk paket ini');
          return state;
        }
        if (variants.length > action.pack.max_items) {
          toast.error(`Maksimal ${action.pack.max_items} item untuk paket ini`);
          return state;
        }
        const requiredStock: Record<number, number> = {};
        for (const variant of variants) {
          requiredStock[variant.product_id] =
            (requiredStock[variant.product_id] || 0) + variant.quantity;
        }
        for (const [productId, required] of Object.entries(requiredStock)) {
          const product = action.pack.pack_items?.find(
            (pi) => pi.product_id === Number(productId),
          )?.product;
          if (!product || product.stock < required) {
            toast.error(`Stok "${product?.name || 'produk'}" tidak mencukupi`);
            return state;
          }
        }
        newItems = [
          ...state.items,
          {
            pack: action.pack,
            quantity: 1,
            variants: variants,
            freeQuantity: 0,
            totalQuantity: 1,
            freeItems: [],
          },
        ];
      }
      const globalFreeQty = getGlobalFreeQuantity(newItems);
      return {
        ...state,
        items: distributeFreeQuantity(newItems, globalFreeQty),
      };
    }

    case 'REMOVE_PRODUCT': {
      newItems = state.items.filter(
        (i) => !(isCartItem(i) && i.product.id === action.productId),
      );
      const globalFreeQty = getGlobalFreeQuantity(newItems);
      return {
        ...state,
        items: distributeFreeQuantity(newItems, globalFreeQty),
      };
    }

    case 'REMOVE_PACK': {
      newItems = state.items.filter(
        (i) => !(isPackCartItem(i) && i.pack.id === action.packId),
      );
      const globalFreeQty = getGlobalFreeQuantity(newItems);
      return {
        ...state,
        items: distributeFreeQuantity(newItems, globalFreeQty),
      };
    }

    case 'SET_QTY_PRODUCT': {
      if (action.quantity <= 0) {
        newItems = state.items.filter(
          (i) => !(isCartItem(i) && i.product.id === action.productId),
        );
      } else {
        newItems = state.items.map((i) => {
          if (!isCartItem(i) || i.product.id !== action.productId) return i;
          return { ...i, quantity: Math.min(action.quantity, i.product.stock) };
        });
      }
      const globalFreeQty = getGlobalFreeQuantity(newItems);
      return {
        ...state,
        items: distributeFreeQuantity(newItems, globalFreeQty),
      };
    }

    case 'SET_QTY_PACK': {
      if (action.quantity <= 0) {
        newItems = state.items.filter(
          (i) => !(isPackCartItem(i) && i.pack.id === action.packId),
        );
      } else {
        newItems = state.items.map((i) => {
          if (!isPackCartItem(i) || i.pack.id !== action.packId) return i;
          for (const packItem of i.pack.pack_items || []) {
            const required = packItem.quantity * action.quantity;
            if (packItem.product.stock < required) {
              toast.error(
                `Stok "${packItem.product.name}" hanya tersisa ${packItem.product.stock}`,
              );
              return i;
            }
          }
          return { ...i, quantity: action.quantity };
        });
      }
      const globalFreeQty = getGlobalFreeQuantity(newItems);
      return {
        ...state,
        items: distributeFreeQuantity(newItems, globalFreeQty),
      };
    }

    case 'SET_PACK_VARIANTS': {
      newItems = state.items.map((i) => {
        if (!isPackCartItem(i) || i.pack.id !== action.packId) return i;
        // Check stock for new variants
        const requiredStock: Record<number, number> = {};
        for (const variant of action.variants) {
          requiredStock[variant.product_id] =
            (requiredStock[variant.product_id] || 0) +
            variant.quantity * i.quantity;
        }
        for (const [productId, required] of Object.entries(requiredStock)) {
          const product = i.pack.pack_items?.find(
            (pi) => pi.product_id === Number(productId),
          )?.product;
          if (product && product.stock < required) {
            toast.error(`Stok "${product.name}" tidak mencukupi`);
            return i;
          }
        }
        if (action.variants.length > i.pack.max_items) {
          toast.error(`Maksimal ${i.pack.max_items} item untuk paket ini`);
          return i;
        }
        return { ...i, variants: action.variants };
      });
      return { ...state, items: newItems };
    }

    case 'SET_FREE_ITEMS': {
      return {
        ...state,
        items: state.items.map((i, index) =>
          index === 0 ? { ...i, freeItems: action.freeItems } : i,
        ),
      };
    }

    case 'ADD_ADDON': {
      const existingIndex = state.addons.findIndex(
        (a) => a.addon.id === action.addon.id,
      );
      if (existingIndex >= 0) {
        if (state.addons[existingIndex].quantity >= 1) {
          toast.error(`Addon "${action.addon.name}" sudah ditambahkan`);
          return state;
        }
        const updated = [...state.addons];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return { ...state, addons: updated };
      }
      return {
        ...state,
        addons: [...state.addons, { addon: action.addon, quantity: 1 }],
      };
    }

    case 'REMOVE_ADDON': {
      const index = state.addons.findIndex(
        (a) => a.addon.id === action.addonId,
      );
      if (index < 0) return state;

      if (state.addons[index].quantity > 1) {
        const updated = [...state.addons];
        updated[index] = {
          ...updated[index],
          quantity: updated[index].quantity - 1,
        };
        return { ...state, addons: updated };
      }
      return { ...state, addons: state.addons.filter((_, i) => i !== index) };
    }

    case 'SET_ADDON_QUANTITY': {
      if (action.quantity < 0) return state;
      const index = state.addons.findIndex(
        (a) => a.addon.id === action.addon.id,
      );

      if (action.quantity === 0) {
        if (index < 0) return state;
        return { ...state, addons: state.addons.filter((_, i) => i !== index) };
      }

      if (index < 0) {
        return {
          ...state,
          addons: [
            ...state.addons,
            { addon: action.addon, quantity: action.quantity },
          ],
        };
      }
      const updated = [...state.addons];
      updated[index] = { ...updated[index], quantity: action.quantity };
      return { ...state, addons: updated };
    }

    case 'CLEAR':
      return { items: [], addons: [] };

    default:
      return state;
  }
}

export function useCart() {
  const [state, dispatch] = useReducer(cartReducer, { items: [], addons: [] });
  const { items, addons } = state;

  // Load from localStorage on initialization, then sync to storage on every change
  useEffect(() => {
    saveCartToStorage(state);
  }, [state]);

  const subtotal = useMemo(() => {
    let sum = 0;
    for (const item of items) {
      if (isCartItem(item)) {
        sum += parseFloat(item.product.price) * item.quantity;
      } else {
        sum += parseFloat(item.pack.price) * item.quantity;
      }
    }
    // Addon dihitung sekali untuk seluruh transaksi
    for (const addonSel of addons) {
      sum += parseFloat(addonSel.addon.price) * addonSel.quantity;
    }
    return sum;
  }, [items, addons]);

  const totalItems = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity + i.freeQuantity, 0),
    [items],
  );

  const totalFreeItems = useMemo(
    () => items.reduce((sum, i) => sum + i.freeQuantity, 0),
    [items],
  );

  function addProduct(product: Product) {
    dispatch({ type: 'ADD_PRODUCT', product });
  }

  function addPack(pack: Pack, variants: PackVariant[] = []) {
    dispatch({ type: 'ADD_PACK', pack, variants });
  }

  function setPackVariants(packId: number, variants: PackVariant[]) {
    dispatch({ type: 'SET_PACK_VARIANTS', packId, variants });
  }

  function setProductQuantity(productId: number, quantity: number) {
    dispatch({ type: 'SET_QTY_PRODUCT', productId, quantity });
  }

  function setPackQuantity(packId: number, quantity: number) {
    dispatch({ type: 'SET_QTY_PACK', packId, quantity });
  }

  function setFreeItems(freeItems: FreeItemSelection[]) {
    dispatch({ type: 'SET_FREE_ITEMS', freeItems });
  }

  // Addon level-cart (bukan per item lagi)
  function addAddon(addon: Addon) {
    dispatch({ type: 'ADD_ADDON', addon });
  }

  function removeAddon(addonId: number) {
    dispatch({ type: 'REMOVE_ADDON', addonId });
  }

  function setAddonQuantity(addon: Addon, quantity: number) {
    dispatch({ type: 'SET_ADDON_QUANTITY', addon, quantity });
  }

  return {
    items,
    addons, // AddonSelection[] terpilih untuk transaksi ini
    subtotal,
    totalItems,
    totalFreeItems,
    addProduct,
    addPack,
    removeProduct: (productId: number) =>
      dispatch({ type: 'REMOVE_PRODUCT', productId }),
    removePack: (packId: number) => dispatch({ type: 'REMOVE_PACK', packId }),
    setProductQuantity,
    setPackQuantity,
    setPackVariants,
    setFreeItems,
    addAddon,
    removeAddon,
    setAddonQuantity,
    clear: () => dispatch({ type: 'CLEAR' }),
  };
}
