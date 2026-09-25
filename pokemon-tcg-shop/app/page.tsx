// Ubicación en tu proyecto: app/page.tsx
"use client";

import { useEffect, useState, useMemo, useRef, MouseEvent } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { Search, ShieldCheck, ArrowRight } from "lucide-react";
import FeaturedSlider from "@/components/FeaturedSlider";
import OfferBanner from "@/components/OfferBanner";

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
  featured?: boolean;
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
  const catalogRef = useRef<HTMLDivElement>(null);

  // Filtros
  const [expansion, setExpansion] = useState("all");
  const [selectedLang, setSelectedLang] = useState("all");
  const [selectedFoil, setSelectedFoil] = useState("all");
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [search, setSearch] = useState("");

  // ── Ordenamiento por defecto: precio mayor → menor ──
  const [sortBy, setSortBy] = useState("price-desc");
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 12;

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
      if (expansion !== "all" && expStr !== expansion) return false;
      if (selectedLang !== "all" && langStr !== selectedLang.toLowerCase()) return false;
      if (selectedFoil !== "all" && foilStr !== selectedFoil.toLowerCase()) return false;
      if (selectedRarity !== "all" && rarityStr !== selectedRarity.toLowerCase()) return false;
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === "newest") {
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, expansion, selectedLang, selectedFoil, selectedRarity, sortBy]);

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

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-kado-bg">
      <style jsx global>{`
        @keyframes entradaSmooth {
          from { opacity: 0; transform: translateY(18px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes brilloHolo {
          0% { transform: translateX(-150%) rotate(25deg); }
          100% { transform: translateX(150%) rotate(25deg); }
        }
        @keyframes pulsoBoton {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
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
          background: linear-gradient(90deg, transparent, rgba(238, 242, 255, 0.35), transparent);
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
            rgba(238, 242, 255, 0.45),
            rgba(123, 142, 200, 0.35) 25%,
            rgba(82, 99, 156, 0.30) 45%,
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
        .float-slow {
          animation: floatSlow 5s ease-in-out infinite;
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 w-full border-b border-kado-border bg-kado-surface/80 backdrop-blur-md transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 md:gap-6">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <img
              src="/logo.svg"
              alt="Kado Store Logo"
              className="h-8 w-auto object-contain transition-transform group-hover:scale-105 md:h-10"
            />
          </Link>

          <div className="relative max-w-md flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-kado-muted">
              <Search size={14} />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar carta o número…"
              className="w-full rounded-full border border-kado-border bg-kado-bg/60 py-1.5 pl-9 pr-4 text-xs text-kado-text outline-none placeholder:text-kado-muted transition-all focus:border-kado focus:bg-kado-bg focus:ring-2 focus:ring-kado/30"
            />
          </div>

          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <span className="hidden items-center gap-1.5 rounded-full border border-kado-border bg-kado-bg/40 px-2.5 py-1 text-[11px] font-mono font-medium text-kado-soft lg:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              {cards.filter((c) => Number(c.stock) > 0).length} disponibles
            </span>

            <Link
              href="/admin/login"
              className="flex items-center gap-1 rounded-full border border-kado-border bg-kado-surface px-3 py-1.5 text-xs font-semibold text-kado-soft transition-all hover:border-kado hover:bg-kado hover:text-kado-bg"
            >
              <ShieldCheck size={13} /> Admin
            </Link>
          </div>
        </div>
      </header>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(123,142,200,0.22),transparent_70%)]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-kado/20 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-4 pb-4 pt-16 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-kado-border bg-kado-surface/60 px-3 py-1 text-[11px] font-semibold text-kado-soft">
            Cartas originales · ES / EN / JA
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight text-kado-text sm:text-5xl">
            Encuentra tu próxima{" "}
            <span className="bg-gradient-to-r from-kado-soft to-kado bg-clip-text text-transparent">
              carta especial
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-kado-muted sm:text-base">
            Explora el catálogo, filtra por expansión, idioma y rareza, y consulta
            directamente por WhatsApp la carta que te interesa.
          </p>
          <button
            onClick={scrollToCatalog}
            className="pulse-btn mt-7 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-kado to-kado-soft px-6 py-2.5 text-sm font-bold text-kado-bg shadow-lg shadow-kado/20 transition-transform hover:scale-105"
          >
            Explorar catálogo <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-6">
        <div className="float-slow">
          <FeaturedSlider />
        </div>

        <OfferBanner />

        <div ref={catalogRef} className="grid scroll-mt-20 grid-cols-1 gap-6 md:grid-cols-4">
          {/* Filtros Lateral */}
          <div className="h-fit space-y-4 rounded-2xl border border-kado-border bg-kado-surface p-4 shadow-sm md:col-span-1">
            <div>
              <label className="mb-1 block text-xs font-semibold text-kado-text">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full rounded-xl border border-kado-border bg-kado-bg/60 px-3 py-2 text-xs text-kado-text outline-none transition-all focus:border-kado focus:ring-1 focus:ring-kado"
              >
                <option value="price-desc">📈 Precio: Mayor a Menor</option>
                <option value="price-asc">📉 Precio: Menor a Mayor</option>
                <option value="newest">✨ Más recientes</option>
                <option value="name-asc">🔤 Nombre (A - Z)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-kado-text">Expansión</label>
              <select
                value={expansion}
                onChange={(e) => setExpansion(e.target.value)}
                className="w-full rounded-xl border border-kado-border bg-kado-bg/60 px-3 py-2 text-xs text-kado-text outline-none transition-all focus:border-kado focus:ring-1 focus:ring-kado"
              >
                <option value="all">Todas las expansiones</option>
                {availableExpansions.map((exp) => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-kado-text">Idioma</label>
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
                      selectedLang === lang.id
                        ? "bg-kado text-kado-bg shadow-xs"
                        : "bg-kado-bg/60 text-kado-soft hover:bg-kado-border"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-kado-text">Brillo</label>
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
                      selectedFoil === foil.id
                        ? "bg-kado text-kado-bg shadow-xs"
                        : "bg-kado-bg/60 text-kado-soft hover:bg-kado-border"
                    }`}
                  >
                    {foil.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-kado-text">Rareza Alta</label>
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
                      selectedRarity === rarity.id
                        ? "bg-kado text-kado-bg shadow-xs"
                        : "bg-kado-bg/60 text-kado-soft hover:bg-kado-border"
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
            <div className="flex items-center justify-between px-1 text-xs text-kado-muted">
              <p>{filteredCards.length} cartas encontradas</p>
            </div>

            {loading ? (
              <p className="py-10 text-center text-xs text-kado-muted">Cargando carpeta…</p>
            ) : filteredCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-kado-border bg-kado-surface p-12 text-center text-xs text-kado-muted">
                No hay cartas con los filtros seleccionados.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
                        className={`holo-card group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-kado-border bg-kado-surface p-3 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)] transition-all duration-300 hover:-translate-y-1.5 hover:border-kado/60 hover:shadow-[0_18px_40px_-14px_rgba(123,142,200,0.35)] ${
                          !hasStock ? "opacity-70" : ""
                        }`}
                      >
                        <div>
                          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-kado-muted">
                            <span>#{renderSafeText(carta.cardNumber) || "—"}</span>
                            <span className="text-sm leading-none" title={langText || "EN"}>
                              {getLangFlag(langText)}
                            </span>
                          </div>

                          <div
                            onMouseMove={handleMouseMove}
                            className={`holo-frame relative mb-2 aspect-[3/4] w-full overflow-hidden rounded-xl bg-kado-bg ${
                              !hasStock ? "grayscale-[55%] brightness-90" : ""
                            }`}
                          >
                            <div
                              className={`absolute top-2.5 -left-8 z-10 -rotate-40 px-8 py-0.5 font-mono text-[9px] font-bold tracking-wider shadow-xs ${
                                hasStock
                                  ? "bg-gradient-to-r from-kado to-kado-soft text-kado-bg"
                                  : "bg-rose-500 text-white"
                              }`}
                            >
                              {hasStock ? (stockNum === 1 ? "Queda 1" : `Quedan ${stockNum}`) : "Agotada"}
                            </div>

                            {carta.image && typeof carta.image === "string" ? (
                              <img
                                src={carta.image}
                                alt={cardName}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-kado-muted">
                                Sin foto
                              </div>
                            )}

                            {carta.hasStamp && (
                              <img
                                src="/tu-sello.png"
                                alt="Sello"
                                className="absolute top-[52%] right-2 z-10 h-10 w-10 -translate-y-8.5 object-contain pointer-events-none drop-shadow-md transition-transform duration-300 group-hover:scale-110"
                              />
                            )}
                          </div>

                          {(foilText || rarityText) && (
                            <div className="mb-2 flex flex-wrap justify-center gap-1">
                              {foilText && foilText.toLowerCase() !== "normal" && (
                                <span className="inline-block rounded-md border border-kado-border bg-kado-bg/60 px-1.5 py-0.5 text-[9px] font-bold capitalize text-kado-soft">
                                  ✨ {foilText}
                                </span>
                              )}
                              {rarityText && (
                                <span className="inline-block rounded-md border border-kado-border bg-kado-bg/60 px-1.5 py-0.5 text-[9px] font-bold capitalize text-kado-soft">
                                  {rarityText}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="space-y-0.5 text-center">
                            <p className="line-clamp-1 text-xs font-bold text-kado-text transition-colors group-hover:text-kado-soft">
                              {cardName}
                            </p>
                            <p className="line-clamp-1 text-[11px] text-kado-muted">{expansionName}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between rounded-lg border border-kado-border bg-kado-bg/60 px-2.5 py-1.5">
                          <span className="font-mono text-sm font-extrabold text-kado-soft">
                            S/.{priceNum.toFixed(2)}
                          </span>
                          {hasStock ? (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-md bg-kado px-2.5 py-1 text-[10px] font-bold text-kado-bg transition-all hover:bg-kado-soft"
                            >
                              Consultar
                            </a>
                          ) : (
                            <span className="rounded-md bg-kado-border/50 px-2.5 py-1 text-[10px] font-semibold text-kado-muted">
                              Vendida
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-6">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl border border-kado-border bg-kado-surface px-4 py-2 text-xs font-semibold text-kado-soft transition-all hover:bg-kado-bg disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <span className="px-2 font-mono text-xs font-medium text-kado-muted">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl border border-kado-border bg-kado-surface px-4 py-2 text-xs font-semibold text-kado-soft transition-all hover:bg-kado-bg disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="mt-12 rounded-2xl border border-kado-border bg-kado-surface p-6 shadow-sm">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-center sm:text-left">
              <h3 className="text-base font-bold text-kado-text">¿Te interesa alguna?</h3>
              <p className="mt-0.5 text-xs text-kado-muted">
                Escríbeme y coordinamos el envío o la entrega.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="https://wa.me/51902195561?text=Hola%2C%20vi%20tu%20cat%C3%A1logo%20de%20cartas"
                target="_blank"
                rel="noopener noreferrer"
                className="pulse-btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-kado to-kado-soft px-5 py-2.5 text-xs font-bold text-kado-bg shadow-md transition-all hover:scale-105"
              >
                WhatsApp
              </a>
              <a
                href="https://instagram.com/kado.store.pe/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-kado-border bg-kado-bg/40 px-5 py-2.5 text-xs font-bold text-kado-soft transition-all hover:border-kado hover:bg-kado-bg"
              >
                Instagram
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}