'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Loader from '@/components/Loader';
import {
    FuelIcon,
    UsersIcon,
    DollarSign,
    Percent,
    BarChart3,
    GraduationCap
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function AdminPage() {

    const router = useRouter();
    const [cargasNuevas, setCargasNuevas] = useState(0);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const role = session?.user?.role;

    useEffect(() => {

        const checkCargasNuevas = async () => {
            try {

                const res = await fetch('/api/cargas');
                const data = await res.json();

                const ultimaVisitaStr = localStorage.getItem('ultimaVisitaCargas');
                const ultimaVisita = ultimaVisitaStr ? new Date(ultimaVisitaStr) : null;

                if (!ultimaVisita) {
                    setCargasNuevas(data.length);
                } else {
                    const nuevas = data.filter((c: any) => new Date(c.fecha) > ultimaVisita);
                    setCargasNuevas(nuevas.length);
                }

            } catch (err) {
                console.error('Error al verificar cargas nuevas', err);
            }

            setLoading(false);

        };

        checkCargasNuevas();

    }, []);

    const secciones = [
        {
            label: 'Empleados',
            path: '/admin/empleados',
            icon: <UsersIcon className="w-8 h-8 text-[#801818]" />,
        },
        {
            label: 'Docentes',
            path: '/admin/docentes',
            icon: <GraduationCap className="w-8 h-8 text-[#801818]" />,
        },
        {
            label: 'Cargas',
            path: '/admin/cargas',
            icon: <FuelIcon className="w-8 h-8 text-[#801818]" />,
        },
        {
            label: 'Precios',
            path: '/admin/precios',
            icon: <DollarSign className="w-8 h-8 text-[#801818]" />,
        },
        {
            label: 'Descuentos',
            path: '/admin/descuentos',
            icon: <Percent className="w-8 h-8 text-[#801818]" />,
        },
        {
            label: 'Estadísticas',
            path: '/admin/estadisticas',
            icon: <BarChart3 className="w-8 h-8 text-[#801818]" />,
        },
    ];

    if (loading) {
        return (
            <main className="min-h-screen bg-gray-100 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    const seccionesFiltradas =
        role === 'admin_py'
            ? secciones.filter((s) => s.label !== 'Docentes')
            : secciones;

    return (
        <main className="min-h-screen px-6 py-14 bg-gray-100">

            <h1 className="text-4xl font-bold text-center mb-14 text-[#111827]">
                Administración
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">

                {seccionesFiltradas.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => router.push(item.path)}
                        className="
                        relative
                        bg-white
                        border border-gray-200
                        rounded-2xl
                        p-8
                        flex
                        items-center
                        gap-6
                        text-left
                        shadow-sm
                        hover:shadow-lg
                        hover:-translate-y-1
                        transition-all
                        "
                    >

                        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100">
                            {item.icon}
                        </div>

                        <span className="text-xl font-semibold text-gray-800">
                            {item.label}
                        </span>

                        {item.label === 'Cargas' && cargasNuevas > 0 && (
                            <div className="absolute top-4 right-4 bg-[#801818] text-white text-sm font-bold px-3 py-1 rounded-full">
                                {cargasNuevas}
                            </div>
                        )}

                    </button>
                ))}

            </div>

        </main>
    );
}