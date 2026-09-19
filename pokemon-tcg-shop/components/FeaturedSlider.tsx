// Ubicación en tu proyecto: components/FeaturedSlider.tsx
// (mismo nombre de archivo/componente que ya tenías importado en app/page.tsx,
// así no hay que tocar nada más — solo reemplazar el contenido de este archivo)
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Sparkles } from "lucide-react";

const renderSafeText = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") return value.es || value.en || value.EN || Object.values(value)[0] || "";
  return "";
};

export default function FeaturedSlider() {
  const [items, setItems] = useState<any[]>([]);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "cards"), where("featured", "==", true));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  if (items.length === 0) return null; // sin destacados: la sección no se muestra

  // Duplicamos la lista para que el loop sea perfectamente continuo (sin salto al reiniciar)
  const loopItems = [...items, ...items];
  const durationSeconds = Math.max(items.length * 5, 18);

  return (
    <section className="relative py-6">
      <style jsx>{`
        @keyframes kadoMarquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div className="mb-4 text-center">
        <h2 className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-kado-soft">
          <Sparkles size={14} />
          DESTACADOS
        </h2>
      </div>

      {/* contenedor con máscara de desvanecido en los bordes, sin cortes bruscos */}
      <div
        className="relative overflow-hidden"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
          maskImage: "linear-gradient(90deg, transparent, black 8%, black 92%, transparent)",
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex w-max gap-4 sm:gap-5"
          style={{
            animationName: "kadoMarquee",
            animationDuration: `${durationSeconds}s`,
            animationTimingFunction: "linear",
            animationIterationCount: "infinite",
            animationPlayState: paused ? "paused" : "running",
          }}
        >
          {loopItems.map((item, i) => {
            const name = renderSafeText(item.name);
            const price = Number(item.price) || 0;
            const stock = Number(item.stock) || 0;
            return (
              <div
                key={`${item.id}-${i}`}
                className="group w-32 shrink-0 sm:w-40 md:w-48"
              >
                <div className="relative overflow-hidden rounded-xl border border-kado-border bg-kado-surface p-1.5 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] transition-all duration-300 group-hover:border-kado group-hover:shadow-[0_14px_32px_-12px_rgba(123,142,200,0.4)]">
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-kado-bg">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={name}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-kado-muted">
                        Sin foto
                      </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-kado-bg/85 via-transparent to-transparent" />
                    <span
                      className={`absolute bottom-1 left-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                        stock > 0 ? "bg-emerald-400/90 text-kado-bg" : "bg-rose-500/90 text-white"
                      }`}
                    >
                      {stock > 0 ? `${stock} disp.` : "Agotado"}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 truncate text-center text-xs font-semibold text-kado-text">{name}</p>
                <p className="text-center font-mono text-sm font-bold text-kado-soft">
                  S/.{price.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}