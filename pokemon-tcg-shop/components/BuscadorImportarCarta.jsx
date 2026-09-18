"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Loader2, Check, PlusCircle } from "lucide-react";
import { importCardFromApi } from "@/lib/firestore-cards";

export default function BuscadorImportarCarta() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importedIds, setImportedIds] = useState(new Set());
  const [importingId, setImportingId] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (term.trim().length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        // Se conecta a la ruta activa de TCGdex
        const res = await fetch(`/api/tcgdex/search?name=${encodeURIComponent(term.trim())}`);
        const json = await res.json();
        setResults(json.data ?? []);
        setError(json.error ?? null);
      } catch {
        setError("No se pudo buscar en este momento.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400); // debounce: evita una llamada por cada tecla

    return () => clearTimeout(debounceRef.current);
  }, [term]);

  async function handleImport(apiCard) {
    setImportingId(apiCard.id);
    try {
      await importCardFromApi(apiCard);
      setImportedIds((prev) => new Set(prev).add(apiCard.id));
    } catch (err) {
      console.error(err);
      alert("No se pudo importar la carta. Intenta de nuevo.");
    } finally {
      setImportingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-fairy-sleeve bg-white p-4 shadow-sm">
      <p className="font-display text-lg text-fairy-ink">Agregar carta nueva</p>
      <p className="mt-0.5 text-xs text-fairy-muted">
        Busca en TCGdex e impórtala al catálogo con un clic.
      </p>

      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-fairy-muted" size={18} />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Ej: Pikachu, Charizard ex, Umbreon…"
          className="w-full rounded-xl border border-fairy-sleeve bg-fairy-cream py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-fairy-soft"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-fairy-muted" size={16} />
        )}
      </div>

      {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

      {results.length > 0 && (
        <div className="mt-3 max-h-80 space-y-1.5 overflow-y-auto pr-1">
          {results.map((apiCard) => {
            const alreadyImported = importedIds.has(apiCard.id);
            const isImporting = importingId === apiCard.id;
            // TCGdex devuelve la URL base de la imagen; agregamos /low.png para la miniatura
            const imageUrl = apiCard.image ? `${apiCard.image}/low.png` : null;

            return (
              <div
                key={apiCard.id}
                className="flex items-center gap-3 rounded-xl border border-fairy-sleeve/70 p-2"
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={apiCard.name}
                    className="h-14 w-10 rounded-md object-contain bg-gray-50"
                  />
                ) : (
                  <div className="flex h-14 w-10 items-center justify-center rounded-md bg-gray-100 text-[9px] text-gray-400">
                    Sin foto
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fairy-ink">{apiCard.name}</p>
                  <p className="truncate text-xs text-fairy-muted">
                    N.º {apiCard.localId || "—"} · {apiCard.id}
                  </p>
                </div>
                <button
                  onClick={() => handleImport(apiCard)}
                  disabled={alreadyImported || isImporting}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                    alreadyImported
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-fairy text-white hover:bg-fairy-deep"
                  } disabled:opacity-70`}
                >
                  {isImporting ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : alreadyImported ? (
                    <Check size={14} />
                  ) : (
                    <PlusCircle size={14} />
                  )}
                  {alreadyImported ? "Importada" : "Importar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {term.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <p className="mt-3 text-xs text-fairy-muted">
          Sin resultados para “{term}”.
        </p>
      )}
    </div>
  );
}