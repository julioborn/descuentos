'use client';

import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import { HiChevronLeft, HiChevronRight, HiSearch } from 'react-icons/hi';

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
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

    // mapa auxiliar: empleadoId -> docenteId (para editar/eliminar docente)
    const [docenteIdByEmpleado, setDocenteIdByEmpleado] = useState<Record<string, string>>({});

    /* filtros */
    const [busqueda, setBusqueda] = useState('');
    const [localidadFiltro, setLocalidadFiltro] = useState<'TODAS' | string>('TODAS');
    const [centroFiltro, setCentroFiltro] = useState<'TODOS' | string>('TODOS');
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
                const mapDocenteId: Record<string, string> = {};
                for (const d of docentes) {
                    const empId = typeof d.empleadoId === 'string' ? d.empleadoId : (d.empleadoId?._id as string);
                    if (!empId) continue;
                    centrosPorEmpleado.set(empId, d.centrosEducativos || []);
                    mapDocenteId[empId] = d._id;
                }

                const combinadas: Fila[] = empleadosDoc.map((e) => ({
                    ...e,
                    centrosEducativos: centrosPorEmpleado.get(e._id) || [],
                }));

                combinadas.sort((a, b) => a.apellido.localeCompare(b.apellido));

                setFilas(combinadas);
                setDocenteIdByEmpleado(mapDocenteId);
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'No se pudieron cargar los docentes.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    /* localidades y centros únicos */
    const localidadesUnicas = useMemo(
        () => Array.from(new Set(filas.map((f) => f.localidad))).sort(),
        [filas]
    );

    // Mapa localidad -> set de centros (para filtrar por localidad)
    const centrosPorLocalidad = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const f of filas) {
            const set = map.get(f.localidad) ?? new Set<string>();
            for (const c of (f.centrosEducativos || [])) set.add(c);
            map.set(f.localidad, set);
        }
        return map;
    }, [filas]);

    // Todos los centros (para cuando la localidad es "TODAS")
    const centrosTodos = useMemo(() => {
        const todos = filas.flatMap((f) => f.centrosEducativos || []);
        return Array.from(new Set(todos)).sort();
    }, [filas]);

    // Centros a mostrar según localidad seleccionada
    const centrosOpciones = useMemo(() => {
        if (localidadFiltro === 'TODAS') return centrosTodos;
        const set = centrosPorLocalidad.get(localidadFiltro);
        return Array.from(set ?? new Set<string>()).sort();
    }, [localidadFiltro, centrosTodos, centrosPorLocalidad]);

    useEffect(() => {
        if (centroFiltro !== 'TODOS' && !centrosOpciones.includes(centroFiltro)) {
            setCentroFiltro('TODOS');
        }
    }, [centrosOpciones, centroFiltro]);

    /* búsqueda diferida */
    const deferredBusqueda = useDeferredValue(busqueda);

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
                centroFiltro === 'TODOS' ||
                f.centrosEducativos.some((c) => sinAcentos(c) === sinAcentos(centroFiltro));

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
            const QR = await import('qrcode');
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const qrUrl = await QR.toDataURL(`${origin}/playero?token=${emp.qrToken}`, {
                width: 220,
                margin: 2,
            });

            const html = `
<div style="display:flex;flex-direction:column;align-items:center;gap:22px">

    <div style="text-align:center">

        <div style="font-size:22px;font-weight:800;color:#111827;letter-spacing:.3px">
            ${emp.nombre} ${emp.apellido}
        </div>

        <div style="margin-top:10px;font-size:16px;color:#374151;font-weight:500">
            DNI: ${emp.dni}
        </div>

        <div style="margin-top:4px;font-size:16px;color:#374151;font-weight:500">
            TEL: ${emp.telefono}
        </div>

        <div style="margin-top:14px;font-size:18px;font-weight:700;color:#1f2937">
            DOCENTES
        </div>

        <div style="margin-top:14px;font-size:15px;color:#4b5563">
            ${emp.localidad}
        </div>

        <div style="margin-top:10px;font-size:14px;color:#4b5563;max-width:360px;line-height:1.5">
            ${emp.centrosEducativos.length ? emp.centrosEducativos.join(', ') : 'Sin centros educativos'}
        </div>

    </div>

    <div style="
        padding:14px;
        background:#f3f4f6;
        border-radius:16px;
        box-shadow:0 6px 16px rgba(0,0,0,0.08);
        display:flex;
        justify-content:center;
    ">
        <img src="${qrUrl}" alt="QR" style="width:220px;height:auto;display:block" />
    </div>

</div>
`;

            await Swal.fire({
                html,
                width: 520,
                showConfirmButton: true,
                confirmButtonText: 'Cerrar',
                background: '#ffffff',
                color: '#111827',
                customClass: {
                    popup: 'rounded-2xl shadow-xl p-6',
                    confirmButton:
                        'bg-[#801818] hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl',
                },
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo generar el QR.', 'error');
        }
    };

    /* EDITAR docente (empleado + centros) */
    const editarDocente = async (emp: Fila) => {
        try {
            // Traer datos frescos por si editaron en otra ventana
            const [empRes, docId] = await Promise.all([
                fetch(`/api/empleados/${emp._id}`),
                Promise.resolve(docenteIdByEmpleado[emp._id]),
            ]);
            if (!empRes.ok) throw new Error('empleado fetch');
            const empleado = await empRes.json();

            // Centros actuales (de state)
            const centrosActuales = emp.centrosEducativos.join(', ');

            const { value: values } = await Swal.fire({
                title: 'Editar docente',
                html: `
          <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${empleado.nombre}">
          <input id="swal-apellido" class="swal2-input" placeholder="Apellido" value="${empleado.apellido}">
          <input id="swal-telefono" class="swal2-input" placeholder="Teléfono" value="${empleado.telefono}">
          <input id="swal-localidad" class="swal2-input" placeholder="Localidad" value="${empleado.localidad}">
          <textarea id="swal-centros" class="swal2-textarea" placeholder="Centros educativos (separados por coma)">${centrosActuales}</textarea>
        `,
                focusConfirm: false,
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Cancelar',
                showCancelButton: true,
                customClass: {
                    confirmButton:
                        'swal2-confirm bg-red-800 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded',
                    cancelButton: 'swal2-cancel px-6 py-2 rounded',
                },
                preConfirm: () => {
                    const nombre = (document.getElementById('swal-nombre') as HTMLInputElement).value.trim();
                    const apellido = (document.getElementById('swal-apellido') as HTMLInputElement).value.trim();
                    const telefono = (document.getElementById('swal-telefono') as HTMLInputElement).value.trim();
                    const localidad = (document.getElementById('swal-localidad') as HTMLInputElement).value.trim();
                    const centros = (document.getElementById('swal-centros') as HTMLTextAreaElement).value
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean);

                    if (!nombre || !apellido || !telefono || !localidad) {
                        Swal.showValidationMessage('Nombre, Apellido, Teléfono y Localidad son obligatorios');
                        return;
                    }
                    return { nombre, apellido, telefono, localidad, centros };
                },
            });

            if (!values) return;

            // 1) Actualizar empleado
            const updateEmp = await fetch(`/api/empleados/${emp._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: values.nombre,
                    apellido: values.apellido,
                    telefono: values.telefono,
                    localidad: values.localidad,
                }),
            });
            if (!updateEmp.ok) throw new Error('empleado patch');

            // 2) Upsert docente (como ya usaste en import: POST /api/docentes con empleadoId + centrosEducativos)
            const upsertDoc = await fetch('/api/docentes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId: emp._id,
                    centrosEducativos: values.centros,
                }),
            });
            if (!upsertDoc.ok) throw new Error('docente upsert');

            // 3) Refrescar estado local
            setFilas((prev) =>
                prev.map((f) =>
                    f._id === emp._id
                        ? {
                            ...f,
                            nombre: values.nombre,
                            apellido: values.apellido,
                            telefono: values.telefono,
                            localidad: values.localidad,
                            centrosEducativos: values.centros,
                        }
                        : f
                )
            );

            Swal.fire('Actualizado', 'El docente fue editado correctamente.', 'success');
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo editar el docente.', 'error');
        }
    };

    /* ELIMINAR docente (solo docente o también empleado) */
    const eliminarDocente = async (emp: Fila) => {
        const docenteId = docenteIdByEmpleado[emp._id];

        // si no hay docenteId, ofrecemos eliminar solo empleado (o cancelar)
        const { value: opcion } = await Swal.fire({
            title: 'Eliminar',
            input: 'radio',
            inputOptions: {
                docente: 'Eliminar SOLO el Docente (quita centros educativos)',
                empleado: 'Eliminar Empleado completo (y su vínculo de Docente)',
            },
            inputValue: docenteId ? 'docente' : 'empleado',
            showCancelButton: true,
            confirmButtonText: 'Continuar',
            cancelButtonText: 'Cancelar',
            customClass: {
                confirmButton:
                    'swal2-confirm bg-red-800 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded',
                cancelButton: 'swal2-cancel px-6 py-2 rounded',
            },
        });

        if (!opcion) return;

        try {
            if (opcion === 'docente') {
                if (!docenteId) throw new Error('Docente no encontrado');
                const delDoc = await fetch(`/api/docentes/${docenteId}`, { method: 'DELETE' });
                if (!delDoc.ok) throw new Error('docente delete');

                // limpiar centros en la fila pero mantener empleado
                setFilas((prev) =>
                    prev.map((f) => (f._id === emp._id ? { ...f, centrosEducativos: [] } : f))
                );
                setDocenteIdByEmpleado((prev) => {
                    const next = { ...prev };
                    delete next[emp._id];
                    return next;
                });

                Swal.fire('Eliminado', 'Se eliminó el Docente (centros educativos).', 'success');
            } else if (opcion === 'empleado') {
                // borrar empleado
                const delEmp = await fetch(`/api/empleados/${emp._id}`, { method: 'DELETE' });
                if (!delEmp.ok) throw new Error('empleado delete');

                // borrar docente si existe (mejor esfuerzo)
                if (docenteId) {
                    await fetch(`/api/docentes/${docenteId}`, { method: 'DELETE' }).catch(() => { });
                }

                // quitar fila
                setFilas((prev) => prev.filter((f) => f._id !== emp._id));
                setDocenteIdByEmpleado((prev) => {
                    const next = { ...prev };
                    delete next[emp._id];
                    return next;
                });

                Swal.fire('Eliminado', 'Se eliminó el Empleado (y su Docente asociado, si existía).', 'success');
            }
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo eliminar.', 'error');
        }
    };

    return (
        <main className="min-h-screen px-6 py-10 bg-gray-50 text-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                <h1 className="text-3xl font-bold text-center mb-6 text-[#111827]">
                    Docentes
                </h1>

                {/* controles */}
                <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">

                    {/* HEADER FILTROS (solo mobile) */}
                    <div className="sm:hidden flex items-center justify-between">

                        <h2 className="font-semibold text-gray-800">
                            Filtros
                        </h2>

                        <button
                            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
                            className="flex items-center gap-1 text-sm text-gray-600"
                        >
                            <span>{filtrosAbiertos ? "Ocultar" : "Mostrar"}</span>

                            <svg
                                className={`w-4 h-4 transition-transform ${filtrosAbiertos ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>

                        </button>

                    </div>

                    {/* 🔍 BUSCADOR ARRIBA */}
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                value={busqueda}
                                onChange={(e) => {
                                    setBusqueda(e.target.value)
                                    setPagina(1)
                                }}
                                placeholder="Buscar…"
                                className="w-full rounded-xl px-4 py-3 pr-11
bg-gray-100 border border-gray-200
focus:ring-2 focus:ring-[#801818] focus:outline-none"
                            />
                            <HiSearch
                                size={20}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                            />
                        </div>
                    </div>

                    {/* 🎛️ FILTROS DEBAJO */}
                    <div className={`${filtrosAbiertos ? "block" : "hidden"} sm:block`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                            <select
                                value={localidadFiltro}
                                onChange={(e) => {
                                    setLocalidadFiltro(e.target.value);
                                    setCentroFiltro('TODOS');
                                    setPagina(1);
                                }}
                                className="rounded-xl px-3 py-2
bg-white border border-gray-200
focus:ring-2 focus:ring-[#801818] focus:outline-none cursor-pointer"
                            >
                                <option value="TODAS">Todas las localidades</option>
                                {localidadesUnicas.map((loc) => (
                                    <option key={loc} value={loc}>{loc}</option>
                                ))}
                            </select>

                            <select
                                value={centroFiltro}
                                onChange={(e) => {
                                    setCentroFiltro(e.target.value);
                                    setPagina(1);
                                }}
                                className="rounded-xl px-3 py-2
bg-white border border-gray-200
focus:ring-2 focus:ring-[#801818] focus:outline-none cursor-pointer"
                            >
                                <option value="TODOS">Todos los centros</option>
                                {centrosOpciones.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            <select
                                value={itemsPorPagina}
                                onChange={(e) => {
                                    setItemsPorPagina(Number(e.target.value));
                                    setPagina(1);
                                }}
                                className="rounded-xl px-3 py-2
bg-white border border-gray-200
focus:ring-2 focus:ring-[#801818] focus:outline-none cursor-pointer"
                            >
                                {[10, 20, 50, 100].map((n) => (
                                    <option key={n} value={n}>{n} por página</option>
                                ))}
                            </select>

                        </div>
                    </div>
                </section>

                {/* tabla */}
                <div className="hidden sm:block bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <table className="min-w-[1100px] w-full text-sm border-separate border-spacing-y-2">
                        <thead className="text-left text-gray-800">
                            <tr className="bg-gray-900 text-white">
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Apellido</th>
                                <th className="p-3">DNI</th>
                                <th className="p-3">Teléfono</th>
                                <th className="p-3">Localidad</th>
                                <th className="p-3">Centros Educativos</th>
                                <th className="p-3 text-center">Acciones</th>
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
                                    className="bg-gray-100 hover:bg-gray-100 transition cursor-pointer focus:outline-none
focus:ring-2 focus:ring-[#801818] focus:ring-offset-2 focus:ring-offset-white"
                                    title="Ver detalle y QR"
                                >
                                    <td className="p-2">{emp.nombre}</td>
                                    <td className="p-2">{emp.apellido}</td>
                                    <td className="p-2">{emp.dni}</td>
                                    <td className="p-2">{emp.telefono}</td>
                                    <td className="p-2">{emp.localidad}</td>
                                    <td className="p-2">
                                        {emp.centrosEducativos.length ? emp.centrosEducativos.join(', ') : (
                                            <span className="text-gray-500">—</span>
                                        )}
                                    </td>
                                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => editarDocente(emp)}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-400 text-white"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={() => eliminarDocente(emp)}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#801818] hover:bg-red-700 text-white"
                                                title="Eliminar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* cards mobile */}
                <div className="sm:hidden flex flex-col gap-3">
                    {pageList.map((emp) => (
                        <div
                            key={emp._id}
                            onClick={() => verDetalle(emp)}
                            className="
bg-white
border border-gray-200
rounded-xl
p-4
shadow-sm
active:scale-[0.99]
transition
cursor-pointer
"
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {emp.apellido} {emp.nombre}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        DNI {emp.dni}
                                    </p>
                                </div>

                                <div
                                    className="flex gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => editarDocente(emp)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-400 text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => eliminarDocente(emp)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#801818] hover:bg-red-700 text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-3">
                                <div className="text-sm font-medium text-red-800">
                                    DOCENTES
                                </div>

                                <div className="text-xs text-gray-500">
                                    {emp.localidad}
                                </div>
                            </div>

                            <div className="mt-2 text-xs text-gray-500">
                                📞 {emp.telefono}
                            </div>

                            <div className="mt-2 text-xs text-gray-500">
                                {emp.centrosEducativos.length ? emp.centrosEducativos.join(', ') : 'Sin centros educativos'}
                            </div>
                        </div>
                    ))}
                </div>

                {/* paginación */}
                {totalPag > 1 && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-sm text-gray-600">
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
                                className="px-3 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                                aria-label="Primera"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                                disabled={págActual === 1}
                                className="px-3 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                                aria-label="Anterior"
                            >
                                <HiChevronLeft size={20} />
                            </button>

                            {buildPageWindow(totalPag, págActual, 7).map((it, idx) =>
                                it === '…' ? (
                                    <span key={`e-${idx}`} className="px-2 h-9 grid place-items-center text-gray-600">…</span>
                                ) : (
                                    <button
                                        key={it}
                                        onClick={() => setPagina(it as number)}
                                        className={`w-9 h-9 rounded-full font-semibold transition
                    ${págActual === it
                                                ? 'bg-red-700 text-white'
                                                : 'bg-white border border-gray-200 hover:bg-gray-100'}`}
                                    >
                                        {it}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => setPagina((p) => Math.min(p + 1, totalPag))}
                                disabled={págActual === totalPag}
                                className="px-3 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                                aria-label="Siguiente"
                            >
                                <HiChevronRight size={20} />
                            </button>
                            <button
                                onClick={() => setPagina(totalPag)}
                                disabled={págActual === totalPag}
                                className="px-3 h-9 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-30"
                                aria-label="Última"
                            >
                                »
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
