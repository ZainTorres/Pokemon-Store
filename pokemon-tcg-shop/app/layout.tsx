import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kado Store",
  description: "Tu tienda favorita de coleccionables y productos exclusivos.",
  metadataBase: new URL("https://kado-store.netlify.app"),
  openGraph: {
    title: "Kado Store",
    description: "Tu tienda favorita de coleccionables y productos exclusivos.",
    url: "https://kado-store.netlify.app",
    siteName: "Kado Store",
    images: [
      {
        url: "/og.jpg", // Asegúrate de colocar tu imagen en la carpeta /public
        width: 1200,
        height: 630,
        alt: "Kado Store Logo",
      },
    ],
    locale: "es_PE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kado Store",
    description: "Tu tienda favorita de coleccionables y productos exclusivos.",
    images: ["/og.jpg"],
  },
};