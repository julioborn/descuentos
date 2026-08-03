// src/app/layout.tsx
import SessionLayout from "@/components/SessionLayout";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Descuentos",
  description: "Sistema de carga con descuentos para empleados",
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
      </head>
      <body className="bg-background text-foreground font-sans">
        <RegisterSW />
        <SessionLayout>{children}</SessionLayout>
      </body>
    </html>
  );
}
