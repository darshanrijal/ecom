import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId } from "@paralleldrive/cuid2";

const GUEST_CART_ID_STORAGE_KEY = "cart_id";

export interface GuestCartItem {
  id: string;
  skuId: string;
  quantity: number;
}

interface CartStore {
  items: GuestCartItem[];

  addItem: (skuId: string, quantity: number) => void;
  removeItem: (skuId: string) => void;
  updateQuantity: (skuId: string, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],

      addItem: (skuId, quantity) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.skuId === skuId);

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.skuId === skuId
                  ? {
                      ...item,
                      quantity: item.quantity + quantity,
                    }
                  : item
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                id: createId(),
                skuId,
                quantity,
              },
            ],
          };
        });
      },

      removeItem: (skuId) => {
        set((state) => ({
          items: state.items.filter((item) => item.skuId !== skuId),
        }));
      },

      updateQuantity: (skuId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.skuId === skuId
              ? {
                  ...item,
                  quantity,
                }
              : item
          ),
        }));
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: "cart-store",
    }
  )
);

export function initCart() {
  if (typeof window === "undefined") {
    throw new Error("initCart must be called on the client");
  }

  const existingCartId = localStorage.getItem(GUEST_CART_ID_STORAGE_KEY);

  if (existingCartId) {
    return existingCartId;
  }

  const cartId = createId();

  localStorage.setItem(GUEST_CART_ID_STORAGE_KEY, cartId);

  return cartId;
}
