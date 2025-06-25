'use client';

import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    qrToken: string;
    // opcionalmente podrías incluir moneda o rol…
};

const ITEMS = 5;

export default function EmpleadosPage() {
    const router = useRouter();

    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [qrMap, setQrMap] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    /* ---------- filtros & paginación ---------- */
    const [busqueda, setBusqueda] = useState('');
    const [empresaFiltro, setEmpresaFiltro] = useState<'TODAS' | string>('TODAS');
    const [pagina, setPagina] = useState(1);

    /* ---------- fetch inicial ---------- */
    useEffect(() => {
        const fetchEmpleados = async () => {
            try {
                const res = await fetch('/api/empleados');
                if (!res.ok) throw new Error();

                const data = (await res.json()) as Empleado[];
                setEmpleados(data);

                // generar QR en paralelo
                const qrData = await Promise.all(
                    data.map((emp) =>
                        QRCode.toDataURL(
                            `${window.location.origin}/playero?token=${emp.qrToken}`
                        ).then((url) => ({ id: emp._id, url }))
                    )
                );
                const mapa: Record<string, string> = {};
                qrData.forEach(({ id, url }) => (mapa[id] = url));
                setQrMap(mapa);
            } catch {
                Swal.fire('Error', 'No se pudieron cargar los empleados.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchEmpleados();
    }, []);

    /* ---------- conjunto de empresas para desplegable ---------- */
    const empresasUnicas = useMemo(
        () => Array.from(new Set(empleados.map((e) => e.empresa))).sort(),
        [empleados]
    );

    /* ---------- lista filtrada ---------- */
    const empleadosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();

        return empleados.filter((e) => {
            const coincideTexto =
                !texto ||
                `${e.nombre} ${e.apellido} ${e.dni}`
                    .toLowerCase()
                    .includes(texto);

            const coincideEmpresa =
                empresaFiltro === 'TODAS' || e.empresa === empresaFiltro;

            return coincideTexto && coincideEmpresa;
        });
    }, [empleados, busqueda, empresaFiltro]);

    /* ---------- paginación ---------- */
    const totalPag = Math.ceil(empleadosFiltrados.length / ITEMS);
    const págActual = Math.min(pagina, totalPag || 1);
    const listaPagina = empleadosFiltrados.slice(
        (págActual - 1) * ITEMS,
        págActual * ITEMS
    );

    if (loading) return <Loader />;

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-6">Empleados</h1>

            {/* ---------- Controles de búsqueda / filtros ---------- */}
            <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-6xl mx-auto mb-6">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <input
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value);
                            setPagina(1);
                        }}
                        placeholder="Buscar por nombre, apellido o DNI…"
                        className="flex-1 min-w-[200px] rounded px-4 py-2 bg-gray-800 border border-gray-600"
                    />

                    <select
                        value={empresaFiltro}
                        onChange={(e) => {
                            setEmpresaFiltro(e.target.value);
                            setPagina(1);
                        }}
                        className="rounded px-3 py-2 bg-gray-800 border border-gray-600 min-w-[200px]"
                    >
                        <option value="TODAS">Todas las empresas</option>
                        {empresasUnicas.map((empr) => (
                            <option key={empr}>{empr}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                    <button
                        onClick={() => router.push('/admin/registrar-empleado')}
                        className="bg-red-800 px-4 py-2 rounded font-semibold hover:bg-red-700 flex items-center gap-2"
                    >
                        <span>Registrar uno nuevo</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
                            />
                        </svg>
                    </button>
                </div>
            </section>

            {/* ---------- Tabla (desktop) ---------- */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-white/5 p-6 shadow-xl max-w-6xl mx-auto">
                <table className="min-w-[800px] w-full text-sm">
                    <thead className="text-left bg-white/5 text-white">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Apellido</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Teléfono</th>
                            <th className="p-3">Empresa</th>
                            <th className="p-3">QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listaPagina.map((emp) => (
                            <tr key={emp._id} className="hover:bg-white/10 transition">
                                <td className="p-2">{emp.nombre}</td>
                                <td className="p-2">{emp.apellido}</td>
                                <td className="p-2">{emp.dni}</td>
                                <td className="p-2">{emp.telefono}</td>
                                <td className="p-2">{emp.empresa}</td>
                                <td className="p-2">
                                    {qrMap[emp._id] ? (
                                        <img
                                            src={qrMap[emp._id]}
                                            alt="QR"
                                            className="w-14 h-14 rounded border border-white/20"
                                        />
                                    ) : (
                                        <Loader />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* ---------- Cards (mobile) ---------- */}
            <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                {listaPagina.map((emp) => (
                    <div
                        key={emp._id}
                        className="bg-white/5 rounded-lg p-4 border border-white/10 shadow-lg"
                    >
                        <p><b>{emp.nombre} {emp.apellido}</b></p>
                        <p>DNI: {emp.dni}</p>
                        <p>Tel: {emp.telefono}</p>
                        <p>Empresa: {emp.empresa}</p>
                        <div className="mt-2 flex justify-center">
                            {qrMap[emp._id] ? (
                                <img src={qrMap[emp._id]} alt="QR" className="w-32 h-32" />
                            ) : (
                                <Loader />
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* ---------- Paginación ---------- */}
            {
                totalPag > 1 && (
                    <div className="flex justify-center mt-8 gap-4">
                        <button
                            onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                            disabled={págActual === 1}
                            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <span className="self-center">
                            Página {págActual} de {totalPag}
                        </span>
                        <button
                            onClick={() => setPagina((p) => Math.min(p + 1, totalPag))}
                            disabled={págActual === totalPag}
                            className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                )
            }
        </main >
    );
}
