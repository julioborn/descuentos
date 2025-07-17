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
};

export default function EstadisticasPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);

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

    const datosMensuales = useMemo(() => {
        const meses = Array(12).fill(0);
        const ingresos = Array(12).fill(0);

        cargas.forEach(c => {
            const fecha = new Date(c.fecha);
            const mes = fecha.getMonth();
            meses[mes] += c.litros;
            ingresos[mes] += c.precioFinal;
        });

        return { meses, ingresos };
    }, [cargas]);

    const productosData = useMemo(() => {
        const conteo: Record<string, number> = {};
        cargas.forEach(c => {
            conteo[c.producto] = (conteo[c.producto] || 0) + 1;
        });
        return conteo;
    }, [cargas]);

    const topEmpleados = useMemo(() => {
        const conteo: Record<string, number> = {};
        cargas.forEach(c => {
            conteo[c.nombreEmpleado] = (conteo[c.nombreEmpleado] || 0) + 1;
        });
        return Object.entries(conteo)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
    }, [cargas]);

    if (loading) return <Loader />;

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white max-w-6xl mx-auto space-y-10">
            <h1 className="text-3xl font-bold text-center">Estadísticas</h1>

            {/* ✅ Grid 2x2 en desktop */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- Litros cargados por mes --- */}
                <section className="bg-gray-800 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4">Litros cargados por mes</h2>
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
                <section className="bg-gray-800 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4">Ingresos por mes</h2>
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
                <section className="bg-gray-800 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4">Distribución de cargas por producto</h2>
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
                <section className="bg-gray-800 p-6 rounded-xl">
                    <h2 className="text-xl font-semibold mb-4">Top 5 empleados con más cargas</h2>
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
            </div>
        </main>
    );
}
