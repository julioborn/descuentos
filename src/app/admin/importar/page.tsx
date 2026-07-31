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
            icon: <NotebookPen className="w-6 h-6 text-[#801818]" />
        },
        {
            label: 'Empleados',
            path: '/admin/importar-empleados',
            icon: <Contact className="w-6 h-6 text-[#801818]" />
        },
        {
            label: 'Policía',
            path: '/admin/importar-policias',
            icon: <Shield className="w-6 h-6 text-[#801818]" />
        },
        {
            label: 'Municipales',
            path: '/admin/importar-municipales',
            icon: <Building2 className="w-6 h-6 text-[#801818]" />
        },
        {
            label: 'Salud',
            path: '/admin/importar-salud',
            icon: <HeartPulse className="w-6 h-6 text-[#801818]" />
        },
        {
            label: 'Paraguay',
            path: '/admin/importar-paraguay',
            icon: <Globe className="w-6 h-6 text-[#801818]" />
        }
    ]

    return (
        <main className="min-h-screen bg-stone-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                        Herramientas
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                        Importar Empleados
                    </h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                    {opciones.map((item) => (
                        <button
                            key={item.label}
                            onClick={() => router.push(item.path)}
                            className="
                            bg-white
                            border border-stone-200
                            rounded-2xl
                            p-6
                            flex
                            items-center
                            gap-4
                            text-left
                            shadow-sm
                            hover:shadow-lg
                            hover:-translate-y-0.5
                            hover:border-[#801818]/30
                            transition-all
                            "
                        >
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#801818]/10">
                                {item.icon}
                            </div>

                            <span className="text-base font-semibold text-stone-800">
                                {item.label}
                            </span>
                        </button>
                    ))}

                </div>
            </div>
        </main>
    )
}