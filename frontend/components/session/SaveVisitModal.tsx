"use client";

import { useState, useRef } from "react";
import { X, Bookmark, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { Session, OrdersSummary, ParticipantOrder } from "@/types";

interface Props {
  session: Session;
  summary: OrdersSummary;
  participantId: string;
  onClose: () => void;
  onSaved: () => void;
}

// ── Half-star picker (0, 0.5, 1 … 5) ─────────────────────
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
  const containerRef = useRef<HTMLDivElement>(null);
  const dim = size === "lg" ? 32 : size === "md" ? 24 : 20;

  function getValueFromEvent(e: React.MouseEvent | React.TouchEvent, starIndex: number) {
    const el = (e.currentTarget as HTMLElement).closest("[data-star]") as HTMLElement;
    if (!el) return starIndex;
    const rect = el.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const relX = clientX - rect.left;
    return relX < rect.width / 2 ? starIndex - 0.5 : starIndex;
  }

  const display = hoverVal || value;

  return (
    <div ref={containerRef} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const full = display >= n;
        const half = !full && display >= n - 0.5;

        return (
          <div
            key={n}
            data-star={n}
            style={{ width: dim, height: dim }}
            className="relative cursor-pointer"
            onMouseMove={(e) => setHoverVal(getValueFromEvent(e, n))}
            onMouseLeave={() => setHoverVal(0)}
            onClick={(e) => {
              const v = getValueFromEvent(e, n);
              onChange(v === value ? 0 : v);
            }}
          >
            {/* Gray base star */}
            <svg viewBox="0 0 24 24" width={dim} height={dim} className="absolute inset-0">
              <path
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                fill="none" stroke="#e5e7eb" strokeWidth="2" strokeLinejoin="round"
              />
            </svg>
            {/* Yellow fill (full or half) */}
            {(full || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: full ? "100%" : "50%" }}
              >
                <svg viewBox="0 0 24 24" width={dim} height={dim}>
                  <path
                    d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                    fill="#facc15" stroke="#facc15" strokeWidth="2" strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────
export default function SaveVisitModal({ session, summary, participantId, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [restaurantName, setRestaurantName] = useState(session.restaurant?.trim() || "");
  const [restaurantRating, setRestaurantRating] = useState(0);
  const [restaurantNote, setRestaurantNote] = useState("");
  const [itemRatings, setItemRatings] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const myOrder: ParticipantOrder | undefined = summary.participants.find(
    (p) => p.participant_id === participantId
  );

  async function handleSave() {
    if (!user || !myOrder) return;
    setSaving(true);
    try {
      const items = myOrder.items.map((item) => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        rating: itemRatings[item.menu_item_id] || null,
        note: itemNotes[item.menu_item_id]?.trim() || null,
      }));

      const finalName = restaurantName.trim() || "Restaurante desconocido";

      // Build payload — only include restaurant_rating if set,
      // so the insert works even if migration 003 hasn't been run yet.
      const payload: Record<string, unknown> = {
        user_id: user.id,
        restaurant_name: finalName,
        visited_at: new Date().toISOString(),
        general_note: restaurantNote.trim() || null,
        items,
        grand_total: myOrder.subtotal,
      };
      if (restaurantRating > 0) {
        payload.restaurant_rating = restaurantRating;
      }

      const { error } = await supabase.from("saved_visits").insert(payload);

      if (error) {
        console.error("Supabase insert error:", error);
        // Show the real error so it's easier to debug
        toast.error(`Error: ${error.message}`);
        return;
      }
      toast.success("¡Visita guardada en tu perfil!");
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error inesperado al guardar.");
    } finally {
      setSaving(false);
    }
  }

  if (!myOrder || myOrder.items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
          <p className="text-center text-gray-500 py-8">Aún no has pedido nada.</p>
          <button onClick={onClose} className="w-full bg-gray-100 text-gray-700 font-semibold rounded-2xl py-3.5">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92dvh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-brand" />
            <h2 className="text-xl font-black text-gray-900">Guardar visita</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-5">

          {/* Restaurant rating */}
          <div className="bg-orange-50 rounded-2xl px-4 py-4">
            <input
              type="text"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Nombre del restaurante"
              maxLength={80}
              className="w-full font-black text-gray-900 text-base bg-transparent border-b-2 border-orange-200 focus:border-brand focus:outline-none pb-1 mb-1 placeholder:font-normal placeholder:text-gray-400"
            />
            <p className="text-xs text-gray-400 mb-3">
              {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </p>
            <div className="flex items-center gap-2 mb-3">
              <HalfStarPicker value={restaurantRating} onChange={setRestaurantRating} size="lg" />
              {restaurantRating > 0 && (
                <span className="text-sm font-bold text-yellow-500">{restaurantRating}/5</span>
              )}
            </div>
            <textarea
              value={restaurantNote}
              onChange={(e) => setRestaurantNote(e.target.value)}
              placeholder="¿Qué tal el restaurante? Ambiente, servicio…"
              rows={2} maxLength={500}
              className="w-full border-2 border-orange-100 bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>

          {/* Per-dish ratings */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Tus platos · {myOrder.items.length} artículos
            </p>
            <div className="flex flex-col gap-3">
              {myOrder.items.map((item) => (
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

          {myOrder.subtotal != null && (
            <div className="flex justify-between items-center px-1">
              <span className="text-sm text-gray-500">Mi total</span>
              <span className="font-black text-gray-900 text-base">${myOrder.subtotal.toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 shrink-0 border-t border-gray-100">
          <button
            onClick={handleSave} disabled={saving}
            className="w-full bg-brand text-white font-bold text-base rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
              <><Bookmark className="w-5 h-5" /> Guardar visita</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
