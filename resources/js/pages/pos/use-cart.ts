import { useReducer, useMemo } from 'react';
import { CartItem, PackCartItem, Product, Pack } from '@/types';
import { toast } from 'sonner';

type CartItemUnion = CartItem | PackCartItem;

export type FreeItemSelection = { product_id: number; quantity: number };

interface CartItemWithFree extends CartItem {
  freeQuantity: number;
  totalQuantity: number;
  freeItems: FreeItemSelection[];
}

interface PackCartItemWithFree extends PackCartItem {
  freeQuantity: number;
  totalQuantity: number;
  freeItems: FreeItemSelection[];
}

type CartAction =
  | { type: 'ADD_PRODUCT'; product: Product }
  | { type: 'ADD_PACK'; pack: Pack }
  | { type: 'REMOVE_PRODUCT'; productId: number }
  | { type: 'REMOVE_PACK'; packId: number }
  | { type: 'SET_QTY_PRODUCT'; productId: number; quantity: number }
  | { type: 'SET_QTY_PACK'; packId: number; quantity: number }
  | { type: 'SET_FREE_ITEMS'; freeItems: FreeItemSelection[] }
  | { type: 'CLEAR' };

function isCartItem(item: CartItemUnion): item is CartItem {
  return 'product' in item;
}

function isPackCartItem(item: CartItemUnion): item is PackCartItem {
  return 'pack' in item;
}

// Calculate free quantity (1 free per 10 purchased) - GLOBAL across all items
function getGlobalFreeQuantity(items: (CartItemWithFree | PackCartItemWithFree)[]): number {
  const totalPaidQty = items.reduce((sum, i) => sum + i.quantity, 0);
  return Math.floor(totalPaidQty / 10);
}

function cartReducer(state: (CartItemWithFree | PackCartItemWithFree)[], action: CartAction): (CartItemWithFree | PackCartItemWithFree)[] {
  let newState: (CartItemWithFree | PackCartItemWithFree)[];

  switch (action.type) {
    case 'ADD_PRODUCT': {
      const existing = state.find(
        (i) => isCartItem(i) && i.product.id === action.product.id
      );
      if (existing) {
        const newQty = existing.quantity + 1;
        if (newQty > action.product.stock) {
          toast.error(`Stok "${action.product.name}" hanya tersisa ${action.product.stock}`);
          return state;
        }
        newState = state.map((i) =>
          isCartItem(i) && i.product.id === action.product.id
            ? { ...i, quantity: newQty }
            : i,
        );
      } else {
        if (action.product.stock <= 0) {
          return state;
        }
        newState = [...state, { product: action.product, quantity: 1, freeQuantity: 0, totalQuantity: 1, freeItems: [] }];
      }
      // Recalculate global free quantity for all items
      const globalFreeQty = getGlobalFreeQuantity(newState);
      return distributeFreeQuantity(newState, globalFreeQty);
    }

    case 'ADD_PACK': {
      const existing = state.find(
        (i) => isPackCartItem(i) && i.pack.id === action.pack.id
      );
      if (existing) {
        const newQty = existing.quantity + 1;
        // Check stock for paid items only
        for (const packItem of action.pack.pack_items || []) {
          const required = packItem.quantity * newQty;
          if (packItem.product.stock < required) {
            toast.error(
              `Stok "${packItem.product.name}" tidak mencukupi untuk paket "${action.pack.name}"`
            );
            return state;
          }
        }
        newState = state.map((i) =>
          isPackCartItem(i) && i.pack.id === action.pack.id
            ? { ...i, quantity: newQty }
            : i,
        );
      } else {
        // Check initial stock
        for (const packItem of action.pack.pack_items || []) {
          if (packItem.product.stock < packItem.quantity) {
            toast.error(`Stok "${packItem.product.name}" tidak mencukupi`);
            return state;
          }
        }
        newState = [...state, { pack: action.pack, quantity: 1, freeQuantity: 0, totalQuantity: 1, freeItems: [] }];
      }
      // Recalculate global free quantity for all items
      const globalFreeQty = getGlobalFreeQuantity(newState);
      return distributeFreeQuantity(newState, globalFreeQty);
    }

    case 'REMOVE_PRODUCT': {
      newState = state.filter((i) => !(isCartItem(i) && i.product.id === action.productId));
      const globalFreeQtyAfterRemove = getGlobalFreeQuantity(newState);
      return distributeFreeQuantity(newState, globalFreeQtyAfterRemove);
    }

    case 'REMOVE_PACK': {
      newState = state.filter((i) => !(isPackCartItem(i) && i.pack.id === action.packId));
      const globalFreeQtyAfterRemove = getGlobalFreeQuantity(newState);
      return distributeFreeQuantity(newState, globalFreeQtyAfterRemove);
    }

    case 'SET_QTY_PRODUCT': {
      if (action.quantity <= 0) {
        newState = state.filter((i) => !(isCartItem(i) && i.product.id === action.productId));
      } else {
        newState = state.map((i) => {
          if (!isCartItem(i) || i.product.id !== action.productId) return i;
          return { ...i, quantity: Math.min(action.quantity, i.product.stock) };
        });
      }
      const globalFreeQtySet = getGlobalFreeQuantity(newState);
      return distributeFreeQuantity(newState, globalFreeQtySet);
    }

    case 'SET_QTY_PACK': {
      if (action.quantity <= 0) {
        newState = state.filter((i) => !(isPackCartItem(i) && i.pack.id === action.packId));
      } else {
        newState = state.map((i) => {
          if (!isPackCartItem(i) || i.pack.id !== action.packId) return i;
          // Check stock for paid items only
          for (const packItem of i.pack.pack_items || []) {
            const required = packItem.quantity * action.quantity;
            if (packItem.product.stock < required) {
              toast.error(
                `Stok "${packItem.product.name}" hanya tersisa ${packItem.product.stock}`
              );
              return i;
            }
          }
          return { ...i, quantity: action.quantity };
        });
      }
      const globalFreeQtySet = getGlobalFreeQuantity(newState);
      return distributeFreeQuantity(newState, globalFreeQtySet);
    }

    case 'SET_FREE_ITEMS': {
      // Global free items selection - attach to first item for display
      return state.map((i, index) => {
        if (index === 0) {
          return { ...i, freeItems: action.freeItems };
        }
        return i;
      });
    }

    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

// Distribute global free quantity across items (all free items shown on first item)
function distributeFreeQuantity(
  items: (CartItemWithFree | PackCartItemWithFree)[],
  globalFreeQty: number
): (CartItemWithFree | PackCartItemWithFree)[] {
  return items.map((i, index) => {
    if (index === 0) {
      return { ...i, freeQuantity: globalFreeQty, totalQuantity: i.quantity + globalFreeQty };
    }
    return { ...i, freeQuantity: 0, totalQuantity: i.quantity };
  });
}

export function useCart() {
  const [items, dispatch] = useReducer(cartReducer, []);

  const subtotal = useMemo(
    () =>
      items.reduce((sum, i) => {
        if (isCartItem(i)) {
          return sum + parseFloat(i.product.price) * i.quantity;
        } else {
          return sum + parseFloat(i.pack.price) * i.quantity;
        }
      }, 0),
    [items],
  );

  // Total items including free
  const totalItems = useMemo(
    () =>
      items.reduce((sum, i) => sum + i.quantity + i.freeQuantity, 0),
    [items],
  );

  // Total free items
  const totalFreeItems = useMemo(
    () =>
      items.reduce((sum, i) => sum + i.freeQuantity, 0),
    [items],
  );

  function addProduct(product: Product) {
    dispatch({ type: 'ADD_PRODUCT', product });
  }

  function addPack(pack: Pack) {
    dispatch({ type: 'ADD_PACK', pack });
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

  return {
    items,
    subtotal,
    totalItems,
    totalFreeItems,
    addProduct,
    addPack,
    removeProduct: (productId: number) => dispatch({ type: 'REMOVE_PRODUCT', productId }),
    removePack: (packId: number) => dispatch({ type: 'REMOVE_PACK', packId }),
    setProductQuantity,
    setPackQuantity,
    setFreeItems,
    clear: () => dispatch({ type: 'CLEAR' }),
  };
}