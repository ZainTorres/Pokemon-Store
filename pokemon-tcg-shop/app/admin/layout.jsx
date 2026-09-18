// Ubicación en tu proyecto: app/admin/login/admin-layout.jsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function AdminLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (loading) return;
    if (!user && !isLoginPage) {
      router.replace("/admin/login");
    }
    if (user && isLoginPage) {
      router.replace("/admin/dashboard");
    }
  }, [user, loading, isLoginPage, router]);

  // La propia página de login se muestra sin esperar el chequeo de sesión
  if (isLoginPage) return children;

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-fairy-cream">
        <Loader2 className="animate-spin text-fairy-deep" size={28} />
      </div>
    );
  }

  return children;
}
