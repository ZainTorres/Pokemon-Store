// Ubicación en tu proyecto: app/admin/login/login-page.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Sparkles, Loader2, ShieldAlert } from "lucide-react";
import Link from "next/link";

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
    <div className="min-h-screen bg-[var(--color-kado-bg)] text-[var(--color-kado-text)] flex flex-col">
      {/* HEADER UNIFICADO */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[var(--color-kado-surface)]/85 border-b border-[var(--color-kado-border)] shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.svg" alt="Kado Store" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>
          <Link href="/" className="text-xs font-semibold text-[var(--color-kado-soft)] hover:underline">
            ← Volver al catálogo
          </Link>
        </div>
      </header>

      {/* CONTENIDO LOGIN */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-3xl border border-[var(--color-kado-border)] bg-[var(--color-kado-surface)] p-8 shadow-2xl">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-kado)]/20 text-[var(--color-kado-soft)] border border-[var(--color-kado-border)]">
              <Sparkles size={26} />
            </div>
            <h1 className="text-xl font-extrabold text-[var(--color-kado-text)]">Panel de administración</h1>
            <p className="mt-1 text-xs text-[var(--color-kado-muted)]">Inicia sesión para gestionar el inventario Kado.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-kado-muted)]">Correo electrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@kado.com"
                className="w-full rounded-xl border border-[var(--color-kado-border)] bg-[var(--color-kado-bg)] px-3.5 py-2.5 text-xs text-[var(--color-kado-text)] placeholder-[var(--color-kado-muted)] outline-none focus:border-[var(--color-kado)] focus:ring-1 focus:ring-[var(--color-kado)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-kado-muted)]">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-[var(--color-kado-border)] bg-[var(--color-kado-bg)] px-3.5 py-2.5 text-xs text-[var(--color-kado-text)] placeholder-[var(--color-kado-muted)] outline-none focus:border-[var(--color-kado)] focus:ring-1 focus:ring-[var(--color-kado)]"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-2.5 text-xs text-rose-400">
                <ShieldAlert size={16} shrink-0 />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-kado)] py-2.5 text-xs font-bold text-gray-950 hover:bg-[var(--color-kado-soft)] transition-colors disabled:opacity-60 shadow-md cursor-pointer"
            >
              {loading && <Loader2 className="animate-spin" size={16} />}
              {loading ? "Verificando acceso…" : "Entrar al Dashboard"}
            </button>
          </form>
        </div>
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
      return "Demasiados intentos. Espera un momento.";
    case "auth/invalid-email":
      return "El formato del correo no es válido.";
    default:
      return "No se pudo iniciar sesión. Intenta de nuevo.";
  }
}