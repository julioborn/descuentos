'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';

type Producto = {
    _id: string;
    producto: string;
    precio: number;
    moneda: 'ARS' | 'Gs';
};

export default function AdminPreciosPage() {
    /* ---------------- estado ---------------- */
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    /* ---------------- sesión ---------------- */
    const { data: session, status } = useSession();
    const monedaUsuario = session?.user?.moneda as 'ARS' | 'Gs' | undefined;

    /* ---------------- fetch inicial ---------------- */
    useEffect(() => {
        if (status !== 'authenticated') return;

        const fetchPrecios = async () => {
            try {
                const res = await fetch('/api/precios');
                if (!res.ok) throw new Error();
                const data = (await res.json()) as Producto[];
                console.log("Moneda del usuario:", monedaUsuario);
                console.log("Productos recibidos:", data);

                const filtrados = monedaUsuario
                    ? data.filter((p) => p.moneda === monedaUsuario)
                    : [];

                const ordenDeseado = ['GAS OIL', 'EURO', 'NAFTA SUPER', 'NAFTA ECO'];

                const ordenados = filtrados.sort((a, b) => {
                    const idxA = ordenDeseado.indexOf(a.producto.toUpperCase());
                    const idxB = ordenDeseado.indexOf(b.producto.toUpperCase());
                    return idxA - idxB;
                });

                setProductos(ordenados);
            } catch {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar los productos.',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchPrecios();
    }, [status, monedaUsuario]);

    /* ---------------- handlers ---------------- */
    const handlePrecioChange = (id: string, value: string) => {
        setProductos((prev) =>
            prev.map((p) =>
                p._id === id ? { ...p, precio: parseFloat(value) } : p
            )
        );
    };

    const guardarCambios = async (producto: Producto) => {
        try {
            const res = await fetch(`/api/precios/${producto._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ precio: producto.precio }),
            });
            if (!res.ok) throw new Error();

            Swal.fire({
                icon: 'success',
                title: 'Precio actualizado',
                text: `Producto: ${producto.producto}`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
            });
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo actualizar el producto: ${producto.producto}`,
            });
        }
    };

    /* ---------------- UI ---------------- */
    if (status === 'loading' || loading) return <Loader />;

    return (
        <main className="min-h-screen p-6 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-8">
                Precios
            </h1>

            {productos.length === 0 ? (
                <p className="text-center text-gray-300">
                    Aún no hay productos registrados para esta moneda.
                </p>
            ) : (
                <div className="max-w-3xl mx-auto space-y-6">
                    {productos.map((p) => (
                        <div key={p._id} className="bg-gray-800 p-4 rounded shadow">
                            <div className="mb-2 font-semibold">{p.producto}</div>

                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold pointer-events-none">
                                    $
                                </span>

                                <input
                                    type="number"
                                    value={p.precio}
                                    step="0.01"
                                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                        handlePrecioChange(p._id, e.target.value)
                                    }
                                    className="w-full border p-2 pl-8 pr-12 rounded text-black"
                                    placeholder={`Precio en ${p.moneda}`}
                                />

                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold pointer-events-none">
                                    {p.moneda}
                                </span>
                            </div>

                            <button
                                onClick={() => guardarCambios(p)}
                                className="w-full bg-red-800 text-white py-1 rounded hover:bg-red-700 transition"
                            >
                                Guardar
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}
