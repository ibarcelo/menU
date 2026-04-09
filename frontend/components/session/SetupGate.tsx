"use client";

import { useState, FormEvent, useEffect } from "react";
import { UtensilsCrossed, Loader2, Store, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { joinSession } from "@/lib/api";
import type { Participant } from "@/types";

interface Props {
  sessionId: string;
  defaultUsername?: string;
  onDone: (participant: Participant, restaurantName: string) => void;
}

export default function SetupGate({ sessionId, defaultUsername = "", onDone }: Props) {
  const [restaurant, setRestaurant] = useState("");
  const [name, setName] = useState(defaultUsername);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Animated dot counter for the "AI is working" hint
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 600);
    return () => clearInterval(t);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedRestaurant = restaurant.trim();
    if (!trimmedName) { setError("Introduce tu nombre"); return; }

    setSubmitting(true);
    setError("");
    try {
      // Update restaurant name on session (optional but immediate)
      if (trimmedRestaurant) {
        await supabase
          .from("sessions")
          .update({ restaurant: trimmedRestaurant })
          .eq("id", sessionId);
      }

      // Join session
      const participant = await joinSession(sessionId, trimmedName);
      onDone(participant, trimmedRestaurant);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("unique") || msg.includes("taken")) {
        setError("Ese nombre ya está en uso. Prueba otro.");
      } else {
        setError("Error al unirse. Inténtalo de nuevo.");
      }
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* AI working banner */}
      <div className="bg-amber-500 px-5 py-3 safe-top flex items-center gap-3">
        <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
        <p className="text-white text-sm font-semibold">
          La IA está analizando el menú{dots}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-xs">
          {/* Logo */}
          <div className="flex justify-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center shadow-md">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-gray-900 text-center mb-1">
            Mientras tanto…
          </h1>
          <p className="text-gray-400 text-sm text-center mb-8">
            Cuéntanos dónde estáis y cómo te llamas
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Restaurant name */}
            <div className="relative">
              <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={restaurant}
                onChange={(e) => setRestaurant(e.target.value)}
                placeholder="Nombre del restaurante (opcional)"
                maxLength={60}
                autoFocus
                className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {/* User name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                maxLength={30}
                className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform shadow-md"
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Entrando…</>
                : "Entrar a la mesa"
              }
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
