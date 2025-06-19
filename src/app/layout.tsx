import "./globals.css";

export const metadata = {
  title: "Descuentos",
  description: "Sistema de carga con descuentos para empleados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-background text-foreground font-sans">{children}</body>
    </html>
  );
}
