import { useReducer, useMemo } from 'react';
import { CartItem, Product } from '@/types';
import { toast } from 'sonner';

type CartAction =
  | { type: 'ADD'; product: Product }
  | { type: 'REMOVE'; productId: number }
  | { type: 'SET_QTY'; productId: number; quantity: number }
  | { type: 'CLEAR' };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find((i) => i.product.id === action.product.id);
      if (existing) {
        if (existing.quantity >= action.product.stock) {
          return state;
        }
        return state.map((i) =>
          i.product.id === action.product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i,
        );
      }
      if (action.product.stock <= 0) {
        return state;
      }
      return [...state, { product: action.product, quantity: 1 }];
    }
    case 'REMOVE':
      return state.filter((i) => i.product.id !== action.productId);

    case 'SET_QTY': {
      if (action.quantity <= 0) {
        return state.filter((i) => i.product.id !== action.productId);
      }
      return state.map((i) => {
        if (i.product.id !== action.productId) return i;
        const clamped = Math.min(action.quantity, i.product.stock);
        return { ...i, quantity: clamped };
      });
    }
    case 'CLEAR':
      return [];
    default:
      return state;
  }
}

export function useCart() {
  const [items, dispatch] = useReducer(cartReducer, []);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, i) => sum + parseFloat(i.product.price) * i.quantity,
        0,
      ),
    [items],
  );

  function addItem(product: Product) {
    const existing = items.find((i) => i.product.id === product.id);
    const currentQty = existing?.quantity ?? 0;

    if (currentQty >= product.stock) {
      toast.error(`Stok "${product.name}" hanya tersisa ${product.stock}`);
      return;
    }

    dispatch({ type: 'ADD', product });
  }

  function setQuantity(productId: number, quantity: number) {
    const existing = items.find((i) => i.product.id === productId);

    if (existing && quantity > existing.product.stock) {
      toast.error(
        `Stok "${existing.product.name}" hanya tersisa ${existing.product.stock}`,
      );
    }

    dispatch({ type: 'SET_QTY', productId, quantity });
  }

  return {
    items,
    subtotal,
    addItem,
    removeItem: (productId: number) => dispatch({ type: 'REMOVE', productId }),
    setQuantity,
    clear: () => dispatch({ type: 'CLEAR' }),
  };
}
