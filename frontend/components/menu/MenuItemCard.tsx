"use client";

import { Pencil, Minus, Plus } from "lucide-react";
import type { MenuItem } from "@/types";
import clsx from "clsx";

interface Props {
  item: MenuItem;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

export default function MenuItemCard({ item, quantity, onAdd, onRemove, onEdit }: Props) {
  const hasOrder = quantity > 0;

  return (
    <div className={clsx(
      "flex items-center gap-3 px-4 py-4 bg-white transition-colors",
      hasOrder && "bg-orange-50"
    )}>
      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4 className={clsx(
            "font-semibold text-base leading-snug",
            hasOrder ? "text-brand" : "text-gray-900"
          )}>
            {item.name}
          </h4>
          <button
            onClick={onEdit}
            className="shrink-0 p-1.5 text-gray-300 active:text-gray-500"
            aria-label="Edit item"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        {item.description && (
          <p className="text-sm text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5">
          <span className={clsx(
            "text-base font-bold",
            item.special_price ? "text-amber-500" : "text-gray-900"
          )}>
            {item.special_price
              ? (item.price_text ?? "Market price")
              : item.price != null
              ? `$${item.price.toFixed(2)}`
              : "—"}
          </span>
          {item.tags?.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Quantity controls — big touch targets */}
      <div className="shrink-0">
        {hasOrder ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onRemove}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-6 text-center text-base font-bold text-brand">{quantity}</span>
            <button
              onClick={onAdd}
              className="w-9 h-9 rounded-full bg-brand flex items-center justify-center active:opacity-80 transition-opacity"
            >
              <Plus className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="w-11 h-11 rounded-full bg-brand flex items-center justify-center active:scale-90 transition-transform shadow"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        )}
      </div>
    </div>
  );
}
