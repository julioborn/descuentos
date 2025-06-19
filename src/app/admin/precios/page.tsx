'use client';
import { useEffect, useState } from 'react';

type Producto = {
    _id: string;
    producto: string;
    precio: number;
    moneda: 'ARS' | 'Gs';
};

export default function AdminPreciosPage() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        const fetchPrecios = async () => {
            try {
                const res = await fetch('/api/precios');
                const data = await res.json();
                setProductos(data);
            } catch (err) {
                setMensaje("Error al cargar productos.");
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
            setMensaje(`✅ Precio actualizado: ${producto.producto}`);
        } catch {
            setMensaje(`❌ Error al guardar ${producto.producto}`);
        }
    };

    const productosGs = productos.filter(p => p.moneda === 'Gs');
    const productosARS = productos.filter(p => p.moneda === 'ARS');

    return (
        <main className="min-h-screen p-6 bg-gray-100 text-gray-900">
            <h1 className="text-2xl font-bold mb-6">Editar precios de combustibles</h1>

            {mensaje && (
                <p className="mb-4 text-blue-600 font-medium">{mensaje}</p>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* Gs */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-green-700">Moneda: Guaraníes (Gs)</h2>
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
                                    className="w-full bg-green-600 text-white py-1 rounded hover:bg-green-700 transition"
                                >
                                    Guardar
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ARS */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-blue-700">Moneda: Pesos Argentinos (ARS)</h2>
                    <div className="space-y-4">
                        {productosARS.length === 0 ? (
                            <p className="text-gray-500">Aún no hay productos en ARS.</p>
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
                                        className="w-full bg-blue-600 text-white py-1 rounded hover:bg-blue-700 transition"
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
