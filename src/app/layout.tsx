import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Descuentos",
  description: "Sistema de carga con descuentos para empleados",
  manifest: "/manifest.json",
  themeColor: "#0f172a",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
