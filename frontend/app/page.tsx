"use client";

import { useRef, useState, useEffect, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSession, uploadMenuImages, joinSession, getSession } from "@/lib/api";
import { getStorageKey } from "@/types";
import toast from "react-hot-toast";
import {
  UtensilsCrossed, Camera, ImagePlus,
  ChevronRight, UserCircle2, Loader2, X, Store, User,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "@/components/auth/AuthModal";
import { supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [previews, setPreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [launching, setLaunching] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // Setup overlay
  const [showSetup, setShowSetup] = useState(false);
  const [setupName, setSetupName] = useState("");
  const [setupRestaurant, setSetupRestaurant] = useState("");
  const [setupError, setSetupError] = useState("");
  const [dots, setDots] = useState(".");
  const sessionTaskRef = useRef<Promise<{ id: string } | null> | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const username: string = user
    ? (user.user_metadata?.username || user.email?.split("@")[0] || "")
    : "";

  // Animated dots for the "AI working" banner
  useEffect(() => {
    if (!showSetup) return;
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 600);
    return () => clearInterval(t);
  }, [showSetup]);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const selected = Array.from(fileList).slice(0, 5);
    setFiles(selected);
    setPreviews([]);
    selected.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setPreviews((prev) => { const n = [...prev]; n[i] = e.target?.result as string; return n; });
      reader.readAsDataURL(file);
    });
  }

  function removeFile(i: number) {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    setPreviews((p) => p.filter((_, idx) => idx !== i));
  }

  // Tap "Extraer menú" → show setup form immediately, start session in background
  function handleLaunch() {
    if (files.length === 0) return;

    // Fire session creation + upload in background — don't await
    const capturedFiles = files;
    sessionTaskRef.current = createSession()
      .then((session) => {
        uploadMenuImages(session.id, capturedFiles).catch(() => {});
        return session;
      })
      .catch(() => null);

    setSetupName(username);
    setSetupRestaurant("");
    setSetupError("");
    setDots(".");
    setShowSetup(true);
  }

  async function handleSetupSubmit(e: FormEvent) {
    e.preventDefault();
    const trimName = setupName.trim();
    const trimRestaurant = setupRestaurant.trim();
    if (!trimName) { setSetupError("Introduce tu nombre"); return; }

    setLaunching(true);
    try {
      const session = await sessionTaskRef.current;
      if (!session) {
        toast.error("No se pudo crear la sesión. Inténtalo de nuevo.");
        setShowSetup(false);
        setLaunching(false);
        return;
      }

      const keys = getStorageKey(session.id);
      localStorage.setItem(keys.isHost, "true");

      if (trimRestaurant) {
        await supabase.from("sessions").update({ restaurant: trimRestaurant }).eq("id", session.id);
      }

      const participant = await joinSession(session.id, trimName);
      localStorage.setItem(keys.participantId, participant.id);
      localStorage.setItem(keys.participantName, participant.name);

      // Check if AI already finished while user was filling the form
      const current = await getSession(session.id).catch(() => null);
      const isReady = current?.status === "ready" && (current?.menu_item_count ?? 0) > 0;

      router.push(`/s/${session.id}${isReady ? "" : "?wait=1"}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("unique") || msg.includes("taken")) {
        setSetupError("Ese nombre ya está en uso. Prueba otro.");
      } else {
        toast.error("No se pudo crear la sesión. Inténtalo de nuevo.");
      }
      setLaunching(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-brand animate-spin" />
      </div>
    );
  }

  // ── Setup screen (shown immediately after tapping "Extraer menú") ──
  if (showSetup) {
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

            <form onSubmit={handleSetupSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <Store className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={setupRestaurant}
                  onChange={(e) => setSetupRestaurant(e.target.value)}
                  placeholder="Nombre del restaurante (opcional)"
                  maxLength={60}
                  autoFocus
                  className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  placeholder="Tu nombre"
                  maxLength={30}
                  className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors"
                />
              </div>

              {setupError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2 text-center">{setupError}</p>
              )}

              <button
                type="submit"
                disabled={launching || !setupName.trim()}
                className="w-full bg-brand text-white font-bold text-lg rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform shadow-md"
              >
                {launching
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Entrando…</>
                  : "Entrar a la mesa"
                }
              </button>

              <button
                type="button"
                onClick={() => { setShowSetup(false); setLaunching(false); }}
                className="text-sm text-gray-400 text-center py-1"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // ── Home screen ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-12 pb-6">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center shadow">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-xl text-gray-900">menU</span>
        </div>

        {user ? (
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 bg-orange-50 border-2 border-orange-100 rounded-2xl px-3 py-2 active:scale-95 transition-transform"
          >
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-white font-black text-sm shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-gray-900 leading-tight">{username}</p>
              <p className="text-xs text-gray-400 leading-tight">Mi perfil</p>
            </div>
            <ChevronRight className="w-4 h-4 text-brand" />
          </button>
        ) : (
          <button
            onClick={() => setShowAuth(true)}
            className="flex items-center gap-1.5 bg-gray-100 text-gray-600 text-sm font-semibold px-3.5 py-2 rounded-full"
          >
            <UserCircle2 className="w-4 h-4" />
            Entrar
          </button>
        )}
      </div>

      {/* Hero */}
      <div className="px-5 pb-8">
        <h1 className="text-3xl font-black text-gray-900 leading-tight">
          Escanea el menú,<br />pide juntos
        </h1>
        <p className="text-gray-400 mt-1.5 text-base">
          La IA extrae todos los platos automáticamente
        </p>
      </div>

      {/* Main action area */}
      <div className="px-5 flex-1">
        {previews.length === 0 ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-3 bg-brand text-white font-bold text-xl rounded-3xl py-7 active:scale-95 transition-transform shadow-lg shadow-orange-200"
            >
              <Camera className="w-8 h-8" />
              Fotografiar el menú
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex items-center justify-center gap-3 bg-gray-100 text-gray-700 font-semibold text-lg rounded-2xl py-5 active:scale-95 transition-colors hover:bg-gray-200"
            >
              <ImagePlus className="w-6 h-6" />
              Elegir de la galería
            </button>

            {!user && (
              <p className="text-xs text-center text-gray-400 mt-3">
                <button onClick={() => setShowAuth(true)} className="underline text-gray-500 font-medium">
                  Inicia sesión
                </button>{" "}
                para guardar tus visitas y notas
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Preview strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {previews.map((src, i) => (
                <div key={i} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${i + 1}`}
                    className="w-24 h-32 object-cover rounded-2xl border-2 border-gray-100" />
                  <button onClick={() => removeFile(i)}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {previews.length < 5 && (
                <button onClick={() => galleryRef.current?.click()}
                  className="shrink-0 w-24 h-32 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-1">
                  <ImagePlus className="w-5 h-5" />
                  <span className="text-xs">Añadir</span>
                </button>
              )}
            </div>

            <button
              onClick={handleLaunch}
              className="w-full flex items-center justify-center gap-3 bg-brand text-white font-bold text-lg rounded-2xl py-5 active:scale-95 transition-transform shadow-lg shadow-orange-200"
            >
              <Camera className="w-6 h-6" /> Extraer menú ({files.length} foto{files.length !== 1 ? "s" : ""})
            </button>

            <button onClick={() => { setFiles([]); setPreviews([]); }}
              className="text-sm text-gray-400 text-center py-1">
              Cancelar
            </button>
          </div>
        )}
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />

      <div className="h-10" />

      {showAuth && (
        <AuthModal
          reason="Guarda tus visitas y construye tu historial gastronómico."
          onClose={() => setShowAuth(false)}
        />
      )}
    </main>
  );
}
