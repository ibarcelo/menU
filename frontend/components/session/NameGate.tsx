"use client";

import { useState, FormEvent } from "react";
import { UtensilsCrossed, Loader2 } from "lucide-react";
import type { SessionStatus } from "@/types";

interface Props {
  sessionId: string;
  restaurant: string | null;
  defaultName?: string;
  sessionStatus?: SessionStatus;
  onJoin: (name: string) => Promise<void>;
}

export default function NameGate({ restaurant, defaultName = "", sessionStatus, onJoin }: Props) {
  const [name, setName] = useState(defaultName);
  const [loading, setLoading] = useState(false);

  const isProcessing = sessionStatus === "processing" || sessionStatus === "scanning";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      await onJoin(trimmed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* AI processing banner — visible while scan is running */}
      {isProcessing && (
        <div className="bg-amber-500 px-5 py-3 flex items-center gap-3 safe-top">
          <Loader2 className="w-4 h-4 text-white animate-spin shrink-0" />
          <p className="text-white text-sm font-semibold">
            La IA está leyendo el menú… (~15 seg)
          </p>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-xs">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center shadow">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-center text-gray-900 mb-1">
            {restaurant ? `"${restaurant}"` : "¡Ya estamos!"}
          </h1>
          <p className="text-center text-gray-400 text-sm mb-8">
            {isProcessing
              ? "Pon tu nombre mientras terminamos de leer el menú"
              : "Introduce tu nombre para ver el menú y hacer tu pedido"}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={30}
              autoFocus={!defaultName}
              className="w-full text-lg border-2 border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand transition-colors"
            />
            <button
              type="submit"
              disabled={!name.trim() || loading}
              className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 disabled:opacity-50 active:scale-95 transition-transform"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Uniéndose…
                </span>
              ) : isProcessing ? (
                "Entrar y esperar el menú"
              ) : (
                "Entrar"
              )}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
