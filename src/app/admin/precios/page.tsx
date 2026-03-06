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

    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);

    const { data: session, status } = useSession();
    const monedaUsuario = session?.user?.moneda as 'ARS' | 'Gs' | undefined;

    useEffect(() => {
        if (status !== 'authenticated') return;

        const fetchPrecios = async () => {
            try {
                const res = await fetch('/api/precios');
                if (!res.ok) throw new Error();

                const data = await res.json() as Producto[];

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

    const handlePrecioChange = (id: string, value: string) => {
        setProductos(prev =>
            prev.map(p =>
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
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
            });

        } catch {

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: `No se pudo actualizar ${producto.producto}`,
            });

        }
    };

    if (status === 'loading' || loading) return <Loader />;

    return (
        <main className="min-h-screen px-6 py-12 bg-gray-50">

            <h1 className="text-3xl font-bold text-center mb-10 text-[#111827]">
                Precios
            </h1>

            {productos.length === 0 ? (
                <p className="text-center text-gray-500">
                    No hay productos registrados para esta moneda.
                </p>
            ) : (

                <div className="max-w-3xl mx-auto space-y-6">

                    {productos.map((p) => (

                        <div
                            key={p._id}
                            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
                        >

                            <div className="text-lg font-semibold text-gray-800 mb-3">
                                {p.producto}
                            </div>

                            <div className="flex items-center gap-3">

                                <div className="relative w-full">

                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                        $
                                    </span>

                                    <input
                                        type="number"
                                        value={p.precio}
                                        step="0.01"
                                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                            handlePrecioChange(p._id, e.target.value)
                                        }
                                        className="w-full bg-gray-100 border border-gray-200 rounded-lg py-2 pl-8 pr-12 focus:outline-none focus:ring-2 focus:ring-[#801818]"
                                        placeholder={`Precio en ${p.moneda}`}
                                    />

                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                        {p.moneda}
                                    </span>

                                </div>

                                <button
                                    onClick={() => guardarCambios(p)}
                                    className="bg-[#801818] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm"
                                >
                                    Guardar
                                </button>

                            </div>

                        </div>

                    ))}

                </div>

            )}

        </main>
    );
}