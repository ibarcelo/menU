"use client";

import { X, Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/types";
import { upsertOrder } from "@/lib/api";
import toast from "react-hot-toast";

interface CartEntry {
  item: MenuItem;
  quantity: number;
}

interface Props {
  cartItems: CartEntry[];
  sessionId: string;
  participantId: string;
  onClose: () => void;
}

export default function MyOrderSheet({ cartItems, sessionId, participantId, onClose }: Props) {
  const total = cartItems.reduce(
    (s, { item, quantity }) => s + (item.price ?? 0) * quantity,
    0
  );
  const hasUnknownPrice = cartItems.some(({ item }) => item.price === null);

  async function handleChange(itemId: string, currentQty: number, delta: number) {
    const next = Math.max(0, currentQty + delta);
    try {
      await upsertOrder(sessionId, participantId, itemId, next);
    } catch {
      toast.error("Could not update order");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-white rounded-t-3xl max-h-[80vh] flex flex-col safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3">
          <h2 className="font-bold text-lg">My order</h2>
          <button onClick={onClose} className="text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5">
          <div className="divide-y divide-gray-50">
            {cartItems.map(({ item, quantity }) => (
              <div key={item.id} className="flex items-center justify-between py-3.5 gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.price != null ? `$${item.price.toFixed(2)} each` : "Market price"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleChange(item.id, quantity, -1)}
                    className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-5 text-center font-bold text-sm text-brand">{quantity}</span>
                  <button
                    onClick={() => handleChange(item.id, quantity, 1)}
                    className="w-7 h-7 rounded-full bg-brand flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </button>
                  <span className="w-14 text-right text-sm font-semibold">
                    {item.price != null ? `$${(item.price * quantity).toFixed(2)}` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="border-t border-gray-100 px-5 py-4 bg-white">
          <div className="flex items-center justify-between">
            <span className="font-bold text-gray-900">My total</span>
            <span className="text-xl font-black text-brand">
              {hasUnknownPrice ? `$${total.toFixed(2)}+` : `$${total.toFixed(2)}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
