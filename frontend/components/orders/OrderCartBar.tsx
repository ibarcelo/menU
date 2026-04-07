"use client";

/**
 * Sticky bottom bar showing cart summary.
 * Tapping it opens a full-screen order sheet.
 */

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import type { MenuData } from "@/types";
import MyOrderSheet from "./MyOrderSheet";

interface Props {
  sessionId: string;
  participantId: string;
  cart: Record<string, number>; // itemId → quantity
  menuData: MenuData;
}

export default function OrderCartBar({ sessionId, participantId, cart, menuData }: Props) {
  const [open, setOpen] = useState(false);

  // Build cart items with prices
  const allItems = menuData.categories.flatMap((c) => c.items);
  const cartItems = Object.entries(cart)
    .filter(([, qty]) => qty > 0)
    .map(([itemId, qty]) => {
      const item = allItems.find((i) => i.id === itemId);
      return item ? { item, quantity: qty } : null;
    })
    .filter(Boolean) as { item: (typeof allItems)[0]; quantity: number }[];

  const totalItems = cartItems.reduce((s, { quantity }) => s + quantity, 0);
  const totalPrice = cartItems.reduce(
    (s, { item, quantity }) => s + (item.price ?? 0) * quantity,
    0
  );
  const hasUnknownPrice = cartItems.some(({ item }) => item.price === null);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[72px] left-4 right-4 bg-gray-900 text-white rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-xl z-10 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" />
          <span className="font-semibold text-sm">My order ({totalItems})</span>
        </div>
        <span className="font-bold text-sm">
          {hasUnknownPrice
            ? `$${totalPrice.toFixed(2)}+`
            : `$${totalPrice.toFixed(2)}`}
        </span>
      </button>

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
