"use client";

import { useEffect, useRef, useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { getSession } from "@/lib/api";
import toast from "react-hot-toast";

const MESSAGES = [
  "Identificando platos y categorías…",
  "Extrayendo precios del menú…",
  "Organizando los platos…",
  "Detectando especialidades…",
  "Casi listo, últimos retoques…",
];

interface Props {
  sessionId: string;
  restaurantName: string | null;
  onReady: (count: number) => void;
  onError: () => void;
}

export default function WaitingScreen({ sessionId, restaurantName, onReady, onError }: Props) {
  const [msgIndex, setMsgIndex] = useState(0);
  const [progress, setProgress] = useState(10);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  useEffect(() => { onReadyRef.current = onReady; }, [onReady]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  // Cycle messages
  useEffect(() => {
    const t = setInterval(() => {
      setMsgIndex((i) => Math.min(i + 1, MESSAGES.length - 1));
      setProgress((p) => Math.min(p + 15, 90));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  // Poll session
  useEffect(() => {
    const firedRef = { current: false };
    const interval = setInterval(async () => {
      if (firedRef.current) return;
      try {
        const s = await getSession(sessionId);
        if (s.status === "ready" && s.menu_item_count > 0) {
          firedRef.current = true;
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
            toast.success(`${s.menu_item_count} platos encontrados`);
            onReadyRef.current(s.menu_item_count);
          }, 300);
        } else if (s.status === "error") {
          firedRef.current = true;
          clearInterval(interval);
          toast.error("No se pudo leer el menú. Prueba con fotos más claras.");
          onErrorRef.current();
        }
      } catch { /* network blip */ }
    }, 2500);
    return () => clearInterval(interval);
  }, [sessionId]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white px-8">
      {/* Animated logo */}
      <div className="relative mb-10">
        {/* Pulsing ring */}
        <div className="absolute inset-0 rounded-3xl bg-brand opacity-20 animate-ping" />
        <div className="relative w-24 h-24 rounded-3xl bg-brand flex items-center justify-center shadow-xl">
          <UtensilsCrossed className="w-12 h-12 text-white" />
        </div>
      </div>

      {restaurantName && (
        <p className="text-brand font-bold text-base mb-2 tracking-wide">{restaurantName}</p>
      )}

      <h1 className="text-2xl font-black text-gray-900 text-center mb-2">
        Generando el menú
      </h1>
      <p className="text-gray-400 text-sm text-center mb-10 min-h-[20px] transition-all">
        {MESSAGES[msgIndex]}
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-xs bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 bg-brand rounded-full transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-300 mt-3">Suele tardar entre 10 y 20 segundos</p>
    </main>
  );
}
