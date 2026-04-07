"use client";

import { useEffect, useRef, useState, ChangeEvent, useCallback } from "react";
import { Camera, ImagePlus, X, Loader2, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { uploadMenuImages, getSession } from "@/lib/api";
import type { Session } from "@/types";
import toast from "react-hot-toast";

interface Props {
  sessionId: string;
  session: Session;
  isHost: boolean;
  onSessionUpdate: (updates: Partial<Session>) => void;
  onMenuReady: () => void;
}

const MAX_IMAGES = 5;

export default function ScanTab({ sessionId, session, onSessionUpdate, onMenuReady }: Props) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const firedRef = useRef(false); // prevents duplicate toasts

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (session.status !== "processing") {
      stopPolling();
      return;
    }

    firedRef.current = false; // reset when a new scan starts
    if (pollRef.current) return; // already polling

    pollRef.current = setInterval(async () => {
      if (firedRef.current) return; // already handled
      try {
        const updated = await getSession(sessionId);
        if (updated.status === "ready" && updated.menu_item_count > 0) {
          firedRef.current = true;
          stopPolling();
          onSessionUpdate(updated);
          toast.success(`${updated.menu_item_count} dishes found!`);
          onMenuReady();
        } else if (updated.status === "error") {
          firedRef.current = true;
          stopPolling();
          onSessionUpdate(updated);
          toast.error("Could not read the menu. Try again with clearer photos.");
        }
      } catch {
        // network blip, keep polling
      }
    }, 2500);

    return stopPolling;
  }, [session.status, sessionId, onSessionUpdate, onMenuReady, stopPolling]);

  // ── File selection ─────────────────────────────────────────────
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).slice(0, MAX_IMAGES - images.length);
    const combined = [...images, ...newFiles].slice(0, MAX_IMAGES);
    setImages(combined);

    newFiles.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews((prev) => {
          const next = [...prev];
          next[images.length + i] = e.target?.result as string;
          return next.slice(0, MAX_IMAGES);
        });
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Upload + trigger AI ────────────────────────────────────────
  async function handleProcess() {
    if (images.length === 0) return;
    setUploading(true);
    onSessionUpdate({ status: "processing" });
    try {
      await uploadMenuImages(sessionId, images);
      setImages([]);
      setPreviews([]);
    } catch (err) {
      toast.error("Upload failed. Check your connection.");
      onSessionUpdate({ status: "scanning" });
      console.error(err);
    } finally {
      setUploading(false);
    }
  }

  const isProcessing = session.status === "processing" || uploading;

  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <h2 className="text-xl font-black mb-1">Scan the menu</h2>
      <p className="text-gray-400 text-sm mb-6">
        Take photos of each page — AI will extract all dishes automatically
      </p>

      {/* Processing state */}
      {isProcessing && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Reading your menu…</p>
            <p className="text-amber-600 text-xs mt-0.5">AI is extracting dishes. Usually 10–20 seconds.</p>
          </div>
        </div>
      )}

      {/* Success */}
      {session.status === "ready" && session.menu_item_count > 0 && !isProcessing && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800 text-sm">
              {session.menu_item_count} dishes found
            </p>
            <p className="text-green-600 text-xs mt-0.5">Menu tab is ready</p>
          </div>
          <button
            onClick={onMenuReady}
            className="bg-green-600 text-white text-xs font-bold px-3 py-2 rounded-xl"
          >
            Go to Menu →
          </button>
        </div>
      )}

      {/* Error */}
      {session.status === "error" && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-red-800 text-sm">Could not read menu</p>
            <p className="text-red-600 text-xs mt-0.5">Try again with clearer photos in good lighting</p>
          </div>
        </div>
      )}

      {/* Image previews */}
      {previews.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {previews.map((src, i) => (
            <div key={i} className="relative shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`Page ${i + 1}`} className="w-24 h-32 object-cover rounded-xl border border-gray-200" />
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {previews.length < MAX_IMAGES && (
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="shrink-0 w-24 h-32 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-1"
            >
              <ImagePlus className="w-5 h-5" />
              <span className="text-xs">Add</span>
            </button>
          )}
        </div>
      )}

      {/* Buttons */}
      {!isProcessing && (
        <div className="flex flex-col gap-3">
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />
          <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files)} />

          {previews.length === 0 ? (
            <>
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex items-center justify-center gap-3 bg-brand text-white font-bold text-lg rounded-2xl py-5 active:scale-95 transition-transform shadow"
              >
                <Camera className="w-6 h-6" />
                Take a photo
              </button>
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="flex items-center justify-center gap-3 bg-gray-100 text-gray-700 font-semibold text-lg rounded-2xl py-5 active:bg-gray-200 transition-colors"
              >
                <ImagePlus className="w-6 h-6" />
                Choose from gallery
              </button>
            </>
          ) : (
            <button
              onClick={handleProcess}
              disabled={uploading}
              className="flex items-center justify-center gap-3 bg-brand text-white font-bold text-lg rounded-2xl py-5 disabled:opacity-60 active:scale-95 transition-transform shadow"
            >
              <Upload className="w-6 h-6" />
              Extract Menu ({images.length} photo{images.length !== 1 ? "s" : ""})
            </button>
          )}
        </div>
      )}

      <p className="mt-6 text-xs text-gray-300 text-center">
        Up to {MAX_IMAGES} photos per scan · JPEG, PNG, HEIC supported
      </p>
    </div>
  );
}
