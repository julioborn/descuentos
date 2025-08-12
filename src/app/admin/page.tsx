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

                // Si nunca se abrió la sección, mostramos todas como nuevas
                if (!ultimaVisita) {
                    setCargasNuevas(data.length);
                    return;
                }

                // Filtramos las que tienen fecha posterior a la última visita
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
            icon: <UsersIcon className="w-8 h-8 text-white" />,
            bg: 'bg-red-600',
        },
        {
            label: 'Docentes',
            path: '/admin/docentes',
            icon: <GraduationCap className="w-8 h-8 text-white" />,
            bg: 'bg-blue-600',
        },
        {
            label: 'Cargas',
            path: '/admin/cargas',
            icon: <FuelIcon className="w-8 h-8 text-white" />,
            bg: 'bg-yellow-500',
        },
        {
            label: 'Precios',
            path: '/admin/precios',
            icon: <DollarSign className="w-8 h-8 text-white" />,
            bg: 'bg-green-600',
        },
        {
            label: 'Descuentos',
            path: '/admin/descuentos',
            icon: <Percent className="w-8 h-8 text-white" />,
            bg: 'bg-purple-600',
        },
        {
            label: 'Estadísticas',
            path: '/admin/estadisticas',
            icon: <BarChart3 className="w-8 h-8 text-white" />,
            bg: 'bg-cyan-600',
        },
    ];


    return (
        <main className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white">
            <h1 className="text-4xl font-bold text-center mb-12">Administración</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {secciones.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => router.push(item.path)}
                        className={`${item.bg} relative rounded-xl p-6 flex items-center gap-4 hover:scale-105 transition-transform shadow-lg hover:shadow-2xl`}
                    >
                        <div className="bg-black/20 p-3 rounded-full">
                            {item.icon}
                        </div>
                        <span className="text-xl font-semibold tracking-wide">{item.label}</span>

                        {/* 🔴 Burbuja si hay cargas nuevas */}
                        {item.label === 'Cargas' && cargasNuevas > 0 && (
                            <div className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-3 py-1.5 rounded-full shadow-md">
                                {cargasNuevas}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </main>
    );
}
