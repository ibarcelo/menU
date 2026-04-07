"use client";

import { useState, FormEvent } from "react";
import { UtensilsCrossed } from "lucide-react";

interface Props {
  sessionId: string;
  restaurant: string | null;
  onJoin: (name: string) => Promise<void>;
}

export default function NameGate({ restaurant, onJoin }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

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
    <main className="min-h-screen flex flex-col items-center justify-center px-5 bg-white">
      <div className="w-full max-w-xs">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-brand flex items-center justify-center shadow">
            <UtensilsCrossed className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-black text-center text-gray-900 mb-1">
          {restaurant ? `Join "${restaurant}"` : "Join the Table"}
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8">
          Enter your name to see the menu and place your order
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={30}
            autoFocus
            className="w-full text-lg border-2 border-gray-200 rounded-2xl px-4 py-3.5 focus:outline-none focus:border-brand transition-colors"
          />
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {loading ? "Joining…" : "Join"}
          </button>
        </form>
      </div>
    </main>
  );
}
