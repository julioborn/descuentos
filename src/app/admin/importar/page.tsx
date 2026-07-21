'use client'

import { useRouter } from 'next/navigation'
import {
    Shield,
    Building2,
    HeartPulse,
    Globe,
    NotebookPen,
    Contact
} from 'lucide-react'

export default function ImportarPage() {

    const router = useRouter()

    const opciones = [
        {
            label: 'Docentes',
            path: '/admin/importar-docentes',
            icon: <NotebookPen className="w-8 h-8 text-[#801818]" />
        },
        {
            label: 'Empleados',
            path: '/admin/importar-empleados',
            icon: <Contact className="w-8 h-8 text-[#801818]" />
        },
        {
            label: 'Policía',
            path: '/admin/importar-policias',
            icon: <Shield className="w-8 h-8 text-[#801818]" />
        },
        {
            label: 'Municipales',
            path: '/admin/importar-municipales',
            icon: <Building2 className="w-8 h-8 text-[#801818]" />
        },
        {
            label: 'Salud',
            path: '/admin/importar-salud',
            icon: <HeartPulse className="w-8 h-8 text-[#801818]" />
        },
        {
            label: 'Paraguay',
            path: '/admin/importar-paraguay',
            icon: <Globe className="w-8 h-8 text-[#801818]" />
        }
    ]

    return (
        <main className="min-h-screen px-6 py-14 bg-gray-100">

            <h1 className="text-4xl font-bold text-center mb-14 text-[#111827]">
                Importar Empleados
            </h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-4xl mx-auto">

                {opciones.map((item) => (
                    <button
                        key={item.label}
                        onClick={() => router.push(item.path)}
                        className="
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
                    </button>
                ))}

            </div>

        </main>
    )
}