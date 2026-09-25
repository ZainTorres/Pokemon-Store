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
  setDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Minus, Trash2, Sparkles, Loader2, LogOut,
  Package, ChevronLeft, ChevronRight, Star, Megaphone, Users, UserPlus, X
} from "lucide-react";

const renderSafeText = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    return value.es || value.en || value.EN || Object.values(value)[0] || "";
  }
  return "";
};

// Colores por propietario (se asignan cíclicamente)
const OWNER_COLORS = [
  { bg: "bg-violet-400/15", text: "text-violet-300", dot: "bg-violet-400" },
  { bg: "bg-sky-400/15",    text: "text-sky-300",    dot: "bg-sky-400" },
  { bg: "bg-emerald-400/15",text: "text-emerald-300",dot: "bg-emerald-400" },
  { bg: "bg-amber-400/15",  text: "text-amber-300",  dot: "bg-amber-400" },
  { bg: "bg-rose-400/15",   text: "text-rose-300",   dot: "bg-rose-400" },
  { bg: "bg-cyan-400/15",   text: "text-cyan-300",   dot: "bg-cyan-400" },
  { bg: "bg-fuchsia-400/15",text: "text-fuchsia-300",dot: "bg-fuchsia-400" },
  { bg: "bg-orange-400/15", text: "text-orange-300", dot: "bg-orange-400" },
];

export default function AdminStock() {
  const router = useRouter();
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const [mode, setMode] = useState("api");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchLanguage, setSearchLanguage] = useState("es");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiError, setApiError] = useState("");
  const [selectedApiCard, setSelectedApiCard] = useState(null);

  // Propietarios
  const [owners, setOwners] = useState(["Zain", "Edu", "Kado"]);
  const [newOwnerInput, setNewOwnerInput] = useState("");
  const [showOwnerManager, setShowOwnerManager] = useState(false);

  // Filtros de inventario
  const [inventorySearch, setInventorySearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("todos");
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
    featured: false,
    owner: "Kado",
  });

  // Banner
  const [bannerForm, setBannerForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: "",
    link: "",
    active: false,
  });
  const [savingBanner, setSavingBanner] = useState(false);

  // Cargar propietarios desde Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "owners"), (snap) => {
      if (snap.exists() && snap.data().list?.length) {
        setOwners(snap.data().list);
      }
    });
    return () => unsub();
  }, []);

  // Guardar propietarios en Firestore
  const saveOwners = async (list) => {
    try {
      await setDoc(doc(db, "settings", "owners"), { list }, { merge: true });
    } catch (e) {
      console.error("Error guardando propietarios:", e);
    }
  };

  const handleAddOwner = () => {
    const trimmed = newOwnerInput.trim();
    if (!trimmed || owners.includes(trimmed)) return;
    const updated = [...owners, trimmed];
    setOwners(updated);
    saveOwners(updated);
    setNewOwnerInput("");
  };

  const handleRemoveOwner = (name) => {
    if (owners.length <= 1) return;
    const updated = owners.filter((o) => o !== name);
    setOwners(updated);
    saveOwners(updated);
    if (formData.owner === name) setFormData((p) => ({ ...p, owner: updated[0] }));
    if (ownerFilter === name) setOwnerFilter("todos");
  };

  const getOwnerColor = (name) => {
    const idx = owners.indexOf(name);
    return OWNER_COLORS[idx % OWNER_COLORS.length] ?? OWNER_COLORS[0];
  };

  // Banner
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "banner"), (snap) => {
      if (snap.exists()) setBannerForm((prev) => ({ ...prev, ...snap.data() }));
    });
    return () => unsub();
  }, []);

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    setSavingBanner(true);
    try {
      await setDoc(doc(db, "settings", "banner"), bannerForm, { merge: true });
    } catch (error) {
      console.error("Error guardando el banner:", error);
    } finally {
      setSavingBanner(false);
    }
  };

  const handleToggleFeatured = async (cardId, current) => {
    try {
      await updateDoc(doc(db, "cards", cardId), { featured: !current });
    } catch (error) {
      console.error("Error actualizando destacado:", error);
    }
  };

  // Cargar inventario
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "cards"),
      (snapshot) => {
        const cardsData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

  // Búsqueda TCGdex
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
            if (directCard && !directCard.error) results.push(directCard);
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
              if (fallbackRes.ok) data = await fallbackRes.json();
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
        const fallbackRes = await fetch(`https://api.tcgdex.net/v2/en/cards/${card.id}`);
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
      const productOwner = formData.owner || "Kado";

      const existingCard = cards.find((c) => {
        const sameType = (c.productType || "carta") === formData.productType;
        const sameName = c.name?.toLowerCase().trim() === productName.toLowerCase().trim();
        const sameExp = c.expansion?.toLowerCase().trim() === productExpansion.toLowerCase().trim();
        const sameLang = c.language === productLanguage;
        const sameFoil = c.foil === productFoil;
        const sameRarity = c.rarity === productRarity;
        const sameStamp = Boolean(c.hasStamp) === Boolean(productStamp);
        const sameOwner = (c.owner || "Kado") === productOwner;
        return sameType && sameName && sameExp && sameLang && sameFoil && sameRarity && sameStamp && sameOwner;
      });

      if (existingCard) {
        const newStock = (Number(existingCard.stock) || 0) + addStockCount;
        await updateDoc(doc(db, "cards", existingCard.id), {
          stock: newStock,
          price: productPrice > 0 ? productPrice : existingCard.price,
        });
      } else {
        const newProduct = {
          name: productName,
          cardNumber: productCardNumber,
          expansion: productExpansion,
          image: mode === "api" && selectedApiCard
            ? (selectedApiCard.image ? `${selectedApiCard.image}/high.webp` : "")
            : formData.image,
          productType: formData.productType,
          language: productLanguage,
          foil: productFoil,
          rarity: productRarity,
          price: productPrice,
          stock: addStockCount,
          hasStamp: productStamp,
          featured: formData.featured || false,
          owner: productOwner,
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
        featured: false,
        owner: formData.owner, // mantiene el propietario seleccionado
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

  const handleUpdateOwner = async (cardId, newOwner) => {
    try {
      await updateDoc(doc(db, "cards", cardId), { owner: newOwner });
    } catch (error) {
      console.error("Error actualizando propietario:", error);
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

  // Filtrado y paginación
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      const query = inventorySearch.toLowerCase();
      const name = renderSafeText(c.name).toLowerCase();
      const expansion = renderSafeText(c.expansion).toLowerCase();
      const matchesSearch = name.includes(query) || expansion.includes(query);
      const matchesOwner = ownerFilter === "todos" || (c.owner || "Kado") === ownerFilter;
      return matchesSearch && matchesOwner;
    });
  }, [cards, inventorySearch, ownerFilter]);

  // Conteo por propietario
  const ownerCounts = useMemo(() => {
    const counts = {};
    cards.forEach((c) => {
      const owner = c.owner || "Kado";
      counts[owner] = (counts[owner] || 0) + 1;
    });
    return counts;
  }, [cards]);

  const totalPages = Math.ceil(filteredCards.length / ITEMS_PER_PAGE) || 1;
  const paginatedCards = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCards.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCards, currentPage]);

  return (
    <div className="min-h-screen bg-kado-bg pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-kado-surface/80 border-b border-kado-border shadow-xs transition-all">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 group" title="Ir al catálogo público">
              <img
                src="/logo.svg"
                alt="Kado Store Logo"
                className="h-9 md:h-11 w-auto object-contain transition-transform group-hover:scale-105"
              />
            </Link>
            <div className="border-l border-kado-border pl-3">
              <h1 className="text-base sm:text-lg font-extrabold text-kado-text flex items-center gap-1.5 leading-tight">
                <Sparkles className="text-kado-soft h-4 w-4 shrink-0" />
                <span>Panel de Administración</span>
              </h1>
              <p className="text-[11px] text-kado-soft hidden sm:block">
                Gestión de cartas (vía TCGdex ES/EN/JA) y productos sellados.
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-full border border-kado-border bg-kado-bg/60 px-3.5 py-1.5 text-xs font-semibold text-kado-soft hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-400/40 transition-all shadow-xs shrink-0 cursor-pointer"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8 pt-6">

        {/* ── SECCIÓN 0: Gestión de Propietarios ── */}
        <div className="rounded-2xl border border-kado-border bg-kado-surface p-5 shadow-sm">
          <button
            type="button"
            onClick={() => setShowOwnerManager((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-bold text-kado-text"
          >
            <span className="flex items-center gap-2">
              <Users size={15} className="text-kado-soft" />
              Propietarios de cartas
              <span className="rounded-full bg-kado/20 px-2 py-0.5 text-[10px] font-bold text-kado-soft">
                {owners.length}
              </span>
            </span>
            <span className="text-xs text-kado-muted font-normal">
              {showOwnerManager ? "Cerrar ▲" : "Gestionar ▼"}
            </span>
          </button>

          {showOwnerManager && (
            <div className="mt-4 space-y-3 border-t border-kado-border pt-4">
              {/* Lista de propietarios actuales */}
              <div className="flex flex-wrap gap-2">
                {owners.map((owner) => {
                  const color = getOwnerColor(owner);
                  return (
                    <div
                      key={owner}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${color.bg} ${color.text}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${color.dot}`} />
                      {owner}
                      <span className="ml-1 opacity-60 text-[10px]">
                        ({ownerCounts[owner] || 0})
                      </span>
                      <button
                        onClick={() => handleRemoveOwner(owner)}
                        className="ml-1 hover:opacity-70 transition-opacity cursor-pointer"
                        title={`Eliminar ${owner}`}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Agregar nuevo */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOwnerInput}
                  onChange={(e) => setNewOwnerInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddOwner())}
                  placeholder="Nombre del nuevo propietario..."
                  className="flex-1 rounded-xl border border-kado-border bg-kado-bg/60 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
                />
                <button
                  type="button"
                  onClick={handleAddOwner}
                  className="flex items-center gap-1.5 rounded-xl bg-kado px-4 py-2 text-xs font-bold text-kado-bg hover:bg-kado-deep transition-colors cursor-pointer"
                >
                  <UserPlus size={13} />
                  Agregar
                </button>
              </div>
              <p className="text-[10px] text-kado-muted">
                Los propietarios se guardan en Firestore y son compartidos entre sesiones.
              </p>
            </div>
          )}
        </div>

        {/* ── SECCIÓN 1: Registrar Producto ── */}
        <div className="rounded-2xl border border-kado-border bg-kado-surface p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-kado-border pb-3 gap-2">
            <h2 className="text-sm font-bold text-kado-text">1. Agregar Producto al Inventario</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setMode("api"); setSelectedApiCard(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  mode === "api"
                    ? "bg-kado text-kado-bg border-kado"
                    : "bg-kado-surface text-kado-soft border-kado-border hover:bg-kado-bg"
                }`}
              >
                Buscar en TCGdex
              </button>
              <button
                type="button"
                onClick={() => { setMode("manual"); setSelectedApiCard(null); }}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  mode === "manual"
                    ? "bg-kado text-kado-bg border-kado"
                    : "bg-kado-surface text-kado-soft border-kado-border hover:bg-kado-bg"
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
                  className="rounded-xl border border-kado-border px-3 py-2 text-xs font-semibold bg-kado-surface text-kado-text outline-none focus:ring-2 focus:ring-kado/40"
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
                    className="w-full rounded-xl border border-kado-border px-3 py-2 pr-8 text-xs outline-none focus:ring-2 focus:ring-kado/40 bg-kado-surface text-kado-text"
                  />
                  {isSearching && (
                    <div className="absolute right-2.5 top-2.5">
                      <Loader2 size={14} className="animate-spin text-kado-soft" />
                    </div>
                  )}
                </div>
              </div>

              {apiError && <p className="text-xs text-rose-400 mt-1">{apiError}</p>}

              {searchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 max-h-60 overflow-y-auto p-2 bg-kado-bg/60 rounded-xl border border-kado-border">
                  {searchResults.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => handleSelectCard(card)}
                      className="cursor-pointer rounded-lg border border-kado-border bg-kado-surface p-2 hover:border-kado hover:bg-kado-bg transition-all text-center flex flex-col justify-between"
                    >
                      {card.image ? (
                        <img src={`${card.image}/low.webp`} alt={card.name} className="h-28 object-contain mx-auto" />
                      ) : (
                        <div className="h-28 flex items-center justify-center bg-kado-bg/60 text-[10px] text-kado-muted">Sin Imagen</div>
                      )}
                      <div>
                        <p className="font-bold text-[11px] text-kado-text line-clamp-1 mt-1">{card.name}</p>
                        <p className="text-[10px] text-kado-muted">#{card.localId || "N/A"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODO MANUAL O CARTA SELECCIONADA */}
          {(mode === "manual" || selectedApiCard) && (
            <form onSubmit={handleSaveCard} className="rounded-xl border border-kado bg-kado-bg/60 p-4 space-y-4">
              {selectedApiCard && (
                <div className="flex items-center gap-3 border-b border-kado-border pb-3">
                  {selectedApiCard.image && (
                    <img src={`${selectedApiCard.image}/high.webp`} alt={selectedApiCard.name} className="h-16 object-contain" />
                  )}
                  <div>
                    <p className="font-bold text-xs text-kado-text">{selectedApiCard.name}</p>
                    <p className="text-[11px] text-kado-muted">{selectedApiCard.set?.name} • #{selectedApiCard.localId}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-6 text-xs">
                {mode === "manual" && (
                  <>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-kado-text mb-1">Nombre del Producto</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Elite Trainer Box - 151"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border border-kado-border bg-kado-surface p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-kado-text mb-1">Expansión / Set</label>
                      <input
                        type="text"
                        placeholder="Ej: Scarlet & Violet"
                        value={formData.expansion}
                        onChange={(e) => setFormData({ ...formData, expansion: e.target.value })}
                        className="w-full rounded-lg border border-kado-border bg-kado-surface p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-kado-text mb-1">URL Imagen (Opcional)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={formData.image}
                        onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                        className="w-full rounded-lg border border-kado-border bg-kado-surface p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block font-semibold text-kado-text mb-1">Tipo</label>
                  <select
                    value={formData.productType}
                    onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
                    className="w-full rounded-lg border border-kado-border p-2 outline-none focus:ring-2 focus:ring-kado/40 bg-kado-surface text-kado-text font-medium"
                  >
                    <option value="carta">Carta Suelta</option>
                    <option value="etb">ETB</option>
                    <option value="booster_bundle">Booster Bundle</option>
                    <option value="booster_box">Booster Box</option>
                    <option value="pack">Sobre Suelto</option>
                  </select>
                </div>

                {/* ── PROPIETARIO ── */}
                <div>
                  <label className="block font-semibold text-kado-text mb-1 flex items-center gap-1">
                    <Users size={11} className="text-kado-soft" />
                    Propietario
                  </label>
                  <select
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full rounded-lg border border-kado-border p-2 outline-none focus:ring-2 focus:ring-kado/40 bg-kado-surface text-kado-text font-semibold"
                  >
                    {owners.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-kado-text mb-1">Precio (S/)</label>
                  <input
                    type="number"
                    step="0.10"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="Ej: 180.00"
                    className="w-full rounded-lg border border-kado-border bg-kado-surface p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-kado-text mb-1">Stock a añadir</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full rounded-lg border border-kado-border bg-kado-surface p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-kado-text mb-1">Idioma</label>
                  <select
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    className="w-full rounded-lg border border-kado-border p-2 outline-none focus:ring-2 focus:ring-kado/40 bg-kado-surface text-kado-text font-semibold"
                  >
                    <option value="es">Español (ES)</option>
                    <option value="en">Inglés (EN)</option>
                    <option value="ja">Japonés (JA)</option>
                  </select>
                </div>

                {formData.productType === "carta" && (
                  <>
                    <div>
                      <label className="block font-semibold text-kado-text mb-1">Acabado</label>
                      <select
                        value={formData.foil}
                        onChange={(e) => setFormData({ ...formData, foil: e.target.value })}
                        className="w-full rounded-lg border border-kado-border p-2 outline-none focus:ring-2 focus:ring-kado/40 bg-kado-surface text-kado-text"
                      >
                        <option value="normal">Normal</option>
                        <option value="holo">Holo</option>
                        <option value="reverse">Reverse Holo</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-kado-text mb-1">Rareza</label>
                      <select
                        value={formData.rarity}
                        onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                        className="w-full rounded-lg border border-kado-border p-2 outline-none focus:ring-2 focus:ring-kado/40 bg-kado-surface text-kado-text"
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
                        className="h-4 w-4 rounded border-kado text-kado-soft focus:ring-kado/40 cursor-pointer"
                      />
                      <label htmlFor="hasStamp" className="text-xs font-semibold text-kado-text cursor-pointer select-none">
                        ¿Incluye sello de Prize Pack?
                      </label>
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2 pt-2 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="h-4 w-4 rounded border-kado text-kado-soft focus:ring-kado/40 cursor-pointer"
                  />
                  <label htmlFor="featured" className="text-xs font-semibold text-kado-text cursor-pointer select-none flex items-center gap-1">
                    <Star size={12} className="text-kado-soft" />
                    Destacado (aparece en el slider del home)
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-kado py-2.5 text-xs font-bold text-kado-bg hover:bg-kado-deep transition-colors cursor-pointer shadow-sm"
              >
                Guardar / Actualizar Stock en Inventario
              </button>
            </form>
          )}
        </div>

        {/* ── SECCIÓN 1.5: Banner ── */}
        <div className="space-y-4 bg-kado-surface p-5 rounded-2xl border border-kado-border shadow-sm">
          <div className="flex items-center justify-between border-b border-kado-border pb-3">
            <h2 className="text-sm font-bold text-kado-text flex items-center gap-1.5">
              <Megaphone size={14} className="text-kado-soft" />
              2. Banner de ofertas / avisos (home)
            </h2>
            <label className="flex items-center gap-2 text-xs font-semibold text-kado-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={bannerForm.active}
                onChange={(e) => setBannerForm({ ...bannerForm, active: e.target.checked })}
                className="h-4 w-4 rounded border-kado text-kado-soft focus:ring-kado/40 cursor-pointer"
              />
              Visible en el home
            </label>
          </div>

          <form onSubmit={handleSaveBanner} className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
            <div>
              <label className="block font-semibold text-kado-text mb-1">Título</label>
              <input
                type="text"
                placeholder="Ej: 20% OFF en cartas Reverse Holo"
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                className="w-full rounded-lg border border-kado-border bg-kado-bg/60 p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
              />
            </div>
            <div>
              <label className="block font-semibold text-kado-text mb-1">Subtítulo</label>
              <input
                type="text"
                placeholder="Ej: Válido hasta fin de mes"
                value={bannerForm.subtitle}
                onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                className="w-full rounded-lg border border-kado-border bg-kado-bg/60 p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
              />
            </div>
            <div>
              <label className="block font-semibold text-kado-text mb-1">URL de imagen de fondo (opcional)</label>
              <input
                type="url"
                placeholder="https://..."
                value={bannerForm.imageUrl}
                onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
                className="w-full rounded-lg border border-kado-border bg-kado-bg/60 p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
              />
            </div>
            <div>
              <label className="block font-semibold text-kado-text mb-1">Link al hacer clic (opcional)</label>
              <input
                type="url"
                placeholder="https://wa.me/..."
                value={bannerForm.link}
                onChange={(e) => setBannerForm({ ...bannerForm, link: e.target.value })}
                className="w-full rounded-lg border border-kado-border bg-kado-bg/60 p-2 outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
              />
            </div>
            <button
              type="submit"
              disabled={savingBanner}
              className="sm:col-span-2 w-full rounded-xl bg-kado py-2.5 text-xs font-bold text-kado-bg hover:bg-kado-deep transition-colors cursor-pointer shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {savingBanner && <Loader2 size={14} className="animate-spin" />}
              {savingBanner ? "Guardando..." : "Guardar banner"}
            </button>
          </form>
        </div>

        {/* ── SECCIÓN 2: Inventario ── */}
        <div className="space-y-4 bg-kado-surface p-5 rounded-2xl border border-kado-border shadow-sm">
          <div className="flex flex-col gap-3 border-b border-kado-border pb-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-kado-text">
                3. Productos en Inventario ({filteredCards.length} de {cards.length})
              </h2>
              <div className="relative w-full sm:w-72">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-kado-muted">
                  <Search size={14} />
                </span>
                <input
                  type="text"
                  value={inventorySearch}
                  onChange={(e) => { setInventorySearch(e.target.value); setCurrentPage(1); }}
                  placeholder="Buscar en tu inventario..."
                  className="w-full rounded-xl border border-kado-border bg-kado-bg/60 py-1.5 pl-9 pr-3 text-xs outline-none focus:ring-2 focus:ring-kado/40 text-kado-text"
                />
              </div>
            </div>

            {/* ── Filtro por propietario ── */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setOwnerFilter("todos"); setCurrentPage(1); }}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer border ${
                  ownerFilter === "todos"
                    ? "bg-kado text-kado-bg border-kado"
                    : "bg-kado-bg/60 text-kado-soft border-kado-border hover:border-kado/50"
                }`}
              >
                Todos ({cards.length})
              </button>
              {owners.map((owner) => {
                const color = getOwnerColor(owner);
                const isActive = ownerFilter === owner;
                return (
                  <button
                    key={owner}
                    onClick={() => { setOwnerFilter(owner); setCurrentPage(1); }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer border ${
                      isActive
                        ? `${color.bg} ${color.text} border-transparent`
                        : "bg-kado-bg/60 text-kado-soft border-kado-border hover:border-kado/50"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`} />
                    {owner} ({ownerCounts[owner] || 0})
                  </button>
                );
              })}
            </div>
          </div>

          {loadingCards ? (
            <p className="text-xs text-kado-muted">Cargando inventario...</p>
          ) : filteredCards.length === 0 ? (
            <p className="text-xs text-kado-muted italic">No se encontraron productos registrados.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {paginatedCards.map((c) => {
                  const isCard = !c.productType || c.productType === "carta";
                  const cardOwner = c.owner || "Kado";
                  const ownerColor = getOwnerColor(cardOwner);

                  return (
                    <div
                      key={c.id}
                      className="flex flex-col justify-between rounded-xl border border-kado-border bg-kado-surface p-3 shadow-xs hover:border-kado transition-all"
                    >
                      {/* ── Etiqueta de propietario ── */}
                      <div className="flex items-center justify-between mb-2">
                        <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${ownerColor.bg} ${ownerColor.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ownerColor.dot}`} />
                          {cardOwner}
                        </span>
                        {c.featured && (
                          <Star size={11} className="text-kado-soft" fill="currentColor" />
                        )}
                      </div>

                      <div className="flex gap-3">
                        <div className="relative shrink-0">
                          {c.image ? (
                            <img src={c.image} alt={renderSafeText(c.name)} className="h-24 w-16 object-contain" />
                          ) : (
                            <div className="h-24 w-16 bg-kado-bg/60 rounded flex items-center justify-center text-kado-muted">
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
                          <p className="font-bold text-kado-text line-clamp-2">
                            {renderSafeText(c.name)}
                          </p>
                          <p className="text-[10px] text-kado-muted">
                            {isCard ? `#${renderSafeText(c.cardNumber)} • ` : ""}
                            {renderSafeText(c.expansion)}
                          </p>
                          <div className="flex flex-wrap gap-1 text-[9px] uppercase font-semibold mt-1">
                            <span className="rounded bg-kado/15 px-1.5 py-0.5 text-kado-soft font-bold">
                              {renderSafeText(c.language)}
                            </span>
                            {!isCard ? (
                              <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-emerald-300 flex items-center gap-0.5">
                                <Package size={10} />
                                {renderSafeText(c.productType)}
                              </span>
                            ) : (
                              <>
                                <span className="rounded bg-violet-400/15 px-1.5 py-0.5 text-violet-300">
                                  {renderSafeText(c.foil)}
                                </span>
                                <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-sky-300">
                                  {renderSafeText(c.rarity)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 border-t border-kado-border/60 pt-2 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-kado-muted font-medium">Precio (S/):</span>
                          <input
                            type="number"
                            step="0.10"
                            defaultValue={typeof c.price === "number" ? c.price : parseFloat(renderSafeText(c.price)) || 0}
                            onBlur={(e) => handleUpdatePrice(c.id, e.target.value)}
                            className="w-20 rounded border border-kado-border px-2 py-0.5 text-right font-bold text-kado-soft outline-none focus:border-kado"
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="text-kado-muted font-medium">Stock:</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateStock(c.id, Number(c.stock) || 0, -1)}
                              className="rounded bg-kado-border/50 p-1 hover:bg-kado-border/60 text-kado-muted cursor-pointer"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="font-bold text-kado-text">{Number(c.stock) || 0}</span>
                            <button
                              onClick={() => handleUpdateStock(c.id, Number(c.stock) || 0, 1)}
                              className="rounded bg-kado-border/50 p-1 hover:bg-kado-border/60 text-kado-muted cursor-pointer"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </div>

                        {/* ── Cambiar propietario inline ── */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-kado-muted font-medium flex items-center gap-1">
                            <Users size={10} /> Dueño:
                          </span>
                          <select
                            value={cardOwner}
                            onChange={(e) => handleUpdateOwner(c.id, e.target.value)}
                            className={`rounded border border-kado-border px-1.5 py-0.5 text-[10px] font-bold outline-none focus:border-kado cursor-pointer ${ownerColor.bg} ${ownerColor.text}`}
                          >
                            {owners.map((o) => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleToggleFeatured(c.id, Boolean(c.featured))}
                            className={`flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] font-semibold cursor-pointer transition-colors ${
                              c.featured
                                ? "bg-kado/20 text-kado-soft hover:bg-kado/30"
                                : "text-kado-muted hover:bg-kado-border/50"
                            }`}
                          >
                            <Star size={12} fill={c.featured ? "currentColor" : "none"} />
                            {c.featured ? "Destacado" : "Destacar"}
                          </button>
                          <button
                            onClick={() => handleDeleteCard(c.id)}
                            className="flex flex-1 items-center justify-center gap-1 rounded py-1 text-[10px] text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          >
                            <Trash2 size={12} /> Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-kado-border pt-4 mt-4">
                  <p className="text-xs text-kado-muted">
                    Página <span className="font-bold">{currentPage}</span> de <span className="font-bold">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 rounded-lg border border-kado-border px-3 py-1 text-xs font-semibold text-kado-soft bg-kado-surface hover:bg-kado-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 rounded-lg border border-kado-border px-3 py-1 text-xs font-semibold text-kado-soft bg-kado-surface hover:bg-kado-bg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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