// Ubicación en tu proyecto: app/admin/login/login-page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sparkles, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/admin/dashboard");
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-fairy-cream px-4 font-body">
      <div className="w-full max-w-sm rounded-3xl border border-fairy-sleeve bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-fairy-page text-fairy-deep">
            <Sparkles size={22} />
          </div>
          <h1 className="font-display text-2xl text-fairy-ink">Panel de administración</h1>
          <p className="mt-1 text-sm text-fairy-muted">Inicia sesión para gestionar el inventario.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-fairy-muted">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@tutienda.com"
              className="w-full rounded-xl border border-fairy-sleeve bg-fairy-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fairy-soft"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fairy-muted">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-fairy-sleeve bg-fairy-cream px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-fairy-soft"
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-fairy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fairy-deep disabled:opacity-60"
          >
            {loading && <Loader2 className="animate-spin" size={16} />}
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function friendlyError(code) {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Correo o contraseña incorrectos.";
    case "auth/too-many-requests":
      return "Demasiados intentos. Espera un momento e inténtalo de nuevo.";
    case "auth/invalid-email":
      return "Ese correo no parece válido.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}
