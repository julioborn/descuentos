'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';

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
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [qrMap, setQrMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEmpleados = async () => {
            try {
                const res = await fetch('/api/empleados');
                if (!res.ok) throw new Error('Error al obtener los empleados');

                const data = await res.json();
                setEmpleados(data);

                const qrData = await Promise.all(
                    data.map((emp: Empleado) =>
                        QRCode.toDataURL(`${window.location.origin}/playero?token=${emp.qrToken}`)
                            .then((url) => ({ id: emp._id, url }))
                            .catch(() => {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Error',
                                    text: `No se pudo generar el QR para ${emp.nombre} ${emp.apellido}`,
                                });
                                return { id: emp._id, url: '' };
                            })
                    )
                );

                const map: Record<string, string> = {};
                qrData.forEach(({ id, url }) => (map[id] = url));
                setQrMap(map);
            } catch (error) {
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

    if (loading) return <Loader />;

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700">
            <h1 className="text-3xl font-bold text-center mb-8 text-white">Empleados Registrados</h1>

            <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-6 shadow-xl max-w-5xl mx-auto">
                <table className="min-w-[700px] w-full text-sm">
                    <thead className="text-left bg-white/5">
                        <tr>
                            <th className="p-3 text-white">Nombre</th>
                            <th className="p-3 text-white">Apellido</th>
                            <th className="p-3 text-white">DNI</th>
                            <th className="p-3 text-white">Teléfono</th>
                            <th className="p-3 text-white">Empresa</th>
                            <th className="p-3 text-white">QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.map((emp) => (
                            <tr key={emp._id} className="hover:bg-white/10 transition">
                                <td className="p-2 text-white">{emp.nombre}</td>
                                <td className="p-2 text-white">{emp.apellido}</td>
                                <td className="p-2 text-white">{emp.dni}</td>
                                <td className="p-2 text-white">{emp.telefono}</td>
                                <td className="p-2 text-white">{emp.empresa}</td>
                                <td className="p-2">
                                    {qrMap[emp._id] ? (
                                        <img
                                            src={qrMap[emp._id]}
                                            alt="QR"
                                            className="w-16 h-16 rounded border border-white/20"
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
        </main>
    );
}
