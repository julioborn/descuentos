'use client';

import { useEffect, useState, useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
} from 'chart.js';
import Loader from '@/components/Loader';
import Swal from 'sweetalert2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

type Carga = {
    _id: string;
    fecha: string;
    nombreEmpleado: string;
    producto: string;
    litros: number;
    precioFinal: number;
    empresa?: string;    // <—
    localidad?: string;  // <—
};

export default function EstadisticasPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);
    const [anioSeleccionado, setAnioSeleccionado] = useState<number | 'TODOS'>('TODOS');

    useEffect(() => {
        const fetchCargas = async () => {
            try {
                const res = await fetch('/api/cargas');
                if (!res.ok) throw new Error();
                setCargas(await res.json());
            } catch {
                Swal.fire('Error', 'No se pudieron cargar las estadísticas.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCargas();
    }, []);

    const aniosDisponibles = useMemo(() => {
        const set = new Set<number>();
        cargas.forEach(c => {
            const d = new Date(c.fecha);
            set.add(d.getFullYear());
        });
        return Array.from(set).sort((a, b) => b - a); // más reciente primero
    }, [cargas]);

    useEffect(() => {
        if (anioSeleccionado === 'TODOS' && aniosDisponibles.length > 0) {
            setAnioSeleccionado(aniosDisponibles[0]); // el más reciente
        }
    }, [aniosDisponibles]); // a propósito sin anioSeleccionado para que setee una vez

    const cargasFiltradasPorAnio = useMemo(() => {
        if (anioSeleccionado === 'TODOS') return cargas;

        return cargas.filter(c => {
            const d = new Date(c.fecha);
            return d.getFullYear() === anioSeleccionado;
        });
    }, [cargas, anioSeleccionado]);

    const datosMensuales = useMemo(() => {
        const meses = Array(12).fill(0);
        const ingresos = Array(12).fill(0);

        cargasFiltradasPorAnio.forEach(c => {
            const fecha = new Date(c.fecha);
            const mes = fecha.getMonth();
            meses[mes] += c.litros;
            ingresos[mes] += c.precioFinal;
        });

        return { meses, ingresos };
    }, [cargasFiltradasPorAnio]);

    const productosData = useMemo(() => {
        const conteo: Record<string, number> = {};
        cargasFiltradasPorAnio.forEach(c => {
            conteo[c.producto] = (conteo[c.producto] || 0) + 1;
        });
        return conteo;
    }, [cargasFiltradasPorAnio]);

    const topEmpleados = useMemo(() => {
        const conteo: Record<string, number> = {};
        cargasFiltradasPorAnio.forEach(c => {
            conteo[c.nombreEmpleado] = (conteo[c.nombreEmpleado] || 0) + 1;
        });
        return Object.entries(conteo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [cargasFiltradasPorAnio]);

    const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const cargasPorDiaSemana = useMemo(() => {
        const counts = Array(7).fill(0);
        for (const c of cargasFiltradasPorAnio) {
            const d = new Date(c.fecha);
            counts[d.getDay()] += 1;
        }
        return counts;
    }, [cargasFiltradasPorAnio]);

    const diaMasCargas = useMemo(() => {
        let idx = 0, max = -1;
        for (let i = 0; i < 7; i++) {
            if (cargasPorDiaSemana[i] > max) {
                max = cargasPorDiaSemana[i];
                idx = i;
            }
        }
        return { dia: diasSemana[idx], cantidad: max < 0 ? 0 : max };
    }, [cargasPorDiaSemana]);

    const topDias = useMemo(() => {
        return diasSemana
            .map((dia, i) => ({ dia, cantidad: cargasPorDiaSemana[i] }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 3);
    }, [cargasPorDiaSemana]);

    // Cuenta de cargas por localidad
    const conteoPorLocalidad = useMemo(() => {
        const map: Record<string, number> = {};
        for (const c of cargasFiltradasPorAnio) {
            const loc = c.localidad || 'Sin localidad';
            map[loc] = (map[loc] || 0) + 1;
        }
        return map;
    }, [cargasFiltradasPorAnio]);

    // Tomamos todas y mostramos hasta 4 (si hay más, quedan fuera)
    const localidadesTop4 = useMemo(() => {
        return Object.entries(conteoPorLocalidad)
            .sort((a, b) => b[1] - a[1])  // de mayor a menor
            .slice(0, 4);                 // máximo 4
    }, [conteoPorLocalidad]);

    const distribucionEmpresasEmpleados = useMemo(() => {
        const map: Record<string, number> = {};
        for (const c of cargasFiltradasPorAnio) {
            const emp = (c.empresa || '').trim();
            if (emp.toUpperCase() === 'DOCENTES') continue;
            const key = emp || 'Sin empresa';
            map[key] = (map[key] || 0) + 1;
        }
        return map;
    }, [cargasFiltradasPorAnio]);

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50">

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                            Análisis y reportes
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                            Estadísticas
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#801818]" />
                        {cargasFiltradasPorAnio.length} cargas {anioSeleccionado === 'TODOS' ? '(todos los años)' : `en ${anioSeleccionado}`}
                    </div>
                </div>

                {/* Selector de año */}
                <section className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
                    <div className="max-w-[200px]">
                        <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                            Año
                        </label>
                        <select
                            value={anioSeleccionado}
                            onChange={(e) =>
                                setAnioSeleccionado(
                                    e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value)
                                )
                            }
                            className="w-full rounded-lg px-2.5 py-1.5 text-sm bg-stone-50 border border-stone-200 text-stone-700
focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none cursor-pointer transition"
                        >

                            <option value="TODOS">Todos</option>

                            {aniosDisponibles.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}

                        </select>
                    </div>
                </section>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    <section className="bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                        <h2 className="text-sm font-semibold mb-6 text-stone-700">
                            Litros cargados por mes
                        </h2>
                        <Bar
                            data={{
                                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                                datasets: [{
                                    label: 'Litros',
                                    data: datosMensuales.meses,
                                    backgroundColor: 'rgba(128,24,24,0.7)'
                                }]
                            }}
                        />
                    </section>

                    <section className="bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                        <h2 className="text-sm font-semibold mb-6 text-stone-700">
                            Ingresos por mes
                        </h2>
                        <Line
                            data={{
                                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                                datasets: [{
                                    label: 'Ingresos',
                                    data: datosMensuales.ingresos,
                                    borderColor: '#111827',
                                    backgroundColor: 'rgba(17,24,39,0.2)',
                                    fill: true
                                }]
                            }}
                        />
                    </section>

                    <section className="bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                        <h2 className="text-sm font-semibold mb-6 text-stone-700">
                            Distribución por producto
                        </h2>

                        <div className="h-64">

                            <Doughnut
                                data={{
                                    labels: Object.keys(productosData),
                                    datasets: [{
                                        data: Object.values(productosData),
                                        backgroundColor: [
                                            '#801818',
                                            '#111827',
                                            '#EAB308',
                                            '#22C55E',
                                            '#6366F1'
                                        ]
                                    }]
                                }}
                                options={{ maintainAspectRatio: false }}
                            />

                        </div>
                    </section>

                    <section className="bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                        <h2 className="text-sm font-semibold mb-6 text-stone-700">
                            Top empleados
                        </h2>

                        <Bar
                            data={{
                                labels: topEmpleados.map(([nombre]) => nombre),
                                datasets: [{
                                    label: 'Cargas',
                                    data: topEmpleados.map(([_, c]) => c),
                                    backgroundColor: '#801818'
                                }]
                            }}
                        />

                    </section>

                    <section className="bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl shadow-sm">
                        <h2 className="text-sm font-semibold mb-6 text-stone-700">
                            Cargas por localidad
                        </h2>

                        <Bar
                            data={{
                                labels: localidadesTop4.map(([l]) => l),
                                datasets: [{
                                    label: 'Cargas',
                                    data: localidadesTop4.map(([_, c]) => c),
                                    backgroundColor: '#111827'
                                }]
                            }}
                            options={{
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true } }
                            }}
                        />

                    </section>

                    <section className="bg-white border border-stone-200 p-6 sm:p-8 rounded-2xl shadow-sm">

                        <div className="flex items-center justify-between mb-4">

                            <h2 className="text-sm font-semibold text-stone-700">
                                Día con más cargas
                            </h2>

                            <span className="px-3 py-1 rounded-full bg-[#801818] text-white text-sm font-bold">
                                {diaMasCargas.dia} ({diaMasCargas.cantidad})
                            </span>

                        </div>

                        <div className="mb-6">

                            <h3 className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-2">
                                Top 3 días
                            </h3>

                            <div className="flex flex-wrap gap-2">

                                {topDias.map((t, i) => (
                                    <span
                                        key={t.dia}
                                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-sm"
                                    >

                                        <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-[#111827] text-white font-bold">
                                            {i + 1}
                                        </span>

                                        <span className="font-semibold text-stone-700">
                                            {t.dia}
                                        </span>

                                        <span className="text-stone-500">
                                            ({t.cantidad})
                                        </span>

                                    </span>
                                ))}

                            </div>

                        </div>

                        <Bar
                            data={{
                                labels: diasSemana,
                                datasets: [{
                                    label: 'Cargas',
                                    data: cargasPorDiaSemana,
                                    backgroundColor: '#111827'
                                }]
                            }}
                            options={{
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true } }
                            }}
                        />

                    </section>

                </div>

            </div>

        </main>
    )
}
