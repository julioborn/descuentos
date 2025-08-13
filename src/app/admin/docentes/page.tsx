'use client';

import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

/* ---------- Tipos ---------- */
type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    localidad: string;
    qrToken: string;
};

type DocenteDB = {
    _id: string;
    empleadoId: string | { _id: string };
    centrosEducativos: string[];
};

type Fila = Empleado & { centrosEducativos: string[] };

/* Util para búsqueda acentos-insensible */
const sinAcentos = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/* Ventana de paginación con elipsis */
function buildPageWindow(total: number, current: number, maxButtons = 7) {
    if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);
    const windowSize = maxButtons - 2;
    let start = Math.max(2, current - Math.floor(windowSize / 2));
    let end = Math.min(total - 1, start + windowSize - 1);
    start = Math.max(2, Math.min(start, total - 1 - (windowSize - 1)));
    const pages: (number | '…')[] = [1];
    if (start > 2) pages.push('…');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < total - 1) pages.push('…');
    pages.push(total);
    return pages;
}

export default function AdminDocentesPage() {
    const router = useRouter();
    const { status } = useSession();

    const [filas, setFilas] = useState<Fila[]>([]);
    const [loading, setLoading] = useState(true);

    /* filtros */
    const [busqueda, setBusqueda] = useState('');
    const [localidadFiltro, setLocalidadFiltro] = useState<'TODAS' | string>('TODAS');
    const [pagina, setPagina] = useState(1);
    const [itemsPorPagina, setItemsPorPagina] = useState<number>(10);

    /* cargar empleados DOCENTES + centros (sin QR) */
    useEffect(() => {
        const fetchData = async () => {
            try {
                const empRes = await fetch('/api/empleados');
                if (!empRes.ok) throw new Error('empleados');
                const empleados = (await empRes.json()) as Empleado[];

                const empleadosDoc = empleados.filter((e) => e.empresa === 'DOCENTES');

                const docRes = await fetch('/api/docentes');
                if (!docRes.ok) throw new Error('docentes');
                const docentes = (await docRes.json()) as DocenteDB[];

                const centrosPorEmpleado = new Map<string, string[]>();
                for (const d of docentes) {
                    const empId =
                        typeof d.empleadoId === 'string' ? d.empleadoId : (d.empleadoId?._id as string);
                    if (!empId) continue;
                    centrosPorEmpleado.set(empId, d.centrosEducativos || []);
                }

                const combinadas: Fila[] = empleadosDoc.map((e) => ({
                    ...e,
                    centrosEducativos: centrosPorEmpleado.get(e._id) || [],
                }));

                combinadas.sort((a, b) => a.apellido.localeCompare(b.apellido));

                setFilas(combinadas);
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'No se pudieron cargar los docentes.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    /* localidades únicas */
    const localidadesUnicas = useMemo(
        () => Array.from(new Set(filas.map((f) => f.localidad))).sort(),
        [filas]
    );

    /* búsqueda diferida */
    const deferredBusqueda = useDeferredValue(busqueda);

    const [centroFiltro, setCentroFiltro] = useState<'TODOS' | string>('TODOS');
    const centrosUnicos = useMemo(() => {
        // aplanar todos los centros y hacer set único
        const todos = filas.flatMap(f => f.centrosEducativos || []);
        return Array.from(new Set(todos)).sort();
    }, [filas]);

    /* lista filtrada */
    const filtradas = useMemo(() => {
        const txt = sinAcentos(deferredBusqueda.trim());
        return filas.filter((f) => {
            const coincideTxt =
                !txt ||
                sinAcentos(`${f.nombre} ${f.apellido} ${f.dni} ${f.localidad}`).includes(txt) ||
                sinAcentos(f.centrosEducativos.join(' ')).includes(txt);

            const coincideLoc = localidadFiltro === 'TODAS' || f.localidad === localidadFiltro;

            const coincideCentro =
                centroFiltro === 'TODOS' || f.centrosEducativos.includes(centroFiltro);

            return coincideTxt && coincideLoc && coincideCentro;
        });
    }, [filas, deferredBusqueda, localidadFiltro, centroFiltro]);

    /* paginación */
    const totalPag = Math.ceil(filtradas.length / itemsPorPagina);
    const págActual = Math.min(pagina, totalPag || 1);
    const pageList = filtradas.slice((págActual - 1) * itemsPorPagina, págActual * itemsPorPagina);

    useEffect(() => {
        setPagina((p) => Math.min(p, totalPag || 1));
    }, [totalPag]);

    if (status === 'loading' || loading) return <Loader />;

    /* Abrir detalle + QR on-demand */
    const verDetalle = async (emp: Fila) => {
        try {
            // import dinámico para no cargar qrcode al entrar a la lista
            const QR = await import('qrcode');
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const qrUrl = await QR.toDataURL(`${origin}/playero?token=${emp.qrToken}`);

            const html = `
        <div style="display:flex;flex-direction:column;gap:10px;align-items:center">
          <div style="text-align:center">
            <div style="font-size:18px;font-weight:700;">${emp.nombre} ${emp.apellido}</div>
            <div style="opacity:.8">DNI: ${emp.dni} • Tel: ${emp.telefono}</div>
            <div style="opacity:.8">Localidad: ${emp.localidad}</div>
            <div style="opacity:.8">Centros: ${emp.centrosEducativos.length ? emp.centrosEducativos.join(', ') : '—'
                }</div>
          </div>
          <img src="${qrUrl}" alt="QR" style="width:240px;height:240px;border-radius:8px;border:2px solid #ccc" />
        </div>
      `;

            await Swal.fire({
                html,
                background: '#1f2937',
                color: '#fff',
                showConfirmButton: true,
                confirmButtonText: 'Cerrar',
                customClass: { popup: 'rounded-lg shadow-lg' },
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo generar el QR.', 'error');
        }
    };

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-6">Docentes</h1>

            {/* controles */}
            <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 max-w-6xl mx-auto mb-6">
                <div className="flex flex-col sm:flex-row gap-4 flex-1">
                    <input
                        value={busqueda}
                        onChange={(e) => {
                            setBusqueda(e.target.value);
                            setPagina(1);
                        }}
                        placeholder="Buscar por nombre, DNI, localidad o centro educativo…"
                        className="flex-1 min-w-[240px] rounded px-4 py-2 bg-gray-800 border border-gray-600"
                    />

                    <select
                        value={localidadFiltro}
                        onChange={(e) => {
                            setLocalidadFiltro(e.target.value);
                            setPagina(1);
                        }}
                        className="rounded px-3 py-2 bg-gray-800 border border-gray-600 min-w-[200px]"
                    >
                        <option value="TODAS">Todas las localidades</option>
                        {localidadesUnicas.map((loc) => (
                            <option key={loc}>{loc}</option>
                        ))}
                    </select>

                    <select
                        value={centroFiltro}
                        onChange={(e) => { setCentroFiltro(e.target.value); setPagina(1); }}
                        className="rounded px-3 py-2 bg-gray-800 border border-gray-600 min-w-[220px]"
                    >
                        <option value="TODOS">Todos los centros</option>
                        {centrosUnicos.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>

                    {/* items por página */}
                    <select
                        value={itemsPorPagina}
                        onChange={(e) => {
                            setItemsPorPagina(Number(e.target.value));
                            setPagina(1);
                        }}
                        className="rounded px-3 py-2 bg-gray-800 border border-gray-600 min-w-[150px]"
                    >
                        {[10, 20, 50, 100].map((n) => (
                            <option key={n} value={n}>
                                {n} por página
                            </option>
                        ))}
                    </select>
                </div>

                {/* <div className="w-full sm:w-auto flex justify-center sm:justify-end">
                    <button
                        onClick={() => router.push('/admin/registrar-empleado')}
                        className="bg-red-800 px-4 py-2 rounded font-semibold hover:bg-red-700 flex items-center gap-2"
                    >
                        <span>Registrar</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                        </svg>
                    </button>
                </div> */}
            </section>

            {/* tabla */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/10 bg-gray-800 p-6 shadow-xl max-w-6xl mx-auto">
                <table className="min-w-[1000px] w-full text-sm">
                    <thead className="text-left bg-white/5 text-white">
                        <tr>
                            <th className="p-3">Nombre</th>
                            <th className="p-3">Apellido</th>
                            <th className="p-3">DNI</th>
                            <th className="p-3">Teléfono</th>
                            <th className="p-3">Localidad</th>
                            <th className="p-3">Centros Educativos</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageList.map((emp) => (
                            <tr
                                key={emp._id}
                                onClick={() => verDetalle(emp)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') verDetalle(emp); }}
                                className="hover:bg-white/10 transition cursor-pointer focus:outline-none
                                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                                title="Ver detalle y QR"
                            >
                                <td className="p-2">{emp.nombre}</td>
                                <td className="p-2">{emp.apellido}</td>
                                <td className="p-2">{emp.dni}</td>
                                <td className="p-2">{emp.telefono}</td>
                                <td className="p-2">{emp.localidad}</td>
                                <td className="p-2">
                                    {emp.centrosEducativos.length ? emp.centrosEducativos.join(', ') : (
                                        <span className="text-white/60">—</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* cards mobile */}
            <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                {pageList.map((emp) => (
                    <div
                        key={emp._id}
                        onClick={() => verDetalle(emp)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') verDetalle(emp); }}
                        className="bg-white/5 rounded-lg p-4 border border-white/10 shadow-lg cursor-pointer
                        hover:bg-white/10 transition focus:outline-none
                        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-700"
                        title="Ver detalle y QR"
                    >
                        <p className="font-semibold">{emp.nombre} {emp.apellido}</p>
                        <p>DNI: {emp.dni}</p>
                        <p>Tel: {emp.telefono}</p>
                        <p>Localidad: {emp.localidad}</p>
                        <p>Centros: {emp.centrosEducativos.length ? emp.centrosEducativos.join(', ') : '—'}</p>
                    </div>
                ))}
            </div>

            {/* paginación */}
            {totalPag > 1 && (
                <div className="flex flex-col items-center gap-3 mt-8 text-white">
                    <div className="text-sm text-white/70">
                        Mostrando{' '}
                        <span className="font-semibold">
                            {(págActual - 1) * itemsPorPagina + 1}
                            {'–'}
                            {Math.min(págActual * itemsPorPagina, filtradas.length)}
                        </span>{' '}
                        de <span className="font-semibold">{filtradas.length}</span>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-1">
                        <button
                            onClick={() => setPagina(1)}
                            disabled={págActual === 1}
                            className="px-3 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                            aria-label="Primera"
                        >
                            «
                        </button>
                        <button
                            onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                            disabled={págActual === 1}
                            className="px-3 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                            aria-label="Anterior"
                        >
                            <HiChevronLeft size={20} />
                        </button>

                        {buildPageWindow(totalPag, págActual, 7).map((it, idx) =>
                            it === '…' ? (
                                <span key={`e-${idx}`} className="px-2 h-9 grid place-items-center text-white/70">…</span>
                            ) : (
                                <button
                                    key={it}
                                    onClick={() => setPagina(it as number)}
                                    className={`w-9 h-9 rounded-full font-semibold transition
                    ${págActual === it ? 'bg-red-700 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    {it}
                                </button>
                            )
                        )}

                        <button
                            onClick={() => setPagina((p) => Math.min(p + 1, totalPag))}
                            disabled={págActual === totalPag}
                            className="px-3 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                            aria-label="Siguiente"
                        >
                            <HiChevronRight size={20} />
                        </button>
                        <button
                            onClick={() => setPagina(totalPag)}
                            disabled={págActual === totalPag}
                            className="px-3 h-9 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-30"
                            aria-label="Última"
                        >
                            »
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
