"use client";

/**
 * OrdersTab – shows all orders grouped by participant with real-time updates.
 * Everyone can see everyone's order. Grand total shown at bottom.
 */

import { useEffect, useState, useCallback } from "react";
import { Loader2, Receipt, Bookmark } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { getOrders } from "@/lib/api";
import type { OrdersSummary } from "@/types";
import clsx from "clsx";

interface Props {
  sessionId: string;
  participantId: string;
  onSaveVisit: (summary: OrdersSummary) => void;
}

export default function OrdersTab({ sessionId, participantId, onSaveVisit }: Props) {
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    try {
      const data = await getOrders(sessionId);
      setSummary(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime: reload on any order change in this session
  useEffect(() => {
    const channel = supabase
      .channel(`all-orders-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `session_id=eq.${sessionId}`,
        },
        () => loadOrders()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, loadOrders]);

  const myOrder = summary?.participants.find((p) => p.participant_id === participantId);
  const hasMyOrder = (myOrder?.items.length ?? 0) > 0;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  if (!summary || summary.participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
        <Receipt className="w-10 h-10 text-gray-200" />
        <p className="font-semibold text-gray-600">No orders yet</p>
        <p className="text-sm text-gray-400">Go to Menu tab to add dishes</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h2 className="font-black text-xl mb-4">Everyone&apos;s order</h2>

      <div className="flex flex-col gap-4">
        {summary.participants.map((p) => {
          const isMe = p.participant_id === participantId;
          return (
            <div
              key={p.participant_id}
              className={clsx(
                "bg-white rounded-2xl overflow-hidden shadow-sm",
                isMe && "ring-2 ring-brand"
              )}
            >
              {/* Participant header */}
              <div className={clsx(
                "px-4 py-3 flex items-center justify-between",
                isMe ? "bg-orange-50" : "bg-gray-50"
              )}>
                <div className="flex items-center gap-2">
                  <div className={clsx(
                    "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold",
                    isMe ? "bg-brand" : "bg-gray-400"
                  )}>
                    {p.participant_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-sm">
                    {p.participant_name} {isMe && <span className="text-brand">(you)</span>}
                  </span>
                </div>
                {p.subtotal != null && (
                  <span className="font-bold text-sm text-gray-900">
                    ${p.subtotal.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="divide-y divide-gray-50">
                {p.items.map((item) => (
                  <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{item.name}</p>
                      {item.notes && (
                        <p className="text-xs text-gray-400">{item.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-gray-400">×{item.quantity}</span>
                      <span className="text-sm font-semibold text-gray-700">
                        {item.subtotal != null ? `$${item.subtotal.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grand total */}
      {summary.grand_total != null && (
        <div className="mt-6 bg-gray-900 text-white rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Grand total</p>
            <p className="text-xs text-gray-400 mt-0.5">{summary.item_count} items</p>
          </div>
          <span className="text-3xl font-black">${summary.grand_total.toFixed(2)}</span>
        </div>
      )}

      {/* Save visit CTA */}
      {hasMyOrder && (
        <button
          onClick={() => onSaveVisit(summary)}
          className="mt-4 w-full flex items-center justify-center gap-2 border-2 border-brand text-brand font-bold text-base rounded-2xl py-3.5 active:scale-95 transition-transform hover:bg-orange-50"
        >
          <Bookmark className="w-5 h-5" />
          Save my visit
        </button>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-300 text-center mt-4">
        Taxes and service charge not included
      </p>
    </div>
  );
}
