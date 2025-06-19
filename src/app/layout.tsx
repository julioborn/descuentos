// src/app/layout.tsx
import SessionLayout from "@/components/SessionLayout";
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
      <head />
      <body className="bg-background text-foreground font-sans">
        <SessionLayout>{children}</SessionLayout>
      </body>
    </html>
  );
}
