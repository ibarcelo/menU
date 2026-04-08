"use client";

import { useState, FormEvent } from "react";
import { X, Mail, Lock, User, Eye, EyeOff, Loader2, UtensilsCrossed, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Mode = "signin" | "signup";

interface Props {
  onClose: () => void;
  reason?: string;
  defaultMode?: Mode;
}

export default function AuthModal({ onClose, reason, defaultMode = "signin" }: Props) {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  function friendlyError(msg: string): string {
    if (msg.includes("Invalid login credentials")) return "Email o contraseña incorrectos.";
    if (msg.includes("Email not confirmed")) return "Confirma tu email antes de iniciar sesión. Revisa tu bandeja de entrada.";
    if (msg.includes("already registered") || msg.includes("User already registered")) return "Este email ya está registrado. Prueba a iniciar sesión.";
    if (msg.includes("Password should be")) return "La contraseña debe tener al menos 6 caracteres.";
    return msg;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (mode === "signup") {
      if (!username.trim()) { setError("El nombre de usuario es obligatorio."); return; }
      if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    }
    if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signIn(email.trim(), password);
        onClose();
      } else {
        const { needsConfirmation } = await signUp(email.trim(), password, username.trim());
        if (needsConfirmation) {
          setNeedsConfirmation(true);
        } else {
          onClose();
        }
      }
    } catch (err: unknown) {
      setError(friendlyError(err instanceof Error ? err.message : "Algo salió mal"));
    } finally {
      setLoading(false);
    }
  }

  // ── Email confirmation pending ────────────────────────
  if (needsConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-brand px-6 pt-6 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-white" />
              <span className="text-white font-black text-lg">menU</span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="px-6 py-8 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">¡Cuenta creada!</p>
              <p className="text-sm text-gray-400 mt-1">
                Hemos enviado un enlace de confirmación a{" "}
                <span className="font-medium text-gray-700">{email}</span>.
                Haz clic en él y luego inicia sesión.
              </p>
            </div>
            <button
              onClick={() => { setNeedsConfirmation(false); setMode("signin"); setPassword(""); setConfirm(""); }}
              className="w-full bg-brand text-white font-bold rounded-2xl py-4 active:scale-95 transition-transform"
            >
              Ir a iniciar sesión
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Brand bar */}
        <div className="bg-brand px-6 pt-6 pb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-white" />
            <span className="text-white font-black text-lg">menU</span>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {/* Mode tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}>
                {m === "signin" ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            ))}
          </div>

          {reason && <p className="text-sm text-gray-400 text-center mb-4 -mt-1">{reason}</p>}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {/* Username (signup only) */}
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nombre de usuario" required maxLength={30} autoFocus
                  className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors" />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email" required autoFocus={mode === "signin"}
                className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors" />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" required
                className="w-full pl-10 pr-11 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors" />
              <button type="button" onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Confirm (signup only) */}
            {mode === "signup" && (
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type={showPassword ? "text" : "password"} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar contraseña" required
                  className="w-full pl-10 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-base focus:outline-none focus:border-brand transition-colors" />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center bg-red-50 rounded-xl px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-brand text-white font-bold text-base rounded-2xl py-4 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform mt-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                mode === "signin" ? "Iniciar sesión" : "Crear cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
