"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot } from "firebase/firestore";

export default function CarpetaPublica() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [expansion, setExpansion] = useState("all");
  const [selectedLang, setSelectedLang] = useState("all");
  const [selectedFoil, setSelectedFoil] = useState("all");
  const [selectedRarity, setSelectedRarity] = useState("all");
  const [selectedStock, setSelectedStock] = useState("all"); // "all", "disponibles", "agotadas"
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "cards"),
      (snapshot) => {
        const cardsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
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

  // Extraer expansiones únicas dinámicamente de las cartas cargadas
  const expansionesUnicas = ["all", ...new Set(cards.map((c) => c.expansion).filter(Boolean))];

  const filteredCards = cards.filter((card) => {
    // Filtro por nombre
    if (search && !card.name?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Filtro por idioma
    if (selectedLang !== "all" && card.language && card.language !== selectedLang) {
      return false;
    }
    // Filtro por expansión
    if (expansion !== "all" && card.expansion && card.expansion !== expansion) {
      return false;
    }
    // Filtro por rareza
    if (selectedRarity !== "all" && card.rarity && card.rarity !== selectedRarity) {
      return false;
    }
    // Filtro por brillo (foil)
    if (selectedFoil !== "all" && card.foil && card.foil !== selectedFoil) {
      return false;
    }
    // Filtro por stock
    const stockVal = Number(card.stock) || 0;
    if (selectedStock === "disponibles" && stockVal <= 0) return false;
    if (selectedStock === "agotadas" && stockVal > 0) return false;

    return true;
  });

  const formatearPrecio = (precio) => {
    return `S/ ${Number(precio || 0).toFixed(2)}`;
  };

  const construirWhatsapp = (carta) => {
    const base = "https://wa.me/51902195561";
    const texto = encodeURIComponent(
      `Hola, me interesa la carta ${carta.name} (${carta.expansion || "Pokémon"}) del catálogo, a ${formatearPrecio(carta.price)}.`
    );
    return `${base}?text=${texto}`;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de la Carpeta */}
      <div className="border-b border-fairy-soft pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-fairy-deep">La Carpeta</h2>
          <p className="mt-1 text-sm text-fairy-muted">
            Recorre cada página como si tuvieras la carpeta en las manos. Elige expansión, idioma y brillo.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botones de filtro rápido por stock */}
          {["all", "disponibles", "agotadas"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStock(st)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                selectedStock === st
                  ? "bg-fairy text-white"
                  : "bg-fairy-cream text-fairy-muted hover:bg-fairy-soft/30"
              }`}
            >
              {st === "all" ? "Todas" : st}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {/* Panel Lateral de Filtros */}
        <div className="space-y-5 rounded-2xl border border-fairy-sleeve bg-white p-4 shadow-sm md:col-span-1 h-fit">
          {/* Expansión */}
          <div>
            <label className="block text-xs font-semibold text-fairy-ink mb-1.5">Expansión</label>
            <select
              value={expansion}
              onChange={(e) => setExpansion(e.target.value)}
              className="w-full rounded-xl border border-fairy-sleeve bg-fairy-cream py-2 px-3 text-xs text-fairy-ink outline-none focus:ring-2 focus:ring-fairy-soft"
            >
              <option value="all">Todas las expansiones</option>
              {expansionesUnicas.filter(exp => exp !== "all").map((exp) => (
                <option key={exp} value={exp}>{exp}</option>
              ))}
            </select>
          </div>

          {/* Idioma */}
          <div>
            <label className="block text-xs font-semibold text-fairy-ink mb-1.5">Idioma</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "Todos" },
                { id: "es", label: "Español" },
                { id: "en", label: "Inglés" },
                { id: "ja", label: "Japonés" },
              ].map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLang(lang.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedLang === lang.id
                      ? "bg-fairy text-white"
                      : "bg-fairy-cream text-fairy-muted hover:bg-fairy-soft/30"
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brillo */}
          <div>
            <label className="block text-xs font-semibold text-fairy-ink mb-1.5">Brillo</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "Normal" },
                { id: "reverse", label: "Reverse" },
                { id: "holo", label: "Holo" },
              ].map((foil) => (
                <button
                  key={foil.id}
                  onClick={() => setSelectedFoil(foil.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedFoil === foil.id
                      ? "bg-fairy text-white"
                      : "bg-fairy-cream text-fairy-muted hover:bg-fairy-soft/30"
                  }`}
                >
                  {foil.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rarezas */}
          <div>
            <label className="block text-xs font-semibold text-fairy-ink mb-1.5">Rarezas</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "fullart", label: "Full Art" },
                { id: "ir", label: "IR" },
                { id: "sir", label: "SIR" },
                { id: "secreta", label: "Secreta" },
              ].map((rarity) => (
                <button
                  key={rarity.id}
                  onClick={() => setSelectedRarity(selectedRarity === rarity.id ? "all" : rarity.id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedRarity === rarity.id
                      ? "bg-fairy text-white"
                      : "bg-fairy-cream text-fairy-muted hover:bg-fairy-soft/30"
                  }`}
                >
                  {rarity.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Galería de Cartas */}
        <div className="space-y-4 md:col-span-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar Pokémon por nombre o set…"
            className="w-full rounded-2xl border border-fairy-sleeve bg-white p-3 text-sm text-fairy-ink shadow-sm outline-none placeholder:text-fairy-muted focus:ring-2 focus:ring-fairy-soft"
          />

          <p className="text-xs text-fairy-muted">
            {filteredCards.length} cartas encontradas
          </p>

          {loading ? (
            <p className="py-10 text-center text-xs text-fairy-muted">Cargando carpeta…</p>
          ) : filteredCards.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-fairy-soft bg-white p-12 text-center">
              <p className="text-sm font-medium text-fairy-ink">No hay cartas con estos filtros</p>
              <p className="mt-1 text-xs text-fairy-muted">Prueba cambiando los criterios de búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4">
              {filteredCards.map((carta) => {
                const stockNum = Number(carta.stock) || 0;
                const agotada = stockNum <= 0;

                return (
                  <div
                    key={carta.id}
                    className={`flex flex-col justify-between rounded-2xl border border-fairy-sleeve bg-white p-3 shadow-sm transition-all hover:shadow-md ${
                      agotada ? "opacity-60" : ""
                    }`}
                  >
                    <div>
                      {carta.image ? (
                        <img
                          src={carta.image}
                          alt={carta.name}
                          className="h-44 w-full object-contain mb-2"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center rounded-xl bg-gray-100 text-xs text-gray-400 mb-2">
                          Sin foto
                        </div>
                      )}
                      <p className="font-bold text-sm text-fairy-ink text-center line-clamp-1">
                        {carta.name}
                      </p>
                      <div className="flex justify-between items-center text-xs text-fairy-muted mt-1">
                        <span>#{carta.cardNumber || "—"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          stockNum > 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {stockNum > 0 ? `Stock: ${stockNum}` : "Agotada"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-fairy-soft flex items-center justify-between">
                      <span className="text-sm font-bold text-fairy-deep">
                        {formatearPrecio(carta.price)}
                      </span>
                      {agotada ? (
                        <span className="text-xs font-medium text-gray-400">No disponible</span>
                      ) : (
                        <a
                          href={construirWhatsapp(carta)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                        >
                          Comprar
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}