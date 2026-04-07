"use client";

import { useEffect, useState, useCallback, Dispatch, SetStateAction } from "react";
import { Plus, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { getMenu, upsertOrder, addMenuItem, updateMenuItem, deleteMenuItem } from "@/lib/api";
import type { MenuItem, MenuData, Session } from "@/types";
import MenuItemCard from "./MenuItemCard";
import EditItemModal from "./EditItemModal";
import OrderCartBar from "../orders/OrderCartBar";

interface Props {
  sessionId: string;
  session: Session;
  participantId: string;
  isHost: boolean;
  cart: Record<string, number>;
  setCart: Dispatch<SetStateAction<Record<string, number>>>;
}

export default function MenuTab({ sessionId, session, participantId, cart, setCart }: Props) {
  const [menuData, setMenuData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  // Categories start expanded; set tracks which are collapsed
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCategory(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // ── Load menu ──────────────────────────────────────────────────
  const loadMenu = useCallback(async () => {
    try {
      const data = await getMenu(sessionId);
      setMenuData(data);
    } catch {
      // still processing
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadMenu(); }, [loadMenu]);

  // ── Realtime: menu_items ───────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`menu-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items", filter: `session_id=eq.${sessionId}` },
        () => loadMenu())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, loadMenu]);

  // ── Realtime: my orders (keep cart in sync from other devices) ─
  useEffect(() => {
    if (!participantId) return;
    const channel = supabase
      .channel(`my-orders-${participantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `participant_id=eq.${participantId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setCart((prev) => {
              const next = { ...prev };
              delete next[(payload.old as { menu_item_id: string }).menu_item_id];
              return next;
            });
          } else {
            const order = payload.new as { menu_item_id: string; quantity: number };
            setCart((prev) => ({ ...prev, [order.menu_item_id]: order.quantity }));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [participantId, setCart]);

  // ── Order actions ──────────────────────────────────────────────
  async function handleQuantityChange(itemId: string, delta: number) {
    const current = cart[itemId] ?? 0;
    const next = Math.max(0, current + delta);

    setCart((prev) => {
      const updated = { ...prev };
      if (next === 0) delete updated[itemId];
      else updated[itemId] = next;
      return updated;
    });

    try {
      await upsertOrder(sessionId, participantId, itemId, next);
    } catch {
      setCart((prev) => {
        const rolled = { ...prev };
        if (current === 0) delete rolled[itemId];
        else rolled[itemId] = current;
        return rolled;
      });
      toast.error("Could not update order");
    }
  }

  // ── Edit actions ───────────────────────────────────────────────
  async function handleSaveEdit(item: Partial<MenuItem>) {
    if (!item.id) return;
    try {
      await updateMenuItem(sessionId, item.id, { name: item.name, price: item.price, description: item.description, category: item.category });
      setEditItem(null);
      toast.success("Item updated");
    } catch {
      toast.error("Could not save changes");
    }
  }

  async function handleDelete(itemId: string) {
    try {
      await deleteMenuItem(sessionId, itemId);
      toast.success("Item removed");
    } catch {
      toast.error("Could not delete item");
    }
  }

  async function handleAddItem(item: Partial<MenuItem>) {
    try {
      await addMenuItem(sessionId, item);
      setShowAddModal(false);
      toast.success("Item added");
    } catch {
      toast.error("Could not add item");
    }
  }

  const totalInCart = Object.values(cart).reduce((s, q) => s + q, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-7 h-7 text-brand animate-spin" />
        <p className="text-gray-400 text-sm">Loading menu…</p>
      </div>
    );
  }

  if (!menuData || menuData.total_items === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
        {session.status === "processing" ? (
          <>
            <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
            <p className="font-semibold text-gray-700">AI is reading the menu…</p>
            <p className="text-gray-400 text-sm">This takes about 15 seconds</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-gray-700">No menu yet</p>
            <p className="text-gray-400 text-sm">Go to Scan tab to photograph the menu</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="pb-4">
      {menuData.categories.map((category) => {
        const isCollapsed = collapsed.has(category.name);
        // Count how many items in this category are in the cart
        const cartCount = category.items.reduce((s, i) => s + (cart[i.id] ?? 0), 0);

        return (
          <section key={category.name}>
            {/* Tappable category header */}
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
                  {cartCount} selected
                </span>
              )}
            </button>

            {/* Items — hidden when collapsed */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-100">
                {category.items.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    quantity={cart[item.id] ?? 0}
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

      {/* Add item FAB */}
      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-brand text-white rounded-full shadow-lg flex items-center justify-center z-10 active:scale-90 transition-transform"
        aria-label="Add item"
      >
        <Plus className="w-7 h-7" />
      </button>

      {totalInCart > 0 && (
        <OrderCartBar
          sessionId={sessionId}
          participantId={participantId}
          cart={cart}
          menuData={menuData}
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
