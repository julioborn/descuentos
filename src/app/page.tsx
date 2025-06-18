export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 px-4 text-center">
      <h1 className="text-3xl sm:text-5xl font-bold mb-8">Sistema de Cargas con Descuento</h1>

      <div className="flex flex-col sm:flex-row gap-6">
        <a
          href="/admin"
          className="bg-blue-600 text-white px-8 py-4 rounded text-lg shadow hover:bg-blue-700 transition"
        >
          Ingresar como Administrador
        </a>

        <a
          href="/playero"
          className="bg-green-600 text-white px-8 py-4 rounded text-lg shadow hover:bg-green-700 transition"
        >
          Ingresar como Playero
        </a>
      </div>
    </main>
  );
}
