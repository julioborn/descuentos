'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader'; // Asegurate de que esta ruta coincida

type Carga = {
    _id: string;
    nombreEmpleado: string;
    dniEmpleado: string;
    producto: string;
    litros: number;
    precioFinal: number;
    fecha: string;
    moneda: string;
};

export default function CargasPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700">
            <h1 className="text-3xl font-bold text-center mb-8">Cargas Registradas</h1>

            <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-6 shadow-xl max-w-5xl mx-auto">
                <table className="min-w-[700px] w-full text-sm">
                    <thead className="text-left bg-white/5">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">Empleado</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3">Litros</th>
                            <th className="p-3">Precio</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargas.map((c) => (
                            <tr key={c._id} className="hover:bg-white/10 transition">
                                <td className="p-3">{new Date(c.fecha).toLocaleString()}</td>
                                <td className="p-3">{c.nombreEmpleado}</td>
                                <td className="p-3">{c.dniEmpleado}</td>
                                <td className="p-3">{c.producto}</td>
                                <td className="p-3">{c.litros}</td>
                                <td className="p-3">
                                    {c.precioFinal.toLocaleString()}{' '}
                                    <span className="text-sm">{c.moneda}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
