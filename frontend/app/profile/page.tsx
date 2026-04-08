"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UtensilsCrossed, ArrowLeft, LogOut, Bookmark,
  ChevronDown, ChevronUp, Loader2, MessageSquare, Pencil,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import type { SavedVisit } from "@/types";
import AuthModal from "@/components/auth/AuthModal";
import EditVisitModal from "@/components/profile/EditVisitModal";

// ── Half-star display (read-only) ────────────────────────
function Stars({ value, size = "sm" }: { value: number; size?: "sm" | "md" }) {
  const dim = size === "md" ? 16 : 14;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const full = value >= n;
        const half = !full && value >= n - 0.5;
        return (
          <span key={n} style={{ width: dim, height: dim }} className="relative inline-block shrink-0">
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
          </span>
        );
      })}
    </span>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const [visits, setVisits] = useState<SavedVisit[]>([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingVisit, setEditingVisit] = useState<SavedVisit | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingVisits(true);
    supabase
      .from("saved_visits")
      .select("*")
      .order("visited_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setVisits(data as SavedVisit[]);
        setLoadingVisits(false);
      });
  }, [user]);

  function handleVisitUpdated(updated: SavedVisit) {
    setVisits((prev) => prev.map((v) => v.id === updated.id ? updated : v));
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  // ── Not loaded yet ───────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  // ── Not signed in ────────────────────────────
  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 bg-white">
        <div className="w-full max-w-xs text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand mb-5 shadow">
            <Bookmark className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Mi perfil</h1>
          <p className="text-gray-400 text-sm mb-8">Inicia sesión para ver tu historial de visitas.</p>
          <button onClick={() => setShowAuth(true)}
            className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 shadow-md active:scale-95 transition-transform">
            Iniciar sesión
          </button>
          <button onClick={() => router.push("/")}
            className="mt-4 flex items-center justify-center gap-1.5 text-sm text-gray-400 w-full">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        </div>
        {showAuth && <AuthModal reason="Inicia sesión para acceder a tu perfil." onClose={() => setShowAuth(false)} />}
      </main>
    );
  }

  // ── Signed in ────────────────────────────────
  const username = user.user_metadata?.username || user.email?.split("@")[0] || "Usuario";

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between safe-top sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-brand" />
            <span className="font-black text-gray-900">Mi Perfil</span>
          </div>
        </div>
        <button onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-500 transition-colors">
          <LogOut className="w-4 h-4" />
          Salir
        </button>
      </header>

      <div className="px-4 py-5 max-w-lg mx-auto">
        {/* User card */}
        <div className="bg-white rounded-3xl px-5 py-5 flex items-center gap-4 mb-6 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center text-white text-2xl font-black shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 truncate">{username}</p>
            <p className="text-sm text-gray-400 truncate">{user.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {visits.length === 0
                ? "Ninguna visita guardada aún"
                : `${visits.length} visita${visits.length !== 1 ? "s" : ""} guardada${visits.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Section title */}
        <div className="flex items-center gap-2 mb-3">
          <Bookmark className="w-4 h-4 text-brand" />
          <h2 className="font-black text-lg text-gray-900">Mis visitas</h2>
        </div>

        {/* Visits */}
        {loadingVisits ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-brand animate-spin" />
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Bookmark className="w-10 h-10 text-gray-200" />
            <p className="font-semibold text-gray-600">Aún no tienes visitas</p>
            <p className="text-sm text-gray-400 max-w-xs">
              Después de pedir, pulsa &quot;Guardar visita&quot; en la pestaña de Pedidos.
            </p>
            <button onClick={() => router.push("/")}
              className="mt-2 bg-brand text-white font-bold rounded-2xl px-6 py-3 active:scale-95 transition-transform">
              Nueva mesa
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {visits.map((visit) => {
              const isExpanded = expandedId === visit.id;
              const totalItems = visit.items.reduce((s, i) => s + i.quantity, 0);
              const date = new Date(visit.visited_at);
              const hasNotes = !!visit.general_note || visit.items.some((i) => i.note || i.rating);

              return (
                <div key={visit.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="px-4 py-4 flex items-start gap-3">
                    {/* Restaurant initial */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                      className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0"
                    >
                      <span className="text-brand font-black text-lg">
                        {visit.restaurant_name.charAt(0).toUpperCase()}
                      </span>
                    </button>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className="font-black text-gray-900 truncate">{visit.restaurant_name}</p>
                      {visit.restaurant_rating != null && visit.restaurant_rating > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Stars value={visit.restaurant_rating} />
                          <span className="text-xs text-yellow-500 font-bold">{visit.restaurant_rating}/5</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
                        {" · "}{totalItems} plato{totalItems !== 1 ? "s" : ""}
                        {visit.grand_total != null && (
                          <span className="font-semibold text-gray-600"> · ${visit.grand_total.toFixed(2)}</span>
                        )}
                      </p>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {/* Edit button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingVisit(visit); }}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-brand hover:bg-orange-50 transition-colors"
                        title="Editar notas"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {/* Expand toggle */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : visit.id)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Collapsed hint — show if there are notes but not expanded */}
                  {!isExpanded && hasNotes && (
                    <div className="px-5 pb-3 -mt-1">
                      {visit.general_note && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                          <MessageSquare className="w-3 h-3 shrink-0" />
                          {visit.general_note}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* Restaurant note */}
                      {visit.general_note ? (
                        <div className="px-5 py-3 bg-orange-50 flex gap-2.5 items-start">
                          <MessageSquare className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                          <p className="text-sm text-gray-700">{visit.general_note}</p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingVisit(visit)}
                          className="w-full px-5 py-3 bg-gray-50 flex items-center gap-2 text-sm text-gray-400 hover:text-brand transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Añadir nota del restaurante
                        </button>
                      )}

                      {/* Dish list */}
                      <div className="px-5 py-2">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide py-2">Platos pedidos</p>
                        <div className="flex flex-col gap-3 pb-3">
                          {visit.items.map((item, idx) => (
                            <div key={idx}>
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">
                                  {item.name}
                                  <span className="ml-1 text-gray-400 font-normal text-xs">×{item.quantity}</span>
                                </p>
                                {item.subtotal != null && (
                                  <span className="text-sm font-bold text-gray-700 shrink-0">${item.subtotal.toFixed(2)}</span>
                                )}
                              </div>
                              {item.rating != null && item.rating > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Stars value={item.rating} />
                                  <span className="text-xs text-yellow-500 font-bold">{item.rating}/5</span>
                                </div>
                              )}
                              {item.note ? (
                                <p className="text-xs text-gray-400 flex items-start gap-1 mt-0.5">
                                  <MessageSquare className="w-3 h-3 shrink-0 mt-px" />
                                  {item.note}
                                </p>
                              ) : (
                                <button
                                  onClick={() => setEditingVisit(visit)}
                                  className="text-xs text-gray-300 hover:text-brand transition-colors mt-0.5"
                                >
                                  + añadir nota
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Total */}
                      {visit.grand_total != null && (
                        <div className="px-5 py-3 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                          <span className="text-sm text-gray-500">Mi total</span>
                          <span className="font-black text-gray-900">${visit.grand_total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit visit modal */}
      {editingVisit && (
        <EditVisitModal
          visit={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSaved={handleVisitUpdated}
        />
      )}
    </main>
  );
}
