"use client";

import { Pencil, Minus, Plus, ShoppingCart } from "lucide-react";
import type { MenuItem } from "@/types";
import clsx from "clsx";

export interface OtherOrderer {
  participantId: string;
  name: string;
  color: string; // tailwind bg class
}

interface Props {
  item: MenuItem;
  quantity: number;
  others: OtherOrderer[]; // other participants who ordered this item
  onAdd: () => void;
  onRemove: () => void;
  onEdit: () => void;
}

export default function MenuItemCard({ item, quantity, others, onAdd, onRemove, onEdit }: Props) {
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
          <div className="flex items-center gap-1 shrink-0">
            {others.length > 0 && (
              <div className="flex items-center">
                {others.slice(0, 4).map((o) => (
                  <div
                    key={o.participantId}
                    title={o.name}
                    className={clsx(
                      "w-6 h-6 rounded-full flex items-center justify-center text-white font-bold ring-2 ring-white",
                      o.color,
                      "-ml-1.5 first:ml-0"
                    )}
                    style={{ fontSize: 11 }}
                  >
                    {o.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {others.length > 4 && (
                  <div
                    className="-ml-1.5 w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold ring-2 ring-white"
                    style={{ fontSize: 11 }}
                  >
                    +{others.length - 4}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-300 active:text-gray-500"
              aria-label="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        </div>

        {item.description && (
          <p className="text-sm text-gray-400 mt-0.5 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
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

      {/* Quantity controls */}
      <div className="shrink-0">
        {hasOrder ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onRemove}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200 transition-colors"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="w-6 text-center text-base font-bold text-brand">{quantity}</span>
            <button
              onClick={onAdd}
              className="w-9 h-9 rounded-full bg-brand/10 border-2 border-brand flex items-center justify-center active:bg-brand/20 transition-colors"
            >
              <Plus className="w-4 h-4 text-brand" />
            </button>
          </div>
        ) : (
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 bg-brand text-white font-bold text-sm px-4 py-2.5 rounded-xl active:scale-95 transition-transform shadow-sm"
          >
            <ShoppingCart className="w-4 h-4" />
            Añadir
          </button>
        )}
      </div>
    </div>
  );
}
