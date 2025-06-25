'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    qrToken: string;
};

export default function EmpleadosPage() {
    /* --------------------------- estado general --------------------------- */
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [qrMap, setQrMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    /* --------------------------- paginación --------------------------- */
    const itemsPerPage = 5;
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(empleados.length / itemsPerPage));

    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentItems = empleados.slice(indexOfFirst, indexOfLast);

    /* --------------------------- router --------------------------- */
    const router = useRouter();

    /* --------------------------- obtener datos --------------------------- */
    useEffect(() => {
        const fetchEmpleados = async () => {
            try {
                const res = await fetch('/api/empleados');
                if (!res.ok) throw new Error();

                const data: Empleado[] = await res.json();
                setEmpleados(data);

                // Generar mapas de QRs
                const qrPromises = data.map(emp =>
                    QRCode.toDataURL(`${window.location.origin}/playero?token=${emp.qrToken}`)
                        .then(url => ({ id: emp._id, url }))
                        .catch(() => {
                            Swal.fire({
                                icon: 'error',
                                title: 'Error',
                                text: `No se pudo generar el QR para ${emp.nombre} ${emp.apellido}`,
                            });
                            return { id: emp._id, url: '' };
                        })
                );

                const qrData = await Promise.all(qrPromises);
                const map: Record<string, string> = {};
                qrData.forEach(({ id, url }) => (map[id] = url));
                setQrMap(map);
            } catch {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar los empleados.',
                });
            } finally {
                setLoading(false);
            }
        };

        fetchEmpleados();
    }, []);

    /* Si cambia la lista, volvemos a la página 1 */
    useEffect(() => setCurrentPage(1), [empleados]);

    if (loading) return <Loader />;

    /* -------------------------------------------------------------------- */
    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700">
            <h1 className="text-3xl font-bold text-center mb-8 text-white">
                Empleados Registrados
            </h1>

            {/* ---------- Botón registrar ---------- */}
            <div className="flex justify-center mb-8">
                <button
                    onClick={() => router.push('/admin/registrar-empleado')}
                    className="flex items-center gap-2 bg-red-800 text-white font-semibold px-6 py-3 rounded-xl hover:scale-105 transition-transform shadow"
                >
                    <span>Registrar Empleado</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                    </svg>
                </button>
            </div>

            {/* ---------- Vista MOBILE: tarjetas ---------- */}
            <div className="sm:hidden space-y-4">
                {currentItems.map(emp => (
                    <div
                        key={emp._id}
                        className="bg-white/10 text-white p-4 rounded-lg shadow space-y-1"
                    >
                        <div>
                            <strong>Apellido:</strong> {emp.apellido}
                        </div>
                        <div>
                            <strong>Nombre:</strong> {emp.nombre}
                        </div>
                        <div>
                            <strong>DNI:</strong> {emp.dni}
                        </div>
                        <div>
                            <strong>Teléfono:</strong> {emp.telefono}
                        </div>
                        <div>
                            <strong>Empresa:</strong> {emp.empresa}
                        </div>
                        <div className="flex justify-center pt-2">
                            {qrMap[emp._id] ? (
                                <img
                                    src={qrMap[emp._id]}
                                    alt="QR"
                                    className="w-24 h-24 border border-white/20 rounded"
                                />
                            ) : (
                                <Loader />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ---------- Vista DESKTOP: tabla ---------- */}
            <div className="hidden sm:block">
                <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-6 shadow-xl max-w-5xl mx-auto">
                    <table className="min-w-[700px] w-full text-sm">
                        <thead className="text-left bg-white/5">
                            <tr>
                                <th className="p-3 text-white">Apellido</th>
                                <th className="p-3 text-white">Nombre</th>
                                <th className="p-3 text-white">DNI</th>
                                <th className="p-3 text-white">Teléfono</th>
                                <th className="p-3 text-white">Empresa</th>
                                <th className="p-3 text-white">QR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.map(emp => (
                                <tr key={emp._id} className="hover:bg-white/10 transition">
                                    <td className="p-2 text-white">{emp.apellido}</td>
                                    <td className="p-2 text-white">{emp.nombre}</td>
                                    <td className="p-2 text-white">{emp.dni}</td>
                                    <td className="p-2 text-white">{emp.telefono}</td>
                                    <td className="p-2 text-white">{emp.empresa}</td>
                                    <td className="p-2">
                                        {qrMap[emp._id] ? (
                                            <img
                                                src={qrMap[emp._id]}
                                                alt="QR"
                                                className="w-16 h-16 border border-white/20 rounded"
                                            />
                                        ) : (
                                            <Loader />
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ---------- Paginación ---------- */}
            {totalPages > 1 && (
                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 bg-white/10 text-white rounded disabled:opacity-30"
                    >
                        Anterior
                    </button>
                    <span className="text-white self-center">
                        Página {currentPage} de {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 bg-white/10 text-white rounded disabled:opacity-30"
                    >
                        Siguiente
                    </button>
                </div>
            )}
        </main>
    );
}
