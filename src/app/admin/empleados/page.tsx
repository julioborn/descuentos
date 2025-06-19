'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

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

    useEffect(() => {
        const fetchEmpleados = async () => {
            const res = await fetch('/api/empleados');
            if (res.ok) {
                const data = await res.json();
                setEmpleados(data);

                const qrData = await Promise.all(
                    data.map((emp: Empleado) =>
                        QRCode.toDataURL(`${window.location.origin}/playero?token=${emp.qrToken}`).then((url) => ({ id: emp._id, url }))
                    )
                );
                const map: Record<string, string> = {};
                qrData.forEach(({ id, url }) => (map[id] = url));
                setQrMap(map);
            }
        };
        fetchEmpleados();
    }, []);

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700">
            <h1 className="text-3xl font-bold text-center mb-8">Empleados Registrados</h1>

            <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-6 shadow-xl max-w-5xl mx-auto">
                <table className="min-w-[700px] w-full text-sm">
                    <thead className="text-left bg-white/5">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Apellido</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Teléfono</th>
                            <th className="p-3">Empresa</th>
                            <th className="p-3">QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.map((emp) => (
                            <tr key={emp._id} className="hover:bg-white/10 transition">
                                <td className="p-2">{emp.nombre}</td>
                                <td className="p-2">{emp.apellido}</td>
                                <td className="p-2">{emp.dni}</td>
                                <td className="p-2">{emp.telefono}</td>
                                <td className="p-2">{emp.empresa}</td>
                                <td className="p-2">
                                    {qrMap[emp._id] ? (
                                        <img src={qrMap[emp._id]} alt="QR" className="w-16 h-16 rounded border border-white/20" />
                                    ) : (
                                        <span className="text-gray-400">Cargando...</span>
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
