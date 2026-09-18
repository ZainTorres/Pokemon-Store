import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kado Store",
  description: "Tu tienda de coleccionables, cartas y cultura pop.",
  metadataBase: new URL("https://kado-store.netlify.app"),
  openGraph: {
    title: "Kado Store",
    description: "Tu tienda de coleccionables, cartas y cultura pop.",
    url: "https://kado-store.netlify.app",
    siteName: "Kado Store",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Kado Store Banner",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kado Store",
    description: "Tu tienda de coleccionables, cartas y cultura pop.",
    images: ["/og.jpg"],
  },
};

// ESTA PARTE ES OBLIGATORIA (export default)
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}