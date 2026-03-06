'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
    FuelIcon,
    UsersIcon,
    DollarSign,
    Percent,
    BarChart3,
    GraduationCap
} from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();
    const [cargasNuevas, setCargasNuevas] = useState(0);

    useEffect(() => {
        const checkCargasNuevas = async () => {
            try {
                const res = await fetch('/api/cargas');
                const data = await res.json();

                const ultimaVisitaStr = localStorage.getItem('ultimaVisitaCargas');
                const ultimaVisita = ultimaVisitaStr ? new Date(ultimaVisitaStr) : null;

                if (!ultimaVisita) {
                    setCargasNuevas(data.length);
                    return;
                }

                const nuevas = data.filter((c: any) => new Date(c.fecha) > ultimaVisita);
                setCargasNuevas(nuevas.length);
            } catch (err) {
                console.error('Error al verificar cargas nuevas', err);
            }
        };

        checkCargasNuevas();
    }, []);

    const secciones = [
        {
            label: 'Empleados',
            path: '/admin/empleados',
            icon: <UsersIcon className="w-6 h-6 text-[#801818]" />,
        },
        {
            label: 'Docentes',
            path: '/admin/docentes',
            icon: <GraduationCap className="w-6 h-6 text-[#801818]" />,
        },
        {
            label: 'Cargas',
            path: '/admin/cargas',
            icon: <FuelIcon className="w-6 h-6 text-[#801818]" />,
        },
        {
            label: 'Precios',
            path: '/admin/precios',
            icon: <DollarSign className="w-6 h-6 text-[#801818]" />,
        },
        {
            label: 'Descuentos',
            path: '/admin/descuentos',
            icon: <Percent className="w-6 h-6 text-[#801818]" />,
        },
        {
            label: 'Estadísticas',
            path: '/admin/estadisticas',
            icon: <BarChart3 className="w-6 h-6 text-[#801818]" />,
        },
    ];

    return (
        <main className="min-h-screen px-6 py-12 bg-gray-100">
            <h1 className="text-4xl font-bold text-center mb-12 text-[#111827]">
                Administración
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">

                {secciones.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => router.push(item.path)}
                        className="relative bg-white border border-gray-200 rounded-2xl p-6 flex items-center gap-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                        <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-gray-100">
                            {item.icon}
                        </div>

                        <span className="text-lg font-semibold text-gray-800">
                            {item.label}
                        </span>

                        {item.label === 'Cargas' && cargasNuevas > 0 && (
                            <div className="absolute top-3 right-3 bg-[#801818] text-white text-xs px-2 py-1 rounded-full">
                                {cargasNuevas}
                            </div>
                        )}

                    </button>
                ))}

            </div>
        </main>
    );
}