// Ubicación en tu proyecto: components/OfferBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export default function OfferBanner() {
  const [banner, setBanner] = useState<any>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "banner"), (snap) => {
      setBanner(snap.exists() ? snap.data() : null);
    });
    return () => unsub();
  }, []);

  if (!banner || !banner.active) return null; // sin banner configurado: no se muestra nada

  const content = (
    <div
      className="relative flex h-32 w-full items-center overflow-hidden rounded-2xl border border-kado-border bg-kado-surface shadow-sm sm:h-36 md:h-40"
      style={
        banner.imageUrl
          ? { backgroundImage: `url(${banner.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      <div className="absolute inset-0 bg-gradient-to-r from-kado-bg via-kado-bg/75 to-kado-deep/40" />
      <div className="relative z-10 max-w-lg px-6">
        {banner.title && (
          <h3 className="text-lg font-extrabold text-kado-text sm:text-xl">{banner.title}</h3>
        )}
        {banner.subtitle && <p className="mt-1 text-xs text-kado-soft sm:text-sm">{banner.subtitle}</p>}
      </div>
    </div>
  );

  if (banner.link) {
    return (
      <a href={banner.link} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}
