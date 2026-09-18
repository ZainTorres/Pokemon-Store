import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase"; // Ajusta la ruta a tu archivo de firebase

export async function importCardFromApi(apiCard) {
  // 1. Limpiamos y aseguramos que ningún campo sea 'undefined'
  const cardData = {
    tcgId: apiCard.id || "",
    name: apiCard.name || "Sin nombre",
    cardNumber: apiCard.localId || apiCard.number || "", // Usa localId o fallback a string vacío
    image: apiCard.image ? `${apiCard.image}/high.png` : "",
    stock: {
      es: { normal: 0, foil: 0 },
      en: { normal: 0, foil: 0 }
    },
    updatedAt: new Date().toISOString()
  };

  // 2. Guardamos en la colección 'cards' usando el ID de la carta como nombre del documento
  const cardRef = doc(db, "cards", apiCard.id);
  
  // setDoc con merge: true para no sobrescribir stock previo si ya existía
  await setDoc(cardRef, cardData, { merge: true });
}