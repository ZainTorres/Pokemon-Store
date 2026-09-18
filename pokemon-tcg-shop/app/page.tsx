"use client";

import { useEffect, useState, useMemo, MouseEvent } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Link from "next/link";

interface Card {
  id: string;
  name: any;
  cardNumber?: any;
  expansion?: any;
  language?: any;
  rarity?: any;
  foil?: any;
  price?: any;
  stock?: any;
  image?: any;
  hasStamp?: boolean;
}

const renderSafeText = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object") {
    return value.es || value.en || value.EN || Object.values(value)[0] || "";
  }
  return "";
};

const getLangFlag = (langStr: string): string => {
  const cleanLang = langStr.trim().toLowerCase();
  switch (cleanLang) {
    case "es":
    case "spanish":
    case "español":
      return "🇪🇸";
    case "en":
    case "english":
    case "inglés":
      return "🇺🇸";
    case "ja":
    case "jp":
    case "japanese":
    case "japonés":
      return "🇯🇵";
    default:
      return "🌐";
  }
};

export default function CarpetaPublica() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [expansion, setExpansion] = useState("all");
  const [selectedLang, setSelectedLang] = useState("all");
  const [selectedFoil, setSelectedFoil] = useState("all");
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [search, setSearch] = useState("");
  
  // Nuevo: Ordenamiento y Paginación
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "name-asc" | "price-asc" | "price-desc"
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 12; // Cantidad de cartas por página

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "cards"),
      (snapshot) => {
        const cardsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Card[];
        setCards(cardsData);
        setLoading(false);
      },
      (error) => {
        console.error("Error al obtener cartas:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const availableExpansions = useMemo(() => {
    const expansions = cards
      .map((c) => renderSafeText(c.expansion))
      .filter((exp) => exp !== "");
    return Array.from(new Set(expansions));
  }, [cards]);

  // Filtrado y Ordenamiento
  const filteredCards = useMemo(() => {
    let result = cards.filter((card) => {
      const nameStr = renderSafeText(card.name).toLowerCase();
      const numStr = renderSafeText(card.cardNumber).toLowerCase();
      const expStr = renderSafeText(card.expansion);
      const langStr = renderSafeText(card.language).toLowerCase();
      const foilStr = renderSafeText(card.foil).toLowerCase();
      const rarityStr = renderSafeText(card.rarity).toLowerCase();

      if (search && !nameStr.includes(search.toLowerCase()) && !numStr.includes(search.toLowerCase())) {
        return false;
      }
      if (expansion !== "all" && expStr !== expansion) {
        return false;
      }
      if (selectedLang !== "all" && langStr !== selectedLang.toLowerCase()) {
        return false;
      }
      if (selectedFoil !== "all" && foilStr !== selectedFoil.toLowerCase()) {
        return false;
      }
      if (selectedRarity !== "all" && rarityStr !== selectedRarity.toLowerCase()) {
        return false;
      }
      return true;
    });

    // Aplicar Ordenamiento
    result.sort((a, b) => {
      if (sortBy === "newest") {
        // Firestore IDs ordenan cronológicamente de forma natural (lexicográficamente)
        return b.id.localeCompare(a.id);
      } else if (sortBy === "name-asc") {
        return renderSafeText(a.name).localeCompare(renderSafeText(b.name));
      } else if (sortBy === "price-asc") {
        return (Number(a.price) || 0) - (Number(b.price) || 0);
      } else if (sortBy === "price-desc") {
        return (Number(b.price) || 0) - (Number(a.price) || 0);
      }
      return 0;
    });

    return result;
  }, [cards, search, expansion, selectedLang, selectedFoil, selectedRarity, sortBy]);

  // Resetear a la página 1 cuando cambien los filtros o búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [search, expansion, selectedLang, selectedFoil, selectedRarity, sortBy]);

  // Paginación lógica
  const totalPages = Math.ceil(filteredCards.length / cardsPerPage);
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * cardsPerPage;
    return filteredCards.slice(start, start + cardsPerPage);
  }, [filteredCards, currentPage]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty("--mx", `${x}%`);
    e.currentTarget.style.setProperty("--my", `${y}%`);
  };

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 space-y-6">
      <style jsx global>{`
        @keyframes entradaSmooth {
          from {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes brilloHolo {
          0% { transform: translateX(-150%) rotate(25deg); }
          100% { transform: translateX(150%) rotate(25deg); }
        }
        @keyframes pulsoBoton {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        .holo-card {
          animation: entradaSmooth 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: calc(var(--i, 0) * 0.03s);
        }
        .holo-frame::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.45), transparent);
          transform: rotate(25deg);
          pointer-events: none;
          z-index: 2;
        }
        .holo-card:hover .holo-frame::before {
          animation: brilloHolo 0.8s ease-in-out;
        }
        .holo-frame::after {
          content: "";
          position: absolute;
          inset: 0;
          opacity: 0;
          background: radial-gradient(
            circle at var(--mx, 50%) var(--my, 50%),
            rgba(255, 255, 255, 0.55),
            rgba(255, 143, 187, 0.35) 25%,
            rgba(255, 207, 130, 0.30) 45%,
            transparent 65%
          );
          mix-blend-mode: overlay;
          transition: opacity 0.25s ease;
          pointer-events: none;
          z-index: 1;
        }
        .holo-card:hover .holo-frame::after {
          opacity: 1;
        }
        .pulse-btn {
          animation: pulsoBoton 3s infinite;
        }
      `}</style>

      {/* Header Flotante y Moderno */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-pink-100/80 shadow-xs transition-all">
        <div className="mx-auto max-w-7xl px-4 py-2.5 sm:px-6 flex items-center justify-between gap-3 md:gap-6">
          
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <img
              src="/logo.svg"
              alt="Kado Store Logo"
              className="h-8 md:h-10 w-auto object-contain transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Buscador Integrado */}
          <div className="flex-1 max-w-md relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-pink-400">
              🔍
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar carta o número…"
              className="w-full rounded-full border border-pink-200/80 bg-pink-50/40 pl-9 pr-4 py-1.5 text-xs text-gray-800 placeholder-pink-300 outline-none focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-200/50 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full bg-pink-50 px-2.5 py-1 text-[11px] font-mono font-medium text-pink-600 border border-pink-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {cards.filter((c) => Number(c.stock) > 0).length} disponibles
            </span>

            <Link
              href="/admin/login"
              className="rounded-full border border-pink-200 bg-white px-3 py-1.5 text-xs font-semibold text-pink-700 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all shadow-xs"
            >
              Admin 🔒
            </Link>
          </div>
        </div>
      </header> 

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Filtros Lateral */}
        <div className="space-y-4 rounded-2xl border border-pink-200 bg-white p-4 shadow-xs md:col-span-1 h-fit">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ordenar por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full rounded-xl border border-pink-200 bg-pink-50/50 py-2 px-3 text-xs text-gray-800 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
            >
              <option value="newest">✨ Más recientes (Fecha)</option>
              <option value="name-asc">🔤 Nombre (A - Z)</option>
              <option value="price-asc">📉 Precio: Menor a Mayor</option>
              <option value="price-desc">📈 Precio: Mayor a Menor</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Expansión</label>
            <select
              value={expansion}
              onChange={(e) => setExpansion(e.target.value)}
              className="w-full rounded-xl border border-pink-200 bg-pink-50/50 py-2 px-3 text-xs text-gray-800 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all"
            >
              <option value="all">Todas las expansiones</option>
              {availableExpansions.map((exp) => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Idioma</label>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "Todos" },
                { id: "es", label: "🇪🇸 Español" },
                { id: "en", label: "🇺🇸 Inglés" },
                { id: "ja", label: "🇯🇵 Japonés" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLang(lang.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedLang === lang.id ? "bg-pink-500 text-white shadow-xs" : "bg-pink-50 text-pink-700 hover:bg-pink-100"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Brillo</label>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "all", label: "Todos" },
                { id: "normal", label: "Normal" },
                { id: "reverse", label: "Reverse Holo" },
                { id: "holo", label: "Holo" },
              ].map((foil) => (
                <button
                  key={foil.id}
                  onClick={() => setSelectedFoil(foil.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedFoil === foil.id ? "bg-pink-500 text-white shadow-xs" : "bg-pink-50 text-pink-700 hover:bg-pink-100"
                  }`}
                >
                  {foil.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Rareza Alta</label>
            <div className="flex flex-wrap gap-1">
              {[
                { id: "fullart", label: "Full Art" },
                { id: "ir", label: "IR" },
                { id: "sir", label: "SIR" },
                { id: "secreta", label: "Secreta" },
              ].map((rarity) => (
                <button
                  key={rarity.id}
                  onClick={() => setSelectedRarity(selectedRarity === rarity.id ? "all" : rarity.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedRarity === rarity.id ? "bg-pink-500 text-white shadow-xs" : "bg-pink-50 text-pink-700 hover:bg-pink-100"
                  }`}
                >
                  {rarity.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Galería */}
        <div className="space-y-4 md:col-span-3">
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <p>{filteredCards.length} cartas encontradas</p>
          </div>

          {loading ? (
            <p className="py-10 text-center text-xs text-gray-400">Cargando carpeta…</p>
          ) : filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-pink-200 bg-white p-12 text-center text-xs text-gray-500">
              No hay cartas con los filtros seleccionados.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {paginatedCards.map((carta, index) => {
                  const stockNum = Number(carta.stock) || 0;
                  const priceNum = Number(carta.price) || 0;
                  const hasStock = stockNum > 0;
                  const cardName = renderSafeText(carta.name);
                  const expansionName = renderSafeText(carta.expansion);
                  const foilText = renderSafeText(carta.foil);
                  const rarityText = renderSafeText(carta.rarity);
                  const langText = renderSafeText(carta.language);

                  const whatsappUrl = `https://wa.me/51902195561?text=${encodeURIComponent(
                    `Hola, me interesa la carta ${cardName} (${expansionName}) del catálogo, S/.${priceNum.toFixed(2)}.`
                  )}`;

                  return (
                    <div
                      key={carta.id}
                      style={{ "--i": index } as React.CSSProperties}
                      className={`holo-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-pink-100 bg-white p-3 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${
                        !hasStock ? "opacity-75" : ""
                      }`}
                    >
                      <div>
                        {/* Top Bar */}
                        <div className="flex justify-between items-center text-[11px] text-gray-400 mb-1.5 font-mono">
                          <span>#{renderSafeText(carta.cardNumber) || "—"}</span>
                          <span className="text-sm leading-none" title={langText || "EN"}>
                            {getLangFlag(langText)}
                          </span>
                        </div>

                        {/* Marco Holográfico */}
                        <div
                          onMouseMove={handleMouseMove}
                          className={`holo-frame relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-pink-50 mb-2 ${
                            !hasStock ? "grayscale-[55%] brightness-95" : ""
                          }`}
                        >
                          <div
                            className={`absolute top-2.5 -left-8 -rotate-40 px-8 py-0.5 text-[9px] font-bold font-mono tracking-wider shadow-xs z-10 ${
                              hasStock
                                ? "bg-gradient-to-r from-pink-300 to-amber-200 text-pink-950"
                                : "bg-red-500 text-white"
                            }`}
                          >
                            {hasStock ? (stockNum === 1 ? "Queda 1" : `Quedan ${stockNum}`) : "Agotada"}
                          </div>

                          {carta.image && typeof carta.image === "string" ? (
                            <img
                              src={carta.image}
                              alt={cardName}
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-pink-300">
                              Sin foto
                            </div>
                          )}

                          {carta.hasStamp && (
                            <img
                              src="/tu-sello.png"
                              alt="Sello"
                              className="absolute top-[52%] right-2 -translate-y-8.5 w-10 h-10 object-contain z-10 pointer-events-none drop-shadow-md transition-transform duration-300 group-hover:scale-110"
                            />
                          )}
                        </div>

                        {(foilText || rarityText) && (
                          <div className="flex flex-wrap justify-center gap-1 mb-2">
                            {foilText && foilText.toLowerCase() !== "normal" && (
                              <span className="inline-block rounded-md bg-pink-100 px-1.5 py-0.5 text-[9px] font-bold text-pink-700 capitalize">
                                ✨ {foilText}
                              </span>
                            )}
                            {rarityText && (
                              <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800 capitalize">
                                {rarityText}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="space-y-0.5 text-center">
                          <p className="font-bold text-xs text-gray-800 line-clamp-1 group-hover:text-pink-600 transition-colors">
                            {cardName}
                          </p>
                          <p className="text-[11px] text-gray-400 line-clamp-1">
                            {expansionName}
                          </p>
                          <p className="text-sm font-extrabold text-pink-600 font-mono pt-1">
                            S/.{priceNum.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3">
                        {hasStock ? (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full rounded-lg bg-pink-50 border border-pink-200 py-1.5 text-center text-[11px] font-semibold text-pink-600 hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all"
                          >
                            Consultar
                          </a>
                        ) : (
                          <span className="block w-full rounded-lg bg-gray-100 py-1.5 text-center text-[11px] font-semibold text-gray-400 cursor-not-allowed">
                            Vendida
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-xl border border-pink-200 bg-white px-4 py-2 text-xs font-semibold text-pink-700 hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    Anterior
                  </button>
                  <span className="text-xs font-mono font-medium text-gray-600 px-2">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-xl border border-pink-200 bg-white px-4 py-2 text-xs font-semibold text-pink-700 hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer con Redes Sociales */}
      <footer className="mt-12 rounded-2xl border border-pink-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="font-bold text-gray-800 text-base">¿Te interesa alguna?</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Escríbeme y coordinamos el envío o la entrega.
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="https://wa.me/51902195561?text=Hola%2C%20vi%20tu%20cat%C3%A1logo%20de%20cartas"
              target="_blank"
              rel="noopener noreferrer"
              className="pulse-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 to-amber-300 px-5 py-2.5 text-xs font-bold text-pink-950 shadow-md hover:scale-105 transition-all"
            >
              WhatsApp
            </a>
            <a
              href="https://instagram.com/void666__"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-pink-200 bg-pink-50 px-5 py-2.5 text-xs font-bold text-pink-600 hover:bg-pink-100 hover:border-pink-300 transition-all"
            >
              Instagram
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}