"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, doc, updateDoc, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Minus, Plus, Search, Loader2 } from "lucide-react";
import BuscadorImportarCarta from "@/components/BuscadorImportarCarta";

const LANGUAGES = [
  { key: "ES", label: "Español" },
  { key: "EN", label: "Inglés" },
  { key: "JP", label: "Japonés" },
];

const FINISHES = [
  { key: "normal", label: "Normal" },
  { key: "reverse", label: "Reverse" },
  { key: "holo", label: "Holo" },
  { key: "fullart", label: "Full Art" },
  { key: "ir", label: "IR" },
  { key: "sir", label: "SIR" },
  { key: "secreta", label: "Secreta" },
];

/**
 * Ajusta el stock de una variante puntual usando increment() de Firestore.
 * No lee el documento antes de escribir: es seguro ante escrituras concurrentes.
 */
async function adjustStock(cardId, lang, finish, delta) {
  const ref = doc(db, "cards", cardId);
  await updateDoc(ref, {
    [`stock.${lang}.${finish}`]: increment(delta),
    updatedAt: new Date(),
  });
}

export default function AdminStock() {
  const [cards, setCards] = useState(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [pendingKey, setPendingKey] = useState(null); // evita doble click en el mismo botón

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "cards"), (snap) => {
      setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!cards) return [];
    const term = search.trim().toLowerCase();
    if (!term) return cards;
    return cards.filter(
      (c) =>
        c.name?.toLowerCase().includes(term) ||
        c.expansionName?.toLowerCase().includes(term) ||
        c.cardNumber?.toLowerCase?.().includes(term)
    );
  }, [cards, search]);

  async function handleAdjust(cardId, lang, finish, delta) {
    const key = `${cardId}-${lang}-${finish}`;
    setPendingKey(key);
    try {
      await adjustStock(cardId, lang, finish, delta);
    } catch (err) {
      console.error(err);
      alert("No se pudo actualizar el stock. Intenta de nuevo.");
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-fairy-cream p-4 font-body text-fairy-ink md:p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl text-fairy-ink">Control de stock</h1>
        <p className="mt-1 text-sm text-fairy-muted">
          Suma o resta unidades por idioma y acabado. Los cambios se guardan al instante.
        </p>

        <div className="mt-6">
          <BuscadorImportarCarta />
        </div>

        <div className="relative mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fairy-muted" size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Busca en tu catálogo ya cargado, por nombre, expansión o número…"
            className="w-full rounded-2xl border border-fairy-sleeve bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-fairy-soft"
          />
        </div>

        <div className="mt-6 space-y-3">
          {cards === null && (
            <p className="text-sm text-fairy-muted">Cargando cartas…</p>
          )}

          {cards !== null && filtered.length === 0 && (
            <p className="text-sm text-fairy-muted">No hay cartas que coincidan con la búsqueda.</p>
          )}

          {filtered.map((card) => (
            <CardStockRow
              key={card.id}
              card={card}
              expanded={expandedId === card.id}
              onToggle={() => setExpandedId(expandedId === card.id ? null : card.id)}
              onAdjust={handleAdjust}
              pendingKey={pendingKey}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function CardStockRow({ card, expanded, onToggle, onAdjust, pendingKey }) {
  const totalUnits = LANGUAGES.reduce(
    (sum, l) =>
      sum + FINISHES.reduce((s, f) => s + (card.stock?.[l.key]?.[f.key] ?? 0), 0),
    0
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-fairy-sleeve bg-white shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-4 py-3 text-left"
      >
        <img
          src={card.images?.EN || card.images?.ES || card.images?.JP}
          alt={card.name}
          className="h-14 w-10 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base text-fairy-ink">{card.name}</p>
          <p className="text-xs text-fairy-muted">
            {card.cardNumber}
            {card.totalInExpansion ? `/${card.totalInExpansion}` : ""} · {card.expansionName}
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-fairy-page px-3 py-1 text-xs font-semibold text-fairy-deep">
          {totalUnits} unid. totales
        </span>
      </button>

      {expanded && (
        <div className="border-t border-fairy-sleeve bg-fairy-cream/60 p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {LANGUAGES.map((lang) => (
              <div key={lang.key} className="rounded-xl border border-fairy-sleeve bg-white p-3">
                <p className="mb-2 font-display text-sm text-fairy-ink">{lang.label}</p>
                <div className="space-y-1.5">
                  {FINISHES.map((finish) => {
                    const value = card.stock?.[lang.key]?.[finish.key] ?? 0;
                    const key = `${card.id}-${lang.key}-${finish.key}`;
                    const isPending = pendingKey === key;
                    return (
                      <div key={finish.key} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-fairy-muted">{finish.label}</span>
                        <div className="flex items-center gap-1.5">
                          <StockButton
                            icon={Minus}
                            disabled={isPending || value <= 0}
                            onClick={() => onAdjust(card.id, lang.key, finish.key, -1)}
                          />
                          <span className="w-6 text-center text-sm font-semibold tabular-nums">
                            {isPending ? <Loader2 className="mx-auto animate-spin" size={14} /> : value}
                          </span>
                          <StockButton
                            icon={Plus}
                            disabled={isPending}
                            onClick={() => onAdjust(card.id, lang.key, finish.key, 1)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StockButton({ icon: Icon, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-fairy-sleeve bg-fairy-cream text-fairy-deep transition-colors hover:bg-fairy-soft hover:text-white disabled:opacity-30"
    >
      <Icon size={12} />
    </button>
  );
}
