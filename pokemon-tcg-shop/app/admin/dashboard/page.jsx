"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Search, Plus, Minus, Trash2, Sparkles, Loader2 } from "lucide-react";

const renderSafeText = (value) => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    return value.es || value.en || value.EN || Object.values(value)[0] || "";
  }
  return "";
};

export default function AdminStock() {
  const [cards, setCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedApiCard, setSelectedApiCard] = useState(null);

  // Formulario con Idioma, Acabado (Foil) y Precio por defecto
  const [formData, setFormData] = useState({
    price: "",
    stock: "1",
    language: "es", // Idioma por defecto
    foil: "normal", // Acabado (Normal, Holo, Reverse Holo)
    rarity: "normal",
  });

  // 1. Escuchar la colección de Firestore
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

  // 2. Buscar en API de Pokémon TCG
  const handleApiSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsSearching(true);
    setSearchResults([]);

    try {
      const response = await fetch(
        `https://api.pokemontcg.io/v2/cards?q=name:"${encodeURIComponent(
          searchTerm
        )}*"`
      );
      const data = await response.json();
      setSearchResults(data.data || []);
    } catch (error) {
      console.error("Error al buscar en pokemontcg.io:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCard = (card) => {
    setSelectedApiCard(card);
    setSearchResults([]);
  };

  // 3. Guardar en Firestore con Soles y variantes
  const handleSaveCard = async (e) => {
    e.preventDefault();
    if (!selectedApiCard) return;

    try {
      const newCard = {
        name: selectedApiCard.name,
        cardNumber: selectedApiCard.number,
        expansion: selectedApiCard.set?.name || "Desconocida",
        image: selectedApiCard.images?.small || selectedApiCard.images?.large || "",
        language: formData.language,
        foil: formData.foil,
        rarity: formData.rarity,
        price: parseFloat(formData.price) || 0, // Guardado en Soles (PEN)
        stock: parseInt(formData.stock, 10) || 0,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "cards"), newCard);

      setSelectedApiCard(null);
      setSearchTerm("");
      setFormData({
        price: "",
        stock: "1",
        language: "es",
        foil: "normal",
        rarity: "normal",
      });
    } catch (error) {
      console.error("Error al guardar la carta:", error);
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
    if (!confirm("¿Eliminar esta carta del inventario?")) return;
    try {
      await deleteDoc(doc(db, "cards", cardId));
    } catch (error) {
      console.error("Error eliminando carta:", error);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <div className="border-b border-pink-200 pb-4">
        <h1 className="text-2xl font-bold text-pink-900 flex items-center gap-2">
          <Sparkles className="text-pink-500" /> Panel de Administración - Inventario
        </h1>
        <p className="text-xs text-pink-600 mt-1">
          Busca cartas, asigna precio en Soles (S/), idioma y acabado (Holo/Reverse).
        </p>
      </div>

      {/* SECCIÓN 1: Buscar y Guardar */}
      <div className="rounded-2xl border border-pink-200 bg-pink-50/40 p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-pink-800">1. Buscar Carta en API Oficial</h2>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleApiSearch()}
            placeholder="Ej: Charizard, Gardevoir, Pikachu..."
            className="flex-1 rounded-xl border border-pink-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800"
          />
          <button
            type="button"
            onClick={handleApiSearch}
            disabled={isSearching}
            className="flex items-center gap-1.5 rounded-xl bg-pink-500 px-4 py-2 text-xs font-semibold text-white hover:bg-pink-600 disabled:opacity-50"
          >
            {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            Buscar
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 max-h-60 overflow-y-auto p-2 bg-white rounded-xl border border-pink-100">
            {searchResults.map((card) => (
              <div
                key={card.id}
                onClick={() => handleSelectCard(card)}
                className="cursor-pointer rounded-lg border border-pink-100 p-2 hover:border-pink-400 hover:bg-pink-50 transition-all text-center"
              >
                <img src={card.images.small} alt={card.name} className="h-28 object-contain mx-auto" />
                <p className="font-bold text-[11px] text-gray-800 line-clamp-1 mt-1">{card.name}</p>
                <p className="text-[10px] text-gray-500">{card.set.name} - #{card.number}</p>
              </div>
            ))}
          </div>
        )}

        {selectedApiCard && (
          <form onSubmit={handleSaveCard} className="mt-4 rounded-xl border border-pink-300 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-pink-100 pb-2">
              <span className="text-xs font-bold text-pink-700">Carta seleccionada:</span>
              <button
                type="button"
                onClick={() => setSelectedApiCard(null)}
                className="text-[11px] text-gray-400 hover:text-red-500"
              >
                Cancelar
              </button>
            </div>

            <div className="flex gap-4 items-center">
              <img src={selectedApiCard.images.small} alt={selectedApiCard.name} className="h-28 object-contain" />
              <div>
                <p className="font-bold text-sm text-gray-800">{selectedApiCard.name}</p>
                <p className="text-xs text-gray-500">Expansión: {selectedApiCard.set.name}</p>
                <p className="text-xs text-gray-500">Número: #{selectedApiCard.number}</p>
              </div>
            </div>

            {/* Opciones del Formulario */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 text-xs">
              {/* Precio en Soles */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Precio (S/)</label>
                <input
                  type="number"
                  step="0.10"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Ej: 15.00"
                  className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
                />
              </div>

              {/* Stock */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 text-gray-800"
                />
              </div>

              {/* Selector de Idioma */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Idioma</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800"
                >
                  <option value="es">Español (ES)</option>
                  <option value="en">Inglés (EN)</option>
                  <option value="ja">Japonés (JA)</option>
                </select>
              </div>

              {/* Selector de Brillo / Acabado */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Acabado / Brillo</label>
                <select
                  value={formData.foil}
                  onChange={(e) => setFormData({ ...formData, foil: e.target.value })}
                  className="w-full rounded-lg border border-pink-200 p-2 outline-none focus:ring-2 focus:ring-pink-300 bg-white text-gray-800"
                >
                  <option value="normal">Normal / Regular</option>
                  <option value="holo">Holo</option>
                  <option value="reverse">Reverse Holo</option>
                </select>
              </div>

              {/* Rareza */}
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Categoría Rareza</label>
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
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-pink-500 py-2 text-xs font-bold text-white hover:bg-pink-600"
            >
              Guardar en Inventario
            </button>
          </form>
        )}
      </div>

      {/* SECCIÓN 2: Render de Cartas en Inventario */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-pink-800">2. Cartas en Inventario ({cards.length})</h2>

        {loadingCards ? (
          <p className="text-xs text-gray-400">Cargando inventario...</p>
        ) : cards.length === 0 ? (
          <p className="text-xs text-gray-400 italic">No hay cartas registradas aún.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between rounded-xl border border-pink-100 bg-white p-3 shadow-sm hover:border-pink-300"
              >
                <div className="flex gap-3">
                  <img src={typeof c.image === "string" ? c.image : ""} alt={renderSafeText(c.name)} className="h-24 object-contain" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-gray-800 line-clamp-1">{renderSafeText(c.name)}</p>
                    <p className="text-[10px] text-gray-400">#{renderSafeText(c.cardNumber)} • {renderSafeText(c.expansion)}</p>
                    
                    {/* Tags de Idioma y Brillo */}
                    <div className="flex flex-wrap gap-1 text-[9px] uppercase font-semibold mt-1">
                      <span className="rounded bg-pink-100 px-1.5 py-0.5 text-pink-700">
                        {renderSafeText(c.language)}
                      </span>
                      <span className="rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">
                        {renderSafeText(c.foil)}
                      </span>
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                        {renderSafeText(c.rarity)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 border-t border-pink-50 pt-2 space-y-2">
                  {/* Edición de precio en Soles */}
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

                  {/* Modificación de stock */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Stock:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdateStock(c.id, Number(c.stock) || 0, -1)}
                        className="rounded bg-gray-100 p-1 hover:bg-pink-100 text-gray-600"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="font-bold text-gray-800">{Number(c.stock) || 0}</span>
                      <button
                        onClick={() => handleUpdateStock(c.id, Number(c.stock) || 0, 1)}
                        className="rounded bg-gray-100 p-1 hover:bg-pink-100 text-gray-600"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteCard(c.id)}
                    className="flex w-full items-center justify-center gap-1 rounded py-1 text-[10px] text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={12} /> Eliminar carta
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}