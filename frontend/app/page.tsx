"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/lib/api";
import { getStorageKey } from "@/types";
import toast from "react-hot-toast";
import {
  UtensilsCrossed,
  ArrowLeft,
  Loader2,
  ChevronRight,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "@/components/auth/AuthModal";

type View = "home" | "guest";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [view, setView] = useState<View>("home");
  const [restaurant, setRestaurant] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  async function handleCreate() {
    setCreating(true);
    try {
      const session = await createSession(restaurant.trim() || undefined);
      const keys = getStorageKey(session.id);
      localStorage.setItem(keys.isHost, "true");
      router.push(`/s/${session.id}`);
    } catch (err) {
      toast.error("Could not create session. Try again.");
      console.error(err);
      setCreating(false);
    }
  }

  // ── Signed-in home ─────────────────────────────────────
  if (!authLoading && user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-white">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand mb-4 shadow-lg">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">menU</h1>
          <p className="mt-1 text-gray-400 text-sm">
            Hola, <span className="font-medium text-gray-600">{user.email?.split("@")[0]}</span>
          </p>
        </div>

        {/* Start table form */}
        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
            placeholder="Nombre del restaurante (opcional)"
            maxLength={60}
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-brand transition-colors bg-white"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 shadow-md active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Nueva mesa"}
          </button>
        </div>

        {/* Big profile button */}
        <button
          onClick={() => router.push("/profile")}
          className="mt-5 w-full max-w-xs flex items-center gap-4 bg-orange-50 border-2 border-orange-100 rounded-2xl px-5 py-4 active:scale-95 transition-transform hover:bg-orange-100"
        >
          <div className="w-11 h-11 rounded-full bg-brand flex items-center justify-center text-white font-black text-lg shrink-0">
            {user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="font-black text-gray-900 text-base">Mi perfil</p>
            <p className="text-sm text-gray-400 truncate">Ver mis visitas y notas</p>
          </div>
          <ChevronRight className="w-5 h-5 text-brand shrink-0" />
        </button>
      </main>
    );
  }

  // ── Guest flow: enter restaurant name ──────────────────
  if (view === "guest") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-white">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand mb-4 shadow-lg">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-gray-900">menU</h1>
          <p className="mt-2 text-gray-500 text-base">¿Dónde estás comiendo hoy?</p>
        </div>

        <div className="w-full max-w-xs flex flex-col gap-3">
          <input
            type="text"
            value={restaurant}
            onChange={(e) => setRestaurant(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !creating && handleCreate()}
            placeholder="Nombre del restaurante (opcional)"
            maxLength={60}
            autoFocus
            className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base focus:outline-none focus:border-brand transition-colors bg-white"
          />
          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 shadow-md active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Nueva mesa"}
          </button>
          <button
            onClick={() => setView("home")}
            className="flex items-center justify-center gap-1.5 text-sm text-gray-400 py-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        </div>
      </main>
    );
  }

  // ── Default home: sign in primary, guest secondary ─────
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-5 py-12 bg-white">
      {/* Logo */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand mb-4 shadow-lg">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">menU</h1>
        <p className="mt-2 text-gray-500 text-base">Escanea el menú. Pedid juntos.</p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* Primary: sign in */}
        <button
          onClick={() => setShowAuth(true)}
          disabled={authLoading}
          className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 shadow-md active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <UserCircle2 className="w-5 h-5" />
          Iniciar sesión / Registrarse
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">o</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Secondary: guest */}
        <button
          onClick={() => setView("guest")}
          className="w-full bg-gray-100 text-gray-700 font-semibold text-base rounded-2xl py-4 active:scale-95 transition-transform hover:bg-gray-200"
        >
          Continuar sin cuenta
        </button>
      </div>

      <p className="mt-5 text-xs text-center text-gray-400 max-w-xs">
        Inicia sesión para guardar tu historial de visitas y notas.
      </p>

      {showAuth && (
        <AuthModal
          reason="Guarda tus visitas y construye tu historial gastronómico."
          onClose={() => setShowAuth(false)}
        />
      )}
    </main>
  );
}
