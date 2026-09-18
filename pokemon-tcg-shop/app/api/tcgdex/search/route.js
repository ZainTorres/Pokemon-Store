export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get("name");

  if (!term || term.trim().length < 2) {
    return Response.json({ data: [] });
  }

  // Consulta limpia a la API de TCGdex en español
  const url = `https://api.tcgdex.net/v2/es/cards?name=${encodeURIComponent(term.trim())}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      return Response.json({ data: [], error: `TCGdex respondió ${res.status}` }, { status: 502 });
    }

    const cards = await res.json();
    
    // Devolvemos hasta 25 resultados
    const results = Array.isArray(cards) ? cards.slice(0, 25) : [];

    return Response.json({ data: results });
  } catch (err) {
    return Response.json({ data: [], error: "No se pudo contactar TCGdex" }, { status: 504 });
  }
}