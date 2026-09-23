import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OrderStore {
  orderIds: string[];
  addOrder: (orderId: string) => void;
}

export const useOrderStore = create<OrderStore>()(
  persist(
    (set) => ({
      orderIds: [],

      addOrder: (orderId) =>
        set((state) =>
          state.orderIds.includes(orderId)
            ? state
            : { orderIds: [orderId, ...state.orderIds].slice(0, 50) }
        ),
    }),
    {
      name: "order-store",
    }
  )
);
