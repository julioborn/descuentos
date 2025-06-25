'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';

type Carga = {
    _id: string;
    nombreEmpleado: string;
    dniEmpleado: string;
    producto: string;
    litros: number;
    precioFinal: number;
    precioFinalSinDescuento?: number;
    fecha: string;
    moneda: string;
};

const ITEMS = 5;

export default function CargasPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);

    /* ---- filtros ---- */
    const [busqueda, setBusqueda] = useState('');
    const [productoFiltro, setProductoFiltro] = useState<'TODOS' | string>('TODOS');
    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        const fetchCargas = async () => {
            try {
                const res = await fetch('/api/cargas');
                if (!res.ok) throw new Error();
                setCargas(await res.json());
            } catch {
                Swal.fire('Error', 'No se pudieron cargar las cargas.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCargas();
    }, []);

    /* productos únicos para select */
    const productosUnicos = useMemo(
        () => Array.from(new Set(cargas.map((c) => c.producto))).sort(),
        [cargas]
    );

    /* lista filtrada */
    const filtradas = useMemo(() => {
        const txt = busqueda.trim().toLowerCase();

        return cargas.filter((c) => {
            const coincideTxt =
                !txt ||
                `${c.nombreEmpleado} ${c.dniEmpleado}`.toLowerCase().includes(txt);

            const coincideProd =
                productoFiltro === 'TODOS' || c.producto === productoFiltro;

            return coincideTxt && coincideProd;
        });
    }, [cargas, busqueda, productoFiltro]);

    /* paginación */
    const totalPag = Math.ceil(filtradas.length / ITEMS);
    const págActual = Math.min(pagina, totalPag || 1);
    const pageList = filtradas.slice(
        (págActual - 1) * ITEMS,
        págActual * ITEMS
    );

    if (loading) return <Loader />;

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-6">Cargas</h1>

            {/* -------- filtros -------- */}
            <section className="flex flex-col sm:flex-row gap-4 max-w-4xl mx-auto mb-6">
                <input
                    value={busqueda}
                    onChange={(e) => {
                        setBusqueda(e.target.value);
                        setPagina(1);
                    }}
                    placeholder="Buscar por nombre o DNI…"
                    className="flex-1 rounded px-4 py-2 bg-gray-800 border border-gray-600"
                />

                <select
                    value={productoFiltro}
                    onChange={(e) => {
                        setProductoFiltro(e.target.value);
                        setPagina(1);
                    }}
                    className="rounded px-3 py-2 bg-gray-800 border border-gray-600"
                >
                    <option value="TODOS">Todos los productos</option>
                    {productosUnicos.map((p) => (
                        <option key={p}>{p}</option>
                    ))}
                </select>
            </section>

            {/* -------- Tabla desktop -------- */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-6 shadow-xl max-w-6xl mx-auto">
                <table className="min-w-[800px] w-full text-sm">
                    <thead className="bg-white/5 text-white">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Empleado</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Litros</th>
                            <th className="p-3">Precio sin desc.</th>
                            <th className="p-3">Precio final</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageList.map((c) => (
                            <tr key={c._id} className="hover:bg-white/10 transition">
                                <td className="p-3">{new Date(c.fecha).toLocaleString()}</td>
                                <td className="p-3">{c.nombreEmpleado}</td>
                                <td className="p-3">{c.dniEmpleado}</td>
                                <td className="p-3">{c.producto}</td>
                                <td className="p-3">{c.litros}</td>
                                <td className="p-3">
                                    {c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}
                                </td>
                                <td className="p-3">
                                    {c.precioFinal.toLocaleString()} {c.moneda}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* -------- Cards mobile -------- */}
            <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                {pageList.map((c) => (
                    <div
                        key={c._id}
                        className="bg-white/5 rounded-lg p-4 border border-white/10 shadow-lg"
                    >
                        <p><b>{c.nombreEmpleado}</b> – {c.producto}</p>
                        <p>DNI: {c.dniEmpleado}</p>
                        <p>Litros: {c.litros}</p>
                        <p>Fecha: {new Date(c.fecha).toLocaleString()}</p>
                        <p>Comp. sin desc.: {c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}</p>
                        <p>Total: {c.precioFinal.toLocaleString()} {c.moneda}</p>
                    </div>
                ))}
            </div>

            {/* -------- Paginación -------- */}
            {totalPag > 1 && (
                <div className="flex justify-center mt-8 gap-4">
                    <button
                        onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                        disabled={págActual === 1}
                        className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
                    >
                        Anterior
                    </button>
                    <span className="self-center">
                        Página {págActual} de {totalPag}
                    </span>
                    <button
                        onClick={() => setPagina((p) => Math.min(p + 1, totalPag))}
                        disabled={págActual === totalPag}
                        className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </main>
    );
}
