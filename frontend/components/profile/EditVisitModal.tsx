"use client";

import { useState, useRef } from "react";
import { X, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import type { SavedVisit, SavedVisitItem } from "@/types";

// ── Half-star picker (shared logic, no external dep) ─────
function HalfStarPicker({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hoverVal, setHoverVal] = useState(0);
  const dim = size === "lg" ? 32 : size === "md" ? 24 : 20;

  function getVal(e: React.MouseEvent, starIndex: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientX - rect.left < rect.width / 2 ? starIndex - 0.5 : starIndex;
  }

  const display = hoverVal || value;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const full = display >= n;
        const half = !full && display >= n - 0.5;
        return (
          <div
            key={n}
            style={{ width: dim, height: dim }}
            className="relative cursor-pointer"
            onMouseMove={(e) => setHoverVal(getVal(e, n))}
            onMouseLeave={() => setHoverVal(0)}
            onClick={(e) => { const v = getVal(e, n); onChange(v === value ? 0 : v); }}
          >
            <svg viewBox="0 0 24 24" width={dim} height={dim} className="absolute inset-0">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            {(full || half) && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: full ? "100%" : "50%" }}>
                <svg viewBox="0 0 24 24" width={dim} height={dim}>
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="#facc15" stroke="#facc15" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface Props {
  visit: SavedVisit;
  onClose: () => void;
  onSaved: (updated: SavedVisit) => void;
}

export default function EditVisitModal({ visit, onClose, onSaved }: Props) {
  const [restaurantName, setRestaurantName] = useState(visit.restaurant_name);
  const [restaurantRating, setRestaurantRating] = useState(visit.restaurant_rating ?? 0);
  const [generalNote, setGeneralNote] = useState(visit.general_note ?? "");
  const [itemRatings, setItemRatings] = useState<Record<string, number>>(
    Object.fromEntries(visit.items.map((i) => [i.menu_item_id, i.rating ?? 0]))
  );
  const [itemNotes, setItemNotes] = useState<Record<string, string>>(
    Object.fromEntries(visit.items.map((i) => [i.menu_item_id, i.note ?? ""]))
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updatedItems: SavedVisitItem[] = visit.items.map((item) => ({
        ...item,
        rating: itemRatings[item.menu_item_id] || null,
        note: itemNotes[item.menu_item_id]?.trim() || null,
      }));

      const patch: Record<string, unknown> = {
        restaurant_name: restaurantName.trim() || visit.restaurant_name,
        general_note: generalNote.trim() || null,
        items: updatedItems,
      };
      if (restaurantRating > 0) patch.restaurant_rating = restaurantRating;
      else patch.restaurant_rating = null;

      const { error } = await supabase
        .from("saved_visits")
        .update(patch)
        .eq("id", visit.id);

      if (error) {
        toast.error(`Error: ${error.message}`);
        return;
      }

      const updated: SavedVisit = {
        ...visit,
        restaurant_name: patch.restaurant_name as string,
        restaurant_rating: restaurantRating || null,
        general_note: generalNote.trim() || null,
        items: updatedItems,
      };
      toast.success("Visita actualizada");
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <h2 className="text-xl font-black text-gray-900">Editar visita</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">

          {/* Restaurant section */}
          <div className="bg-orange-50 rounded-2xl px-4 py-4 space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1">Restaurante</label>
              <input
                type="text"
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                maxLength={80}
                className="w-full font-black text-gray-900 text-base bg-transparent border-b-2 border-orange-200 focus:border-brand focus:outline-none pb-1 placeholder:font-normal placeholder:text-gray-400"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Valoración</label>
              <div className="flex items-center gap-2">
                <HalfStarPicker value={restaurantRating} onChange={setRestaurantRating} size="lg" />
                {restaurantRating > 0 && (
                  <span className="text-sm font-bold text-yellow-500">{restaurantRating}/5</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide block mb-1.5">Nota del restaurante</label>
              <textarea
                value={generalNote}
                onChange={(e) => setGeneralNote(e.target.value)}
                placeholder="Ambiente, servicio, recomendaciones…"
                rows={3} maxLength={500}
                className="w-full border-2 border-orange-100 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors resize-none"
              />
            </div>
          </div>

          {/* Per-dish section */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notas por plato</p>
            <div className="flex flex-col gap-3">
              {visit.items.map((item) => (
                <div key={item.menu_item_id} className="bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold text-gray-800 flex-1 min-w-0">
                      {item.name}
                      <span className="ml-1.5 text-gray-400 font-normal">×{item.quantity}</span>
                    </p>
                    {item.subtotal != null && (
                      <span className="text-sm font-bold text-gray-700 shrink-0">${item.subtotal.toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <HalfStarPicker
                      value={itemRatings[item.menu_item_id] ?? 0}
                      onChange={(v) => setItemRatings((prev) => ({ ...prev, [item.menu_item_id]: v }))}
                      size="sm"
                    />
                    {(itemRatings[item.menu_item_id] ?? 0) > 0 && (
                      <span className="text-xs text-yellow-500 font-bold">{itemRatings[item.menu_item_id]}/5</span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={itemNotes[item.menu_item_id] ?? ""}
                    onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.menu_item_id]: e.target.value }))}
                    placeholder="Comentario (opcional)"
                    maxLength={200}
                    className="w-full border-2 border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-5 shrink-0 border-t border-gray-100">
          <button
            onClick={handleSave} disabled={saving}
            className="w-full bg-brand text-white font-bold text-base rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Guardar cambios</>}
          </button>
        </div>
      </div>
    </div>
  );
}
