'use client';

import { useEffect, useState } from 'react';
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

    useEffect(() => {
        const fetchPrecios = async () => {
            try {
                const res = await fetch('/api/precios');
                if (!res.ok) throw new Error();
                const data = await res.json();
                setProductos(data);
            } catch (err) {
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
    }, []);

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

    const productosGs = productos.filter(p => p.moneda === 'Gs');
    const productosARS = productos.filter(p => p.moneda === 'ARS');

    if (loading) return <Loader />;

    return (
        <main className="min-h-screen p-6 bg-gray-700 text-gray-900">
            <h1 className="text-3xl font-bold text-center mb-8 text-white">Precios</h1>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Gs */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-white">Moneda: Guaraníes (Gs)</h2>
                    <div className="space-y-4">
                        {productosGs.map(p => (
                            <div key={p._id} className="bg-white p-4 rounded shadow">
                                <div className="mb-2 font-semibold">{p.producto}</div>
                                <input
                                    type="number"
                                    value={p.precio}
                                    step="0.01"
                                    onChange={e => handlePrecioChange(p._id, e.target.value)}
                                    className="w-full border p-2 rounded mb-2"
                                    placeholder="Precio en Gs"
                                />
                                <button
                                    onClick={() => guardarCambios(p)}
                                    className="w-full bg-red-800 text-white py-1 rounded hover:bg-red-700 transition"
                                >
                                    Guardar
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ARS */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-white">Moneda: Pesos Argentinos (ARS)</h2>
                    <div className="space-y-4">
                        {productosARS.length === 0 ? (
                            <p className="text-gray-400">Aún no hay productos en ARS.</p>
                        ) : (
                            productosARS.map(p => (
                                <div key={p._id} className="bg-white p-4 rounded shadow">
                                    <div className="mb-2 font-semibold">{p.producto}</div>
                                    <input
                                        type="number"
                                        value={p.precio}
                                        step="0.01"
                                        onChange={e => handlePrecioChange(p._id, e.target.value)}
                                        className="w-full border p-2 rounded mb-2"
                                        placeholder="Precio en ARS"
                                    />
                                    <button
                                        onClick={() => guardarCambios(p)}
                                        className="w-full bg-red-800 text-white py-1 rounded hover:bg-red-700 transition"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}
