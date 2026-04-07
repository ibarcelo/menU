"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/api";
import { getStorageKey } from "@/types";
import toast from "react-hot-toast";
import { UtensilsCrossed, Users, QrCode, Zap } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const session = await createSession();
      // Mark this browser as host
      const keys = getStorageKey(session.id);
      localStorage.setItem(keys.isHost, "true");
      router.push(`/s/${session.id}`);
    } catch (err) {
      toast.error("Could not create session. Try again.");
      console.error(err);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-white">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand mb-4 shadow-lg">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">menU</h1>
        <p className="mt-2 text-gray-500 text-base">
          Scan a menu. Order together.
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full max-w-xs bg-brand text-white font-bold text-lg rounded-2xl py-4 shadow-md active:scale-95 transition-transform disabled:opacity-60"
      >
        {loading ? "Creating…" : "Start a New Table"}
      </button>

      <p className="mt-4 text-sm text-gray-400">No login required</p>

      {/* Feature pills */}
      <div className="mt-12 grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          { icon: Zap, label: "AI menu scan" },
          { icon: Users, label: "Collaborative" },
          { icon: QrCode, label: "Share via QR" },
          { icon: UtensilsCrossed, label: "Real-time orders" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600 font-medium"
          >
            <Icon className="w-4 h-4 text-brand" />
            {label}
          </div>
        ))}
      </div>
    </main>
  );
}
