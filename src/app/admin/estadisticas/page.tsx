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

    if (loading) return <Loader />;

    return (
        <main className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white">
            <div className="max-w-7xl mx-auto space-y-10">
                <h1 className="text-4xl font-bold text-center tracking-tight">
                    Estadísticas
                </h1>


                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 mb-10">
                    <span className="text-white/80 font-semibold">Año:</span>

                    <select
                        value={anioSeleccionado}
                        onChange={(e) =>
                            setAnioSeleccionado(
                                e.target.value === 'TODOS' ? 'TODOS' : Number(e.target.value)
                            )
                        }
                        className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white min-w-[160px]"
                    >
                        <option value="TODOS">Todos</option>
                        {aniosDisponibles.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>

                </div>

                {/* ✅ Grid 2x2 en desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">

                    {/* --- Litros cargados por mes --- */}
                    <section className="bg-gray-800/80 p-8 rounded-2xl shadow-lg">
                        <h2 className="text-lg font-semibold mb-6 text-white/90">Litros cargados por mes</h2>
                        <Bar
                            data={{
                                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                                datasets: [
                                    {
                                        label: 'Litros',
                                        data: datosMensuales.meses,
                                        backgroundColor: 'rgba(255,99,132,0.5)'
                                    }
                                ]
                            }}
                        />
                    </section>

                    {/* --- Ingresos por mes --- */}
                    <section className="bg-gray-800/80 p-8 rounded-2xl shadow-lg">
                        <h2 className="text-lg font-semibold mb-6 text-white/90">Ingresos por mes</h2>
                        <Line
                            data={{
                                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
                                datasets: [
                                    {
                                        label: 'Ingresos ($)',
                                        data: datosMensuales.ingresos,
                                        borderColor: 'rgba(75,192,192,1)',
                                        fill: false
                                    }
                                ]
                            }}
                        />
                    </section>

                    {/* --- Distribución por producto --- */}
                    <section className="bg-gray-800/80 p-8 rounded-2xl shadow-lg">
                        <h2 className="text-lg font-semibold mb-6 text-white/90">Distribución de cargas por producto</h2>
                        <div className="h-64">
                            <Doughnut
                                data={{
                                    labels: Object.keys(productosData),
                                    datasets: [
                                        {
                                            data: Object.values(productosData),
                                            backgroundColor: [
                                                'rgba(255,99,132,0.5)',
                                                'rgba(54,162,235,0.5)',
                                                'rgba(255,206,86,0.5)',
                                                'rgba(75,192,192,0.5)',
                                                'rgba(153,102,255,0.5)'
                                            ]
                                        }
                                    ]
                                }}
                                options={{
                                    maintainAspectRatio: false
                                }}
                            />
                        </div>
                    </section>

                    {/* --- Top empleados --- */}
                    <section className="bg-gray-800/80 p-8 rounded-2xl shadow-lg">
                        <h2 className="text-lg font-semibold mb-6 text-white/90">Top 5 empleados con más cargas</h2>
                        <Bar
                            data={{
                                labels: topEmpleados.map(([nombre]) => nombre),
                                datasets: [
                                    {
                                        label: 'Cargas',
                                        data: topEmpleados.map(([_, cantidad]) => cantidad),
                                        backgroundColor: 'rgba(255,159,64,0.5)'
                                    }
                                ]
                            }}
                        />
                    </section>

                    {/* --- Comparativa de cargas por localidad (hasta 4) --- */}
                    <section className="bg-gray-800/80 p-8 rounded-2xl shadow-lg">
                        <h2 className="text-lg font-semibold mb-6 text-white/90">Cargas por localidad</h2>
                        <Bar
                            data={{
                                labels: localidadesTop4.map(([loc]) => loc),
                                datasets: [
                                    {
                                        label: 'Cargas',
                                        data: localidadesTop4.map(([_, cnt]) => cnt),
                                        backgroundColor: 'rgba(99,102,241,0.5)', // indigo
                                    },
                                ],
                            }}
                            options={{
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                            }}
                        />
                    </section>

                    {/* --- Distribución por empresa (solo empleados) --- */}
                    <section className="bg-gray-800/80 p-8 rounded-2xl shadow-lg">
                        <h2 className="text-lg font-semibold mb-6 text-white/90">Distribución de cargas por empresa (empleados)</h2>
                        <div className="h-64">
                            <Doughnut
                                data={{
                                    labels: Object.keys(distribucionEmpresasEmpleados),
                                    datasets: [
                                        {
                                            data: Object.values(distribucionEmpresasEmpleados),
                                            backgroundColor: [
                                                'rgba(16,185,129,0.5)',
                                                'rgba(239,68,68,0.5)',
                                                'rgba(234,179,8,0.5)',
                                                'rgba(59,130,246,0.5)',
                                                'rgba(168,85,247,0.5)',
                                            ],
                                        },
                                    ],
                                }}
                                options={{ maintainAspectRatio: false }}
                            />
                        </div>
                    </section>

                    {/* --- Día con más cargas + Top 3 --- */}
                    <section className="bg-gray-800/80 p-8 rounded-2xl shadow-lg">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h2 className="text-xl font-semibold">Día con más cargas</h2>
                            <span className="px-3 py-1 rounded-full bg-indigo-600/80 font-bold">
                                {diaMasCargas.dia} ({diaMasCargas.cantidad})
                            </span>
                        </div>
                        <div className="mt-5 mb-5">
                            <h3 className="text-sm text-gray-300 mb-2 font-semibold">Top 3 días</h3>
                            <div className="flex flex-wrap gap-2">
                                {topDias.map((t, i) => (
                                    <span key={t.dia} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-700 text-sm">
                                        <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-indigo-600 text-white font-bold">
                                            {i + 1}
                                        </span>
                                        <span className="font-semibold">{t.dia}</span>
                                        <span className="text-white/70">({t.cantidad})</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <Bar
                            data={{
                                labels: diasSemana,
                                datasets: [
                                    { label: 'Cargas', data: cargasPorDiaSemana, backgroundColor: 'rgba(99,102,241,0.5)' }
                                ]
                            }}
                            options={{
                                plugins: { legend: { display: false } },
                                scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                            }}
                        />

                    </section>

                </div>
            </div>
        </main>
    );
}
