"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Search, Plus, Minus, Trash2, Sparkles, Loader2, LogOut, Package, ChevronLeft, ChevronRight } from "lucide-react";

const renderSafeText = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    return value.es || value.en || value.EN || Object.values(value)[0] || "";
  }
  return "";
};

export default function AdminStock() {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const [mode, setMode] = useState("api"); // "api" | "manual"
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLanguage, setSearchLanguage] = useState("es"); // es, en, ja
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiError, setApiError] = useState("");

  const [selectedApiCard, setSelectedApiCard] = useState(null);

  // Estados para inventario (Filtro y Paginación)
  const [inventorySearch, setInventorySearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;

  // Formulario
  const [formData, setFormData] = useState({
    name: "",
    expansion: "",
    image: "",
    productType: "carta",
    price: "",
    stock: "1",
    language: "es",
    foil: "normal",
    rarity: "normal",
    hasStamp: false, 
  });

  // Cargar inventario desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "cards"),
      (snapshot) => {
        const cardsData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setCards(cardsData);
        setLoadingCards(false);
      },
      (error) => {
        console.error("Error al cargar inventario:", error);
        setLoadingCards(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Autobúsqueda optimizada TCGdex
  useEffect(() => {
    if (mode !== "api" || !searchTerm.trim()) {
      setSearchResults([]);
      setApiError("");
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setApiError("");

      try {
        const cleanQuery = searchTerm.trim().toLowerCase();
        let results = [];

        try {
          const directRes = await fetch(
            `https://api.tcgdex.net/v2/${searchLanguage}/cards/${encodeURIComponent(cleanQuery)}`
          );
          if (directRes.ok) {
            const directCard = await directRes.json();
            if (directCard && !directCard.error) {
              results.push(directCard);
            }
          }
        } catch (e) {}

        if (results.length === 0) {
          let response = await fetch(
            `https://api.tcgdex.net/v2/${searchLanguage}/cards?name=${encodeURIComponent(cleanQuery)}`
          );

          if (response.ok) {
            let data = await response.json();
            if ((!data || data.length === 0) && searchLanguage !== "en") {
              const fallbackRes = await fetch(
                `https://api.tcgdex.net/v2/en/cards?name=${encodeURIComponent(cleanQuery)}`
              );
              if (fallbackRes.ok) {
                data = await fallbackRes.json();
              }
            }
            results = data || [];
          }
        }

        if (results.length === 0) {
          setApiError("No se encontró la carta en TCGdex.");
          setSearchResults([]);
        } else {
          setSearchResults(results.slice(0, 80));
        }
      } catch (error) {
        console.error("Error al buscar en TCGdex:", error);
        setApiError("Hubo un problema de conexión con TCGdex.");
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm, searchLanguage, mode]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleSelectCard = async (card) => {
    try {
      const response = await fetch(
        `https://api.tcgdex.net/v2/${searchLanguage}/cards/${card.id}`
      );
      let detail = await response.json();

      if (!detail || detail.error) {
        const fallbackRes = await fetch(
          `https://api.tcgdex.net/v2/en/cards/${card.id}`
        );
        detail = await fallbackRes.json();
      }

      setSelectedApiCard(detail);
      setSearchResults([]);
      setFormData((prev) => ({
        ...prev,
        name: detail.name || card.name,
        expansion: detail.set?.name || "Desconocida",
        image: detail.image ? `${detail.image}/high.webp` : "",
        language: searchLanguage,
        productType: "carta",
      }));
    } catch (error) {
      console.error("Error al obtener detalle de la carta:", error);
    }
  };

  const handleSaveCard = async (e) => {
    e.preventDefault();

    try {
      const isCardType = formData.productType === "carta";
      const productName = mode === "api" && selectedApiCard ? selectedApiCard.name : formData.name;
      const productExpansion = mode === "api" && selectedApiCard ? (selectedApiCard.set?.name || "Desconocida") : formData.expansion;
      const productCardNumber = isCardType && selectedApiCard ? (selectedApiCard.localId || "N/A") : "N/A";
      const productLanguage = formData.language;
      const productFoil = isCardType ? formData.foil : "N/A";
      const productRarity = isCardType ? formData.rarity : "N/A";
      const productStamp = isCardType ? (formData.hasStamp || false) : false;
      const addStockCount = parseInt(formData.stock, 10) || 1;
      const productPrice = parseFloat(formData.price) || 0;

      // Buscar si ya existe un ítem idéntico en inventario para evitar duplicados
      const existingCard = cards.find((c) => {
        const sameType = (c.productType || "carta") === formData.productType;
        const sameName = c.name?.toLowerCase().trim() === productName.toLowerCase().trim();
        const sameExp = c.expansion?.toLowerCase().trim() === productExpansion.toLowerCase().trim();
        const sameLang = c.language === productLanguage;
        const sameFoil = c.foil === productFoil;
        const sameRarity = c.rarity === productRarity;
        const sameStamp = Boolean(c.hasStamp) === Boolean(productStamp);

        return sameType && sameName && sameExp && sameLang && sameFoil && sameRarity && sameStamp;
      });

      if (existingCard) {
        // Si existe, actualizamos sumando el stock y opcionalmente el precio
        const newStock = (Number(existingCard.stock) || 0) + addStockCount;
        await updateDoc(doc(db, "cards", existingCard.id), {
          stock: newStock,
          price: productPrice > 0 ? productPrice : existingCard.price
        });
      } else {
        // Si no existe, creamos uno nuevo
        const newProduct = {
          name: productName,
          cardNumber: productCardNumber,
          expansion: productExpansion,
          image: mode === "api" && selectedApiCard ? (selectedApiCard.image ? `${selectedApiCard.image}/high.webp` : "") : formData.image,
          productType: formData.productType,
          language: productLanguage,
          foil: productFoil,
          rarity: productRarity,
          price: productPrice,
          stock: addStockCount,
          hasStamp: productStamp,
          createdAt: new Date().toISOString(),
        };

        await addDoc(collection(db, "cards"), newProduct);
      }

      setSelectedApiCard(null);
      setSearchTerm("");
      setFormData({
        name: "",
        expansion: "",
        image: "",
        productType: "carta",
        price: "",
        stock: "1",
        language: "es",
        foil: "normal",
        rarity: "normal",
        hasStamp: false,
      });
    } catch (error) {
      console.error("Error al guardar el producto:", error);
    }
  };

  const handleUpdateStock = async (cardId, currentStock, delta) => {
    const newStock = Math.max(0, currentStock + delta);
    try {
      await updateDoc(doc(db, "cards", cardId), { stock: newStock });
    } catch (error) {
      console.error("Error actualizando stock:", error);
    }
  };

  const handleUpdatePrice = async (cardId, newPrice) => {
    const priceVal = parseFloat(newPrice);
    if (isNaN(priceVal) || priceVal < 0) return;

    try {
      await updateDoc(doc(db, "cards", cardId), { price: priceVal });
    } catch (error) {
      console.error("Error actualizando precio:", error);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (!confirm("¿Eliminar este ítem del inventario?")) return;
    try {
      await deleteDoc(doc(db, "cards", cardId));
    } catch (error) {
      console.error("Error eliminando ítem:", error);
    }
  };

  // Filtrado y Paginación de Inventario
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const query = inventorySearch.toLowerCase();
      const name = renderSafeText(c.name).toLowerCase();
      const expansion = renderSafeText(c.expansion).toLowerCase();
      return name.includes(query) || expansion.includes(query);
    });
  }, [cards, inventorySearch]);

  const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE) || 1;
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCards.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCards, currentPage]);

  return (
    <div className="min-h-screen bg-pink-50/20 pb-12">
      {/* Header de Administración Flotante */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 border-b border-pink-100/80 shadow-xs transition-all">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 group" title="Ir al catálogo público">
              <img
                src="/logo.svg"
                alt="Kado Store Logo"
                className="h-9 md:h-11 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>

            <div className="border-l border-pink-200/60 pl-3">
              <h1 className="text-base sm:text-lg font-extrabold text-pink-900 flex items-center gap-1.5 leading-tight">
                <Sparkles className="text-pink-500 h-4 w-4 shrink-0" />
                <span>Panel de Administración</span>
              </h1>
              <p className="text-[11px] text-pink-600 hidden sm:block">
                Gestión de cartas (vía TCGdex ES/EN/JA) y productos sellados.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-pink-200/80 bg-pink-50/50 px-3.5 py-1.5 text-xs font-semibold text-pink-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal con Márgenes Ajustados */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8 pt-6">

        {/* SECCIÓN 1: Registrar Producto */}
        <div className="rounded-2xl border border-pink-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-pink-100 pb-3 gap-2">
            <h2 className="text-sm font-bold text-pink-900">1. Agregar Producto al Inventario</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode("api"); setSelectedApiCard(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  mode === "api"
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"
                }`}
              >
                Buscar en TCGdex
              </button>
              <button
                type="button"
                onClick={() => { setMode("manual"); setSelectedApiCard(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  mode === "manual"
                    ? "bg-pink-500 text-white border-pink-500"
                    : "bg-white text-pink-700 border-pink-200 hover:bg-pink-50"
                }`}
              >
                Registro Manual (Sellados)
              </button>
            </div>
          </div>

          {/* MODO API */}
          {mode === "api" && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <select
                  value={searchLanguage}
                  onChange={(e) => setSearchLanguage(e.target.value)}
                  className="rounded-xl border border-pink-200 px-3 py-2 text-xs font-semibold bg-white text-pink-900 outline-none focus:ring-2 focus:ring-pink-300"
                >
                  <option value="es">Español (ES)</option>
                  <option value="en">Inglés (EN)</option>
                  <option value="ja">Japonés (JA)</option>
                </select>

                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Escribe para buscar automáticamente (Ej: Pikachu, Charizard...)"
                    className="w-full rounded-xl border border-pink-200 px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800"
                  />
                  {isSearching && (
                    <div className="absolute right-2.5 top-2.5">
                      <Loader2 size={14} className="animate-spin text-pink-500" />
                    </div>
                  )}
                </div>
              </div>

              {apiError && <p className="text-xs text-red-500 mt-1">{apiError}</p>}

              {searchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 max-h-60 overflow-y-auto p-2 bg-pink-50/40 rounded-xl border border-pink-100">
                  {searchResults.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => handleSelectCard(card)}
                      className="cursor-pointer rounded-lg border border-pink-100 bg-white p-2 hover:border-pink-400 hover:bg-pink-50 transition-all text-center flex flex-col justify-between"
                    >
                      {card.image ? (
                        <img src={`${card.image}/low.webp`} alt={card.name} className="h-28 object-contain mx-auto" />
                      ) : (
                        <div className="h-28 flex items-center justify-center bg-gray-50 text-[10px] text-gray-400">Sin Imagen</div>
                      )}
                      <div>
                        <p className="font-bold text-[11px] text-gray-800 line-clamp-1 mt-1">{card.name}</p>
                        <p className="text-[10px] text-gray-500">#{card.localId || "N/A"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODO MANUAL O CARTA SELECCIONADA */}
          {(mode === "manual" || selectedApiCard) && (
            <form onSubmit={handleSaveCard} className="rounded-xl border border-pink-300 bg-pink-50/20 p-4 space-y-4">
              {selectedApiCard && (
                <div className="flex items-center gap-3 border-b border-pink-100 pb-3">
                  {selectedApiCard.image && (
                    <img src={`${selectedApiCard.image}/high.webp`} alt={selectedApiCard.name} className="h-16 object-contain" />
                  )}
                  <div>
                    <p className="font-bold text-xs text-gray-800">{selectedApiCard.name}</p>
                    <p className="text-[11px] text-gray-500">{selectedApiCard.set?.name} • #{selectedApiCard.localId}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-6 text-xs">
                {mode === "manual" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-gray-700 mb-1">Nombre del Producto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Elite Trainer Box - 151"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border border-pink-200 bg-white p-2 outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Expansión / Set</label>
                      <input
                        type="text"
                        placeholder="Ej: Scarlet & Violet"
                        value={formData.expansion}
                        onChange={(e) => setFormData({ ...formData, expansion: e.target.value })}
                        className="w-full rounded-lg border border-pink-200 bg-white p-2 outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-gray-700 mb-1">URL Imagen (Opcional)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full rounded-lg border border-pink-200 bg-white p-2 outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800 font-medium"
                  >
                    <option value="carta">Carta Suelta</option>
                    <option value="etb">ETB</option>
                    <option value="booster_bundle">Booster Bundle</option>
                    <option value="booster_box">Booster Box</option>
                    <option value="pack">Sobre Suelto</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Precio (S/)</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Ej: 180.00"
                    className="w-full rounded-lg border border-pink-200 bg-white p-2 outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Stock a añadir</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full rounded-lg border border-pink-200 bg-white p-2 outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Idioma</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800 font-semibold"
                  >
                    <option value="es">Español (ES)</option>
                    <option value="en">Inglés (EN)</option>
                    <option value="ja">Japonés (JA)</option>
                  </select>
                </div>

                {formData.productType === "carta" && (
                  <>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Acabado</label>
                      <select
                        value={formData.foil}
                        onChange={(e) => setFormData({ ...formData, foil: e.target.value })}
                        className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800"
                      >
                        <option value="normal">Normal</option>
                        <option value="holo">Holo</option>
                        <option value="reverse">Reverse Holo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Rareza</label>
                      <select
                        value={formData.rarity}
                        onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                        className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800"
                      >
                        <option value="normal">Normal</option>
                        <option value="fullart">Full Art</option>
                        <option value="ir">Illustration Rare (IR)</option>
                        <option value="sir">Special Illus. Rare (SIR)</option>
                        <option value="secreta">Secreta / Gold</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-2 sm:col-span-2">
                      <input
                        type="checkbox"
                        id="hasStamp"
                        checked={formData.hasStamp}
                        onChange={(e) => setFormData({ ...formData, hasStamp: e.target.checked })}
                        className="h-4 w-4 rounded border-pink-300 text-pink-500 focus:ring-pink-300 cursor-pointer"
                      />
                      <label htmlFor="hasStamp" className="text-xs font-semibold text-gray-700 cursor-pointer select-none">
                        ¿Incluye sello de Prize Pack?
                      </label>
                    </div>
                  </>
                )}
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-pink-500 py-2.5 text-xs font-bold text-white hover:bg-pink-600 transition-colors cursor-pointer shadow-sm"
              >
                Guardar / Actualizar Stock en Inventario
              </button>
            </form>
          )}
        </div>

        {/* SECCIÓN 2: Render de Ítems en Inventario */}
        <div className="space-y-4 bg-white p-5 rounded-2xl border border-pink-200 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-pink-100 pb-3">
            <h2 className="text-sm font-bold text-pink-900">
              2. Productos en Inventario ({filteredCards.length} de {cards.length})
            </h2>

            {/* Buscador de Inventario Existente */}
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                <Search size={14} />
              </span>
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => {
                  setInventorySearch(e.target.value);
                  setCurrentPage(1); // Resetear a la primera página al buscar
                }}
                placeholder="Buscar en tu inventario..."
                className="w-full rounded-xl border border-pink-200 bg-pink-50/20 py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
              />
            </div>
          </div>

          {loadingCards ? (
            <p className="text-xs text-gray-400">Cargando inventario...</p>
          ) : filteredCards.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No se encontraron productos registrados.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {paginatedCards.map((c) => {
                  const isCard = !c.productType || c.productType === "carta";

                  return (
                    <div
                      key={c.id}
                      className="flex flex-col justify-between rounded-xl border border-pink-100 bg-white p-3 shadow-xs hover:border-pink-300 transition-all"
                    >
                      <div className="flex gap-3">
                        <div className="relative shrink-0">
                          {c.image ? (
                            <img src={c.image} alt={renderSafeText(c.name)} className="h-24 w-16 object-contain" />
                          ) : (
                            <div className="h-24 w-16 bg-pink-50 rounded flex items-center justify-center text-pink-300">
                              <Package size={24} />
                            </div>
                          )}

                          {c.hasStamp && (
                            <img
                              src="/tu-sello.png"
                              alt="Sello"
                              className="absolute -top-1 -right-1 h-6 w-6 object-contain drop-shadow-sm pointer-events-none"
                            />
                          )}
                        </div>

                        <div className="space-y-1 text-xs flex-1">
                          <p className="font-bold text-gray-800 line-clamp-2">{renderSafeText(c.name)}</p>
                          <p className="text-[10px] text-gray-400">
                            {isCard ? `#${renderSafeText(c.cardNumber)} • ` : ""}
                            {renderSafeText(c.expansion)}
                          </p>
                          
                          <div className="flex flex-wrap gap-1 text-[9px] uppercase font-semibold mt-1">
                            <span className="rounded bg-pink-100 px-1.5 py-0.5 text-pink-700 font-bold">
                              {renderSafeText(c.language)}
                            </span>

                            {!isCard ? (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 flex items-center gap-0.5">
                                <Package size={10} />
                                {renderSafeText(c.productType)}
                              </span>
                            ) : (
                              <>
                                <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">
                                  {renderSafeText(c.foil)}
                                </span>
                                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                                  {renderSafeText(c.rarity)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-pink-50 pt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Precio (S/):</span>
                          <input
                            type="number"
                            step="0.10"
                            defaultValue={typeof c.price === "number" ? c.price : parseFloat(renderSafeText(c.price)) || 0}
                            onBlur={(e) => handleUpdatePrice(c.id, e.target.value)}
                            className="w-20 rounded border border-gray-200 px-2 py-0.5 text-right font-bold text-pink-600 outline-none focus:border-pink-400"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">Stock:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStock(c.id, Number(c.stock) || 0, -1)}
                              className="rounded bg-gray-100 p-1 hover:bg-pink-100 text-gray-600 cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-bold text-gray-800">{Number(c.stock) || 0}</span>
                            <button
                              onClick={() => handleUpdateStock(c.id, Number(c.stock) || 0, 1)}
                              className="rounded bg-gray-100 p-1 hover:bg-pink-100 text-gray-600 cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteCard(c.id)}
                          className="flex w-full items-center justify-center gap-1 rounded py-1 text-[10px] text-red-500 hover:bg-red-50 cursor-pointer transition-colors"
                        >
                          <Trash2 size={12} /> Eliminar ítem
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Controles de Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-pink-100 pt-4 mt-4">
                  <p className="text-xs text-gray-500">
                    Página <span className="font-bold">{currentPage}</span> de <span className="font-bold">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-pink-200 px-3 py-1 text-xs font-semibold text-pink-700 bg-white hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 rounded-lg border border-pink-200 px-3 py-1 text-xs font-semibold text-pink-700 bg-white hover:bg-pink-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Siguiente <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}