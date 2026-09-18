# Pokémon TCG Inventory — Guía del Proyecto

Stack: **Next.js (App Router) + Tailwind CSS + Firebase (Auth + Firestore)**.

---

## 1. Estructura del proyecto (Next.js)

```
pokemon-tcg-shop/
├─ app/
│  ├─ layout.jsx                  # Fuentes (Baloo 2 + Inter), theme provider
│  ├─ page.jsx                    # Vista pública "CARPETA" → <CarpetaPublica />
│  ├─ globals.css                 # Tailwind + tokens de color
│  └─ admin/
│     ├─ layout.jsx               # Guard de autenticación (redirige si no hay sesión)
│     ├─ login/page.jsx           # Formulario de login (Firebase Auth)
│     └─ dashboard/page.jsx       # → <AdminStock /> + buscador pokemontcg.io
├─ components/
│  ├─ CarpetaPublica.jsx
│  ├─ AdminStock.jsx
│  ├─ CardBinderTile.jsx          # (opcional: extraído de CarpetaPublica)
│  └─ ui/ ...
├─ lib/
│  ├─ firebase.js                 # Inicialización del SDK
│  ├─ firestore-cards.js          # Funciones CRUD de cartas/stock
│  └─ pokemonTcgApi.js            # Cliente de pokemontcg.io
├─ hooks/
│  └─ useAuth.js
├─ tailwind.config.js
├─ next.config.js
└─ package.json
```

### Dependencias clave
```bash
npm install firebase lucide-react
```

### `lib/firebase.js`
```js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### `tailwind.config.js` (extracto — paleta Hada)
```js
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        fairy: {
          cream: "#FFF6FB",
          page: "#FFE1F0",
          sleeve: "#FFD0E8",
          soft: "#FFB8DD",
          DEFAULT: "#FF6FB8",
          deep: "#E0499A",
          ink: "#2E1F2B",
          muted: "#7A4A68",
        },
      },
      fontFamily: {
        display: ["var(--font-baloo)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
```

En `app/layout.jsx` carga las fuentes con `next/font/google` (`Baloo_2` y `Inter`) y expón sus variables CSS `--font-baloo` / `--font-inter`.

---

## 2. Modelo de datos en Firestore

Decisión de diseño: cada **variante física** de una carta es la combinación **Idioma × Acabado/Rareza**. En vez de crear un documento por variante (21 combinaciones posibles por carta, la mayoría en 0), el stock se guarda como un **mapa anidado dentro del propio documento de la carta**. Esto permite:
- Leer una carta completa (con todo su stock) en **una sola lectura**.
- Incrementar/decrementar una variante puntual con `FieldValue.increment()` sobre una ruta con notación de punto, sin traer todo el documento primero (evita condiciones de carrera).

### Colección `cards`
```
cards/{cardId}                 // cardId sugerido: "{expansionId}-{cardNumber}" ej: "sv08-ir-186"
{
  name: "Pikachu ex",
  cardNumber: "186",
  totalInExpansion: "197",           // "186/197" para mostrar
  expansionId: "sv08",
  expansionName: "Surging Sparks",
  series: "Scarlet & Violet",
  releaseDate: "2024-11-08",
  supertype: "Pokémon",              // Pokémon | Entrenador | Energía
  pokemonTcgIoId: "sv8-186",         // referencia a la API externa
  images: {
    EN: "https://images.pokemontcg.io/sv8/186_hires.png",
    ES: "https://.../es/sv8/186_hires.png",   // si no hay, se usa EN como fallback
    JP: "https://.../jp/sv8/186_hires.png"
  },
  rarityLabel: "Special Illustration Rare",

  // ---- STOCK: idioma → acabado/rareza → cantidad ----
  stock: {
    EN: { normal: 0, reverse: 0, holo: 0, fullart: 0, ir: 0, sir: 3, secreta: 0 },
    ES: { normal: 2, reverse: 1, holo: 0, fullart: 0, ir: 0, sir: 0, secreta: 0 },
    JP: { normal: 0, reverse: 0, holo: 0, fullart: 0, ir: 1, sir: 0, secreta: 0 }
  },

  price: { ES: 4.5, EN: 5.0, JP: 6.0 },  // opcional, por idioma
  active: true,
  createdAt: <Timestamp>,
  updatedAt: <Timestamp>
}
```

**Claves de acabado/rareza** (usadas como llaves del mapa, siempre las mismas 7):
`normal | reverse | holo | fullart | ir | sir | secreta`

### Colección `expansions`
Sirve para poblar los filtros sin escanear todas las cartas.
```
expansions/{expansionId}
{
  name: "Surging Sparks",
  series: "Scarlet & Violet",
  releaseDate: "2024-11-08",
  logoUrl: "...",
  cardCount: 191
}
```

### Colección `admins` (opcional, además de Firebase Auth)
```
admins/{uid}
{ email: "admin@tutienda.com", role: "owner" }
```
Úsala para reglas de seguridad basadas en existencia del documento, no solo en "usuario autenticado" (por si en el futuro quieres invitar staff con permisos limitados).

### Reglas de seguridad (Firestore) — punto de partida
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /cards/{cardId} {
      allow read: if true;                                   // catálogo público
      allow write: if exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    match /expansions/{id} {
      allow read: if true;
      allow write: if exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }
    match /admins/{uid} {
      allow read, write: if false; // gestiona esta colección solo desde la consola de Firebase
    }
  }
}
```

### `lib/firestore-cards.js` (funciones de stock)
```js
import { db } from "./firebase";
import { doc, updateDoc, increment, setDoc } from "firebase/firestore";

// Suma o resta stock de una variante puntual sin leer el documento antes.
export async function adjustStock(cardId, lang, finish, delta) {
  const ref = doc(db, "cards", cardId);
  await updateDoc(ref, {
    [`stock.${lang}.${finish}`]: increment(delta),
    updatedAt: new Date(),
  });
}

export async function createOrUpdateCard(cardId, data) {
  const ref = doc(db, "cards", cardId);
  await setDoc(ref, data, { merge: true });
}
```

---

## 3. Integración con pokemontcg.io (autocompletado de datos e imágenes)

### Paso 1 — Cuenta y API Key
1. Regístrate en https://pokemontcg.io/ y genera tu API Key gratuita.
2. Guárdala como variable de entorno **de servidor** (no pública): `POKEMONTCG_API_KEY`.
   > La API permite consultas sin key, pero con límites de rate muy bajos; con key subes el límite considerablemente.

### Paso 2 — Ruta proxy en Next.js (evita exponer la key en el cliente)
`app/api/pokemontcg/search/route.js`
```js
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q"); // ej: name:pikachu set.id:sv8

  const res = await fetch(
    `https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=20`,
    { headers: { "X-Api-Key": process.env.POKEMONTCG_API_KEY } }
  );
  const data = await res.json();
  return Response.json(data);
}
```

### Paso 3 — Cliente de búsqueda (`lib/pokemonTcgApi.js`)
```js
export async function searchCards(term) {
  const q = `name:"${term}*"`;
  const res = await fetch(`/api/pokemontcg/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("Error consultando pokemontcg.io");
  const { data } = await res.json();
  // Filtra a los últimos 5 años en el propio front si lo necesitas:
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  return data.filter((c) => new Date(c.set.releaseDate) >= fiveYearsAgo);
}
```

### Paso 4 — Mapear el resultado al modelo de Firestore
Cuando el admin selecciona un resultado del autocompletado, transforma la respuesta de la API a tu esquema antes de guardar:
```js
function mapApiCardToFirestore(apiCard) {
  return {
    name: apiCard.name,
    cardNumber: apiCard.number,
    totalInExpansion: apiCard.set.printedTotal?.toString() ?? "",
    expansionId: apiCard.set.id,
    expansionName: apiCard.set.name,
    series: apiCard.set.series,
    releaseDate: apiCard.set.releaseDate,
    supertype: apiCard.supertype,
    pokemonTcgIoId: apiCard.id,
    images: { EN: apiCard.images.large }, // ES/JP se completan manualmente si tienes otra fuente
    rarityLabel: apiCard.rarity ?? "",
    stock: {
      EN: { normal: 0, reverse: 0, holo: 0, fullart: 0, ir: 0, sir: 0, secreta: 0 },
      ES: { normal: 0, reverse: 0, holo: 0, fullart: 0, ir: 0, sir: 0, secreta: 0 },
      JP: { normal: 0, reverse: 0, holo: 0, fullart: 0, ir: 0, sir: 0, secreta: 0 },
    },
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
```

> **Nota sobre idiomas:** pokemontcg.io solo trae imágenes en inglés. Para ES/JP normalmente se completa manualmente (o con TCGdex, que sí tiene variantes multi-idioma: https://www.tcgdex.dev/). Puedes dejar `images.ES`/`images.JP` vacíos y que el front haga fallback a `images.EN`.

---

## 4. Despliegue del frontend en Netlify

1. **Conecta el repo**: en Netlify → *Add new site* → *Import an existing project* → selecciona tu repositorio (GitHub/GitLab).
2. **Build settings** (Netlify detecta Next.js automáticamente con el plugin oficial, pero confirma):
   - Build command: `next build`
   - Publish directory: `.next` (con el plugin `@netlify/plugin-nextjs`, que Netlify instala solo)
3. **Variables de entorno** (Site settings → Environment variables), copia todas las de tu `.env.local`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   POKEMONTCG_API_KEY=...
   ```
4. **Dominios autorizados en Firebase Auth**: Firebase Console → Authentication → Settings → *Authorized domains* → agrega tu dominio de Netlify (`tu-sitio.netlify.app` y tu dominio personalizado si lo tienes).
5. **Deploy**: cada push a la rama principal despliega automáticamente. Puedes forzar un deploy manual desde *Deploys → Trigger deploy*.
6. (Opcional) **Dominio propio**: Site settings → Domain management → Add custom domain, y sigue las instrucciones DNS.

---

## 5. Autenticación del panel (guard de rutas)

- `hooks/useAuth.js` — hook que expone `{ user, loading }` escuchando `onAuthStateChanged`.
- `app/admin/layout.jsx` — envuelve todo lo de `/admin/*`: si no hay sesión, redirige a `/admin/login`; si ya hay sesión y estás en `/admin/login`, redirige a `/admin/dashboard`.
- `app/admin/login/page.jsx` — formulario de email/contraseña contra Firebase Auth.
- `app/admin/dashboard/page.jsx` — renderiza `<AdminStock />` con botón de cerrar sesión.
- `app/page.jsx` — la home pública, renderiza `<CarpetaPublica />`.

**Crea el primer usuario manualmente**: Firebase Console → Authentication → Users → Add user. No hay formulario de registro público a propósito — el panel es solo para ti/tu equipo.

## 6. Variable de entorno pendiente de tu lado

Todo el código ya está listo para usar pokemontcg.io; solo falta que **tú generes tu propia API key gratuita** en https://pokemontcg.io/ y la agregues como variable de entorno de servidor:

```
POKEMONTCG_API_KEY=tu_key_aquí
```

Local: en `.env.local`. En producción (Netlify): Site settings → Environment variables. **No lleva el prefijo `NEXT_PUBLIC_`** porque solo se usa dentro de `app/api/pokemontcg/search/route.js` (lado servidor) — nunca llega al navegador del admin.

## Resumen de archivos entregados
- `01-GUIA-PROYECTO.md` — este documento.
- `CarpetaPublica.jsx` — vista pública tipo binder.
- `AdminStock.jsx` — panel de administración de stock (ya incluye el buscador de importación).
- `BuscadorImportarCarta.jsx` — componente de búsqueda/autocompletado de pokemontcg.io → `components/`.
- `route.js` — proxy server-side hacia pokemontcg.io → `app/api/pokemontcg/search/route.js`.
- `firestore-cards.js` — funciones de importación y ajuste de stock → `lib/`.
- `useAuth.js` — hook de sesión → `hooks/useAuth.js`.
- `admin-layout.jsx` — guard de autenticación → `app/admin/layout.jsx`.
- `login-page.jsx` — formulario de login → `app/admin/login/page.jsx`.
- `dashboard-page.jsx` — página del dashboard → `app/admin/dashboard/page.jsx`.
- `home-page.jsx` — home pública → `app/page.jsx`.
