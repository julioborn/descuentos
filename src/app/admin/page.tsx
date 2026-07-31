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
    GraduationCap,
    Import,
    FileText,
    ChevronRight
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// ---- metadata de presentación (no altera datos/lógica de "secciones") ----
const GROUP_ORDER = ['Operación diaria', 'Configuración', 'Análisis y reportes', 'Herramientas'] as const;

const META: Record<string, { grupo: typeof GROUP_ORDER[number]; descripcion: string }> = {
    Empleados: { grupo: 'Operación diaria', descripcion: 'Altas, bajas y datos de cada beneficiario.' },
    Docentes: { grupo: 'Operación diaria', descripcion: 'Padrón docente y sus centros educativos.' },
    Cargas: { grupo: 'Operación diaria', descripcion: 'Historial de combustible cargado por playero.' },
    Precios: { grupo: 'Configuración', descripcion: 'Valores vigentes por producto y moneda.' },
    Descuentos: { grupo: 'Configuración', descripcion: 'Porcentaje de descuento por empresa.' },
    Estadísticas: { grupo: 'Análisis y reportes', descripcion: 'Litros e ingresos, mes a mes.' },
    Informes: { grupo: 'Análisis y reportes', descripcion: 'Reportes descargables por empresa.' },
    Importar: { grupo: 'Herramientas', descripcion: 'Carga masiva de padrones desde Excel.' },
};

const ROLE_LABEL: Record<string, string> = {
    superadmin: 'Superadmin',
    admin_arg: 'Admin Argentina',
    admin_py: 'Admin Paraguay',
    playero: 'Playero',
};

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
        {
            label: 'Informes',
            path: '/admin/informes',
            icon: <FileText className="w-6 h-6 text-[#801818]" />,
        },
        {
            label: 'Importar',
            path: '/admin/importar',
            icon: <Import className="w-6 h-6 text-[#801818]" />,
        },
    ];

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    const seccionesFiltradas =
        role === 'admin_py'
            ? secciones.filter((s) => s.label !== 'Docentes')
            : secciones;

    return (
        <main className="min-h-screen bg-stone-50">

            {/* -------- Encabezado -------- */}
            <header className="border-b border-stone-200 bg-white">
                <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-3">
                                Panel de administración
                            </p>
                            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[#111827]">
                                Administración
                            </h1>
                            <p className="mt-3 text-stone-500 max-w-md">
                                Gestioná empleados, cargas y beneficios de combustible desde un mismo lugar.
                            </p>
                        </div>

                        {role && (
                            <div className="flex items-center gap-2 self-start rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-stone-600">
                                <span className="h-2 w-2 rounded-full bg-[#801818]" />
                                {ROLE_LABEL[role] ?? role}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* -------- Secciones agrupadas -------- */}
            <div className="max-w-6xl mx-auto px-6 py-12 space-y-12">

                {GROUP_ORDER.map((grupo) => {
                    const items = seccionesFiltradas.filter((s) => META[s.label]?.grupo === grupo);
                    if (items.length === 0) return null;

                    return (
                        <section key={grupo}>

                            <div className="flex items-center gap-4 mb-5">
                                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400 whitespace-nowrap">
                                    {grupo}
                                </h2>
                                <div className="h-px flex-1 bg-stone-200" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

                                {items.map((item) => (
                                    <button
                                        key={item.label}
                                        onClick={() => router.push(item.path)}
                                        className="
                                        group
                                        relative
                                        flex
                                        flex-col
                                        gap-4
                                        rounded-2xl
                                        border border-stone-200
                                        bg-white
                                        p-6
                                        text-left
                                        shadow-sm
                                        transition-all
                                        hover:-translate-y-0.5
                                        hover:border-[#801818]/30
                                        hover:shadow-lg
                                        focus-visible:outline-none
                                        focus-visible:ring-2
                                        focus-visible:ring-[#801818]/40
                                        "
                                    >

                                        <div className="flex items-center justify-between">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#801818]/[0.08] transition-colors group-hover:bg-[#801818]/[0.14]">
                                                {item.icon}
                                            </div>

                                            {item.label === 'Cargas' && cargasNuevas > 0 && (
                                                <span className="flex items-center gap-1.5 rounded-full bg-[#801818] px-2.5 py-1 text-xs font-bold text-white">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                                    {cargasNuevas}
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-1.5 text-lg font-semibold text-[#111827]">
                                                {item.label}
                                                <ChevronRight className="h-4 w-4 text-stone-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#801818]" />
                                            </div>

                                            <p className="mt-1 text-sm text-stone-500">
                                                {META[item.label]?.descripcion}
                                            </p>
                                        </div>

                                    </button>
                                ))}

                            </div>

                        </section>
                    );
                })}

            </div>

        </main>
    );
}
