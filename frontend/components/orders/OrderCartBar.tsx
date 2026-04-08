"use client";

import { useState } from "react";
import { ShoppingBag, Receipt } from "lucide-react";
import type { MenuData } from "@/types";
import MyOrderSheet from "./MyOrderSheet";

interface Props {
  sessionId: string;
  participantId: string;
  cart: Record<string, number>;
  menuData: MenuData;
  onGoToOrders: () => void;
}

export default function OrderCartBar({ sessionId, participantId, cart, menuData, onGoToOrders }: Props) {
  const [open, setOpen] = useState(false);

  const allItems = menuData.categories.flatMap((c) => c.items);
  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const item = allItems.find((i) => i.id === itemId);
      return item ? { item, quantity: qty } : null;
    })
    .filter(Boolean) as { item: (typeof allItems)[0]; quantity: number }[];

  const totalItems = cartItems.reduce((s, { quantity }) => s + quantity, 0);
  const totalPrice = cartItems.reduce((s, { item, quantity }) => s + (item.price ?? 0) * quantity, 0);
  const hasUnknownPrice = cartItems.some(({ item }) => item.price === null);

  return (
    <>
      {/* Combined bar: my order (left) + go to full orders (right) */}
      <div className="fixed bottom-[72px] left-4 right-4 flex gap-2 z-10">
        {/* My order sheet trigger */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 bg-gray-900 text-white rounded-2xl px-4 py-3.5 flex items-center gap-2 shadow-xl active:scale-[0.98] transition-transform"
        >
          <ShoppingBag className="w-4 h-4 shrink-0" />
          <span className="font-semibold text-sm">Mi pedido ({totalItems})</span>
          <span className="ml-auto font-bold text-sm">
            {hasUnknownPrice ? `$${totalPrice.toFixed(2)}+` : `$${totalPrice.toFixed(2)}`}
          </span>
        </button>

        {/* Go to Orders tab */}
        <button
          onClick={onGoToOrders}
          className="bg-brand text-white rounded-2xl px-4 py-3.5 flex items-center gap-1.5 shadow-xl active:scale-[0.98] transition-transform shrink-0"
          title="Ver pedido total"
        >
          <Receipt className="w-4 h-4" />
          <span className="font-bold text-sm">Total</span>
        </button>
      </div>

      {open && (
        <MyOrderSheet
          cartItems={cartItems}
          onClose={() => setOpen(false)}
          sessionId={sessionId}
          participantId={participantId}
        />
      )}
    </>
  );
}
