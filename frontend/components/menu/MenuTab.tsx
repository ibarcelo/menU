"use client";

import { useEffect, useState, useCallback, Dispatch, SetStateAction } from "react";
import { ListPlus, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { getMenu, upsertOrder, addMenuItem, updateMenuItem, deleteMenuItem, getOrders } from "@/lib/api";
import type { MenuItem, MenuData, Session } from "@/types";
import MenuItemCard, { type OtherOrderer } from "./MenuItemCard";
import EditItemModal from "./EditItemModal";
import OrderCartBar from "../orders/OrderCartBar";

// Stable palette — avoids changing colors on re-render
const COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function colorForParticipant(participantId: string, allIds: string[]): string {
  const idx = allIds.indexOf(participantId);
  return COLORS[(idx >= 0 ? idx : 0) % COLORS.length];
}

interface Props {
  sessionId: string;
  session: Session;
  participantId: string;
  isHost: boolean;
  cart: Record<string, number>;
  setCart: Dispatch<SetStateAction<Record<string, number>>>;
  onGoToOrders: () => void;
}

export default function MenuTab({ sessionId, session, participantId, cart, setCart, onGoToOrders }: Props) {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // itemId → list of OTHER participants who ordered it
  const [othersMap, setOthersMap] = useState<Record<string, OtherOrderer[]>>({});
  // stable sorted list of all participant IDs for color assignment
  const [participantIds, setParticipantIds] = useState<string[]>([]);

  function toggleCategory(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const loadMenu = useCallback(async () => {
    try {
      const data = await getMenu(sessionId);
      setMenuData(data);
    } catch { /* still processing */ }
    finally { setLoading(false); }
  }, [sessionId]);

  // Build the othersMap from the full orders summary
  const loadOthers = useCallback(async () => {
    try {
      const summary = await getOrders(sessionId);
      // Collect all participant IDs sorted for stable color assignment
      const ids = summary.participants
        .map((p) => p.participant_id)
        .sort();
      setParticipantIds(ids);

      // Build map: itemId → OtherOrderer[]
      const map: Record<string, OtherOrderer[]> = {};
      for (const p of summary.participants) {
        if (p.participant_id === participantId) continue; // skip self
        const color = colorForParticipant(p.participant_id, ids);
        for (const item of p.items) {
          if (item.quantity === 0) continue;
          if (!map[item.menu_item_id]) map[item.menu_item_id] = [];
          // avoid duplicates
          if (!map[item.menu_item_id].some((o) => o.participantId === p.participant_id)) {
            map[item.menu_item_id].push({
              participantId: p.participant_id,
              name: p.participant_name,
              color,
            });
          }
        }
      }
      setOthersMap(map);
    } catch { /* silent */ }
  }, [sessionId, participantId]);

  useEffect(() => { loadMenu(); }, [loadMenu]);
  useEffect(() => { loadOthers(); }, [loadOthers]);

  // Realtime: menu items
  useEffect(() => {
    const ch = supabase
      .channel(`menu-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `session_id=eq.${sessionId}` },
        () => loadMenu())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, loadMenu]);

  // Realtime: my orders (keep cart in sync)
  useEffect(() => {
    if (!participantId) return;
    const ch = supabase
      .channel(`my-orders-${participantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `participant_id=eq.${participantId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setCart((prev) => { const n = { ...prev }; delete n[(payload.old as { menu_item_id: string }).menu_item_id]; return n; });
          } else {
            const o = payload.new as { menu_item_id: string; quantity: number };
            setCart((prev) => ({ ...prev, [o.menu_item_id]: o.quantity }));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [participantId, setCart]);

  // Realtime: ALL session orders → update othersMap
  useEffect(() => {
    const ch = supabase
      .channel(`session-orders-${sessionId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "orders",
        filter: `session_id=eq.${sessionId}`,
      }, () => loadOthers())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, loadOthers]);

  // ── Order actions ─────────────────────────────────────
  async function handleQuantityChange(itemId: string, delta: number) {
    const current = cart[itemId] ?? 0;
    const next = Math.max(0, current + delta);
    setCart((prev) => { const u = { ...prev }; if (next === 0) delete u[itemId]; else u[itemId] = next; return u; });
    try {
      await upsertOrder(sessionId, participantId, itemId, next);
    } catch {
      setCart((prev) => { const r = { ...prev }; if (current === 0) delete r[itemId]; else r[itemId] = current; return r; });
      toast.error("No se pudo actualizar el pedido");
    }
  }

  async function handleSaveEdit(item: Partial<MenuItem>) {
    if (!item.id) return;
    try {
      await updateMenuItem(sessionId, item.id, { name: item.name, price: item.price, description: item.description, category: item.category });
      setEditItem(null);
      toast.success("Plato actualizado");
    } catch { toast.error("No se pudo guardar"); }
  }

  async function handleDelete(itemId: string) {
    try {
      await deleteMenuItem(sessionId, itemId);
      toast.success("Plato eliminado");
    } catch { toast.error("No se pudo eliminar"); }
  }

  async function handleAddItem(item: Partial<MenuItem>) {
    try {
      await addMenuItem(sessionId, item);
      setShowAddModal(false);
      toast.success("Plato añadido");
    } catch { toast.error("No se pudo añadir"); }
  }

  const totalInCart = Object.values(cart).reduce((s, q) => s + q, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-7 h-7 text-brand animate-spin" />
        <p className="text-gray-400 text-sm">Cargando menú…</p>
      </div>
    );
  }

  if (!menuData || menuData.total_items === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
        {session.status === "processing" ? (
          <>
            <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
            <p className="font-semibold text-gray-700">La IA está leyendo el menú…</p>
            <p className="text-gray-400 text-sm">Tarda unos 15 segundos</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-gray-700">Sin menú todavía</p>
            <p className="text-gray-400 text-sm">Ve a Escanear para fotografiar el menú</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pb-4">
      {menuData.categories.map((category) => {
        const isCollapsed = collapsed.has(category.name);
        const cartCount = category.items.reduce((s, i) => s + (cart[i.id] ?? 0), 0);

        return (
          <section key={category.name}>
            <button
              onClick={() => toggleCategory(category.name)}
              className="sticky top-0 w-full bg-gray-50 z-10 px-4 py-3 border-b border-gray-100 flex items-center justify-between active:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isCollapsed
                  ? <ChevronRight className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />
                }
                <h3 className="font-black text-sm uppercase tracking-wider text-gray-600">
                  {category.name}
                </h3>
                <span className="text-xs text-gray-400 font-normal normal-case tracking-normal">
                  ({category.items.length})
                </span>
              </div>
              {cartCount > 0 && (
                <span className="bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {cartCount} seleccionados
                </span>
              )}
            </button>

            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={cart[item.id] ?? 0}
                    others={othersMap[item.id] ?? []}
                    onAdd={() => handleQuantityChange(item.id, 1)}
                    onRemove={() => handleQuantityChange(item.id, -1)}
                    onEdit={() => setEditItem(item)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {/* FAB — add custom dish */}
      <button
        onClick={() => setShowAddModal(true)}
        className={`fixed right-4 flex items-center gap-2 bg-gray-800 text-white font-bold text-sm px-4 py-3 rounded-2xl shadow-lg z-10 active:scale-95 transition-transform ${
          totalInCart > 0 ? "bottom-[140px]" : "bottom-24"
        }`}
        aria-label="Añadir plato"
      >
        <ListPlus className="w-5 h-5" />
        Añadir plato
      </button>

      {totalInCart > 0 && (
        <OrderCartBar
          sessionId={sessionId}
          participantId={participantId}
          cart={cart}
          menuData={menuData}
          onGoToOrders={onGoToOrders}
        />
      )}

      {editItem && (
        <EditItemModal
          item={editItem}
          onSave={handleSaveEdit}
          onDelete={() => { handleDelete(editItem.id); setEditItem(null); }}
          onClose={() => setEditItem(null)}
        />
      )}

      {showAddModal && (
        <EditItemModal
          item={{ id: "", session_id: sessionId, category: "Other", name: "", description: null, price: null, price_text: null, special_price: false, tags: [], sort_order: 0, created_at: "" }}
          isNew
          onSave={handleAddItem}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
