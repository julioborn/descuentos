'use client';

import { useRouter } from 'next/navigation';
import {
    BriefcaseIcon,
    FuelIcon,
    TagIcon,
    UsersIcon,
    DollarSign,
    Percent
} from 'lucide-react';

export default function AdminPage() {
    const router = useRouter();

    const secciones = [
        {
            label: 'Empleados',
            path: '/admin/empleados',
            icon: <UsersIcon className="w-8 h-8 text-white" />,
            bg: 'bg-gradient-to-r from-rose-500 to-red-600',
        },
        {
            label: 'Cargas',
            path: '/admin/cargas',
            icon: <FuelIcon className="w-8 h-8 text-white" />,
            bg: 'bg-gradient-to-r from-yellow-500 to-amber-600',
        },
        {
            label: 'Precios',
            path: '/admin/precios',
            icon: <DollarSign className="w-8 h-8 text-white" />,
            bg: 'bg-gradient-to-r from-green-500 to-emerald-600',
        },
        {
            label: 'Descuentos',
            path: '/admin/descuentos',
            icon: <Percent className="w-8 h-8 text-white" />,
            bg: 'bg-gradient-to-r from-indigo-500 to-purple-600',
        },
    ];

    return (
        <main className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white">
            <h1 className="text-4xl font-bold text-center mb-12">Panel de Administración</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {secciones.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => router.push(item.path)}
                        className={`${item.bg} rounded-xl p-6 flex items-center gap-4 hover:scale-105 transition-transform shadow-lg hover:shadow-2xl`}
                    >
                        <div className="bg-black/20 p-3 rounded-full">
                            {item.icon}
                        </div>
                        <span className="text-xl font-semibold tracking-wide">{item.label}</span>
                    </button>
                ))}
            </div>
        </main>
    );
}
