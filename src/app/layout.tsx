export const metadata = {
  title: "Descuentos",
  description: "Sistema de carga con descuentos para empleados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-100 text-gray-900">{children}</body>
    </html>
  );
}
