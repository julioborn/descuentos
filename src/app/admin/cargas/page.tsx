'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';

type Carga = {
    _id: string;
    nombreEmpleado: string;
    dniEmpleado: string;
    producto: string;
    litros: number;
    precioFinal: number;
    precioFinalSinDescuento: number;
    fecha: string;
    moneda: string;
};

const ITEMS_POR_PAGINA = 5;

export default function CargasPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagina, setPagina] = useState(1);

    useEffect(() => {
        const fetchCargas = async () => {
            try {
                const res = await fetch('/api/cargas');
                if (res.ok) {
                    const data = await res.json();
                    setCargas(data);
                } else {
                    throw new Error('Error al cargar los datos');
                }
            } catch (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar las cargas registradas.',
                });
            } finally {
                setLoading(false);
            }
        };
        fetchCargas();
    }, []);

    if (loading) return <Loader />;

    const totalPaginas = Math.ceil(cargas.length / ITEMS_POR_PAGINA);
    const cargasPaginadas = cargas.slice(
        (pagina - 1) * ITEMS_POR_PAGINA,
        pagina * ITEMS_POR_PAGINA
    );

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-8">Cargas Registradas</h1>

            {/* Vista Desktop (Tabla) */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-6 shadow-xl max-w-6xl mx-auto">
                <table className="min-w-[700px] w-full text-sm">
                    <thead className="text-left bg-white/5 text-white">
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
                        {cargasPaginadas.map((c) => (
                            <tr key={c._id} className="hover:bg-white/10 transition">
                                <td className="p-3">{new Date(c.fecha).toLocaleString()}</td>
                                <td className="p-3">{c.nombreEmpleado}</td>
                                <td className="p-3">{c.dniEmpleado}</td>
                                <td className="p-3">{c.producto}</td>
                                <td className="p-3">{c.litros}</td>
                                <td className="p-3">{c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}</td>
                                <td className="p-3">{c.precioFinal.toLocaleString()} {c.moneda}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Vista Mobile (Cards) */}
            <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                {cargasPaginadas.map((c) => (
                    <div key={c._id} className="bg-white/5 rounded-lg p-4 border border-white/10 shadow-lg">
                        <p><span className="font-bold">Fecha:</span> {new Date(c.fecha).toLocaleString()}</p>
                        <p><span className="font-bold">Empleado:</span> {c.nombreEmpleado}</p>
                        <p><span className="font-bold">DNI:</span> {c.dniEmpleado}</p>
                        <p><span className="font-bold">Producto:</span> {c.producto}</p>
                        <p><span className="font-bold">Litros:</span> {c.litros}</p>
                        <p><span className="font-bold">Precio sin desc.:</span> {c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}</p>
                        <p><span className="font-bold">Precio final:</span> {c.precioFinal.toLocaleString()} {c.moneda}</p>
                    </div>
                ))}
            </div>

            {/* Paginación */}
            <div className="flex justify-center mt-8 gap-4 text-white">
                <button
                    onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                    disabled={pagina === 1}
                    className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
                >
                    Anterior
                </button>
                <span className="self-center">Página {pagina} de {totalPaginas}</span>
                <button
                    onClick={() => setPagina((p) => Math.min(p + 1, totalPaginas))}
                    disabled={pagina === totalPaginas}
                    className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
                >
                    Siguiente
                </button>
            </div>
        </main>
    );
}
