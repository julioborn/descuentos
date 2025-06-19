// app/admin/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';

export default function AdminPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen px-6 py-10 bg-gradient-to-br bg-gray-700 text-white space-y-10 text-center">
            <h1 className="text-4xl font-bold mb-8">Administración</h1>

            <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <button
                    onClick={() => router.push('/admin/registrar-empleado')}
                    className="bg-red-800 font-semibold py-3 rounded-xl hover:scale-105 transition-transform shadow"
                >
                    Registrar Empleado
                </button>
                <button
                    onClick={() => router.push('/admin/cargas')}
                    className="bg-red-800 font-semibold py-3 rounded-xl hover:scale-105 transition-transform shadow"
                >
                    Ver Cargas Registradas
                </button>
                <button
                    onClick={() => router.push('/admin/empleados')}
                    className="bg-red-800 font-semibold py-3 rounded-xl hover:scale-105 transition-transform shadow"
                >
                    Ver Empleados Registrados
                </button>
                <LogoutButton />
            </div>
        </main>
    );
}
