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

    if (status === 'loading' || loading) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                            Configuración
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                            Precios
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#801818]" />
                        {productos.length} {productos.length === 1 ? 'producto' : 'productos'}
                    </div>
                </div>

                {productos.length === 0 ? (
                    <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
                        <p className="text-sm text-stone-500">
                            No hay productos registrados para esta moneda.
                        </p>
                    </div>
                ) : (

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {productos.map((p) => (

                            <div
                                key={p._id}
                                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm"
                            >

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#801818]/10 text-[#801818]">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                                        </svg>
                                    </div>
                                    <div className="text-base font-semibold text-stone-800">
                                        {p.producto}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">

                                    <div className="relative w-full">

                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                                            $
                                        </span>

                                        <input
                                            type="number"
                                            value={p.precio}
                                            step="0.01"
                                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                                                handlePrecioChange(p._id, e.target.value)
                                            }
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pl-8 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 transition"
                                            placeholder={`Precio en ${p.moneda}`}
                                        />

                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                                            {p.moneda}
                                        </span>

                                    </div>

                                    <button
                                        onClick={() => guardarCambios(p)}
                                        className="bg-[#801818] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-sm"
                                    >
                                        Guardar
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}
            </div>
        </main>
    );
}