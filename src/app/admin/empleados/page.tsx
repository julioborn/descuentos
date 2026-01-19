'use client';

import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HiChevronLeft, HiChevronRight, HiSearch } from 'react-icons/hi';

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    qrToken: string;
    pais: string;
    localidad: string;
};

/* --- utils --- */
const sinAcentos = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function buildPageWindow(total: number, current: number, maxButtons = 7) {
    if (total <= maxButtons) return Array.from({ length: total }, (_, i) => i + 1);
    const windowSize = maxButtons - 2; // reservamos 1 y total
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

export default function EmpleadosPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const role = session?.user?.role;

    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);

    /* filtros & paginación */
    const [busqueda, setBusqueda] = useState('');
    const [localidadFiltro, setLocalidadFiltro] = useState<'TODAS' | string>('TODAS');
    const [pagina, setPagina] = useState(1);
    const [itemsPorPagina, setItemsPorPagina] = useState<number>(10);

    /* fetch inicial */
    useEffect(() => {
        if (!role) return;

        (async () => {
            try {
                const res = await fetch('/api/empleados');
                if (!res.ok) throw new Error('empleados');

                let data = (await res.json()) as Empleado[];

                // Filtrado por país según rol (igual que tenías)
                const paisesPorRol: Record<string, string> = {
                    admin_arg: 'AR',
                    admin_py: 'PY',
                };
                if (role && paisesPorRol[role]) {
                    data = data.filter((emp) => emp.pais === paisesPorRol[role]);
                }

                // 🚫 dejar solo NO-DOCENTES
                data = data.filter((emp) => emp.empresa !== 'DOCENTES');

                // ordenar por apellido
                data.sort((a, b) => a.apellido.localeCompare(b.apellido));

                setEmpleados(data);
            } catch (e) {
                console.error(e);
                Swal.fire('Error', 'No se pudieron cargar los empleados.', 'error');
            } finally {
                setLoading(false);
            }
        })();
    }, [role]);

    /* listas auxiliares */
    const localidadesUnicas = useMemo(
        () => Array.from(new Set(empleados.map((e) => e.localidad))).sort(),
        [empleados]
    );

    /* búsqueda diferida */
    const deferredBusqueda = useDeferredValue(busqueda);

    const [empresaFiltro, setEmpresaFiltro] = useState<'TODAS' | string>('TODAS');
    // Mapa localidad -> set de empresas
    const empresasPorLocalidad = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const e of empleados) {
            const set = map.get(e.localidad) ?? new Set<string>();
            if (e.empresa) set.add(e.empresa);
            map.set(e.localidad, set);
        }
        return map;
    }, [empleados]);

    // Todas las empresas (cuando localidad = "TODAS")
    const empresasTodas = useMemo(() => {
        const todas = empleados.map((e) => e.empresa).filter(Boolean);
        return Array.from(new Set(todas)).sort();
    }, [empleados]);

    // Empresas a mostrar según localidad seleccionada
    const empresasOpciones = useMemo(() => {
        if (localidadFiltro === 'TODAS') return empresasTodas;
        const set = empresasPorLocalidad.get(localidadFiltro);
        return Array.from(set ?? new Set<string>()).sort();
    }, [localidadFiltro, empresasTodas, empresasPorLocalidad]);

    useEffect(() => {
        if (empresaFiltro !== 'TODAS' && !empresasOpciones.includes(empresaFiltro)) {
            setEmpresaFiltro('TODAS');
        }
    }, [empresasOpciones, empresaFiltro]);

    /* lista filtrada (sin empresa porque ya excluimos DOCENTES) */
    const empleadosFiltrados = useMemo(() => {
        const txt = sinAcentos(deferredBusqueda.trim());
        return empleados.filter((e) => {
            const coincideTxt =
                !txt || sinAcentos(`${e.nombre} ${e.apellido} ${e.dni} ${e.localidad} ${e.empresa}`).includes(txt);
            const coincideLoc = localidadFiltro === 'TODAS' || e.localidad === localidadFiltro;
            const coincideEmp = empresaFiltro === 'TODAS' || e.empresa === empresaFiltro;
            return coincideTxt && coincideLoc && coincideEmp;
        });
    }, [empleados, deferredBusqueda, localidadFiltro, empresaFiltro]);

    /* paginación */
    const totalPag = Math.ceil(empleadosFiltrados.length / itemsPorPagina);
    const págActual = Math.min(pagina, totalPag || 1);
    const listaPagina = empleadosFiltrados.slice(
        (págActual - 1) * itemsPorPagina,
        págActual * itemsPorPagina
    );

    // clamp cuando cambian filtros y se achica totalPag
    useEffect(() => {
        setPagina((p) => Math.min(p, totalPag || 1));
    }, [totalPag]);

    if (status === 'loading' || loading) return <Loader />;

    /* acciones */
    const eliminarEmpleado = async (id: string) => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar empleado?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
        });
        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/empleados/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();
            setEmpleados((prev) => prev.filter((e) => e._id !== id));
            Swal.fire('Eliminado', 'El empleado fue eliminado.', 'success');
        } catch {
            Swal.fire('Error', 'No se pudo eliminar el empleado.', 'error');
        }
    };

    const editarEmpleado = async (id: string) => {
        try {
            const res = await fetch(`/api/empleados/${id}`);
            if (!res.ok) throw new Error();
            const empleado = await res.json();

            const { value: values } = await Swal.fire({
                title: 'Editar empleado',
                html: `
          <input id="swal-nombre" class="swal2-input" placeholder="Nombre" value="${empleado.nombre}">
          <input id="swal-apellido" class="swal2-input" placeholder="Apellido" value="${empleado.apellido}">
          <input id="swal-telefono" class="swal2-input" placeholder="Teléfono" value="${empleado.telefono}">
          <input id="swal-empresa" class="swal2-input" placeholder="Empresa" value="${empleado.empresa}">
          <input id="swal-localidad" class="swal2-input" placeholder="Localidad" value="${empleado.localidad}">
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
                    const empresa = (document.getElementById('swal-empresa') as HTMLInputElement).value.trim();
                    const localidad = (document.getElementById('swal-localidad') as HTMLInputElement).value.trim();
                    if (!nombre || !apellido || !telefono || !empresa || !localidad) {
                        Swal.showValidationMessage('Todos los campos son obligatorios');
                        return;
                    }
                    return { nombre, apellido, telefono, empresa, localidad };
                },
            });

            if (!values) return;

            const updateRes = await fetch(`/api/empleados/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!updateRes.ok) throw new Error();
            const actualizado = await updateRes.json();

            setEmpleados((prev) => prev.map((e) => (e._id === id ? { ...e, ...actualizado } : e)));
            Swal.fire('Actualizado', 'El empleado fue editado correctamente.', 'success');
        } catch {
            Swal.fire('Error', 'No se pudo editar el empleado.', 'error');
        }
    };

    /* Detalle + QR on-demand al tocar fila */
    const verDetalle = async (emp: Empleado) => {
        try {
            const QR = await import('qrcode'); // carga diferida
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const qrUrl = await QR.toDataURL(`${origin}/playero?token=${emp.qrToken}`);

            const html = `
        <div style="display:flex;flex-direction:column;gap:10px;align-items:center">
          <div style="text-align:center">
            <div style="font-size:18px;font-weight:700;">${emp.nombre} ${emp.apellido}</div>
            <div style="opacity:.8">DNI: ${emp.dni} • Tel: ${emp.telefono}</div>
            <div style="opacity:.8">Localidad: ${emp.localidad}</div>
            <div style="opacity:.8">Empresa: ${emp.empresa}</div>
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
        <main className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                <h1 className="text-3xl font-bold text-center mb-6">Empleados</h1>

                {/* Controles */}
                <section className="bg-gray-800/80 border border-gray-700 rounded-2xl p-5 shadow-lg space-y-4">

                    {/* 🔍 BUSCADOR ARRIBA */}
                    <div className="relative">
                        <input
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPagina(1);
                            }}
                            placeholder="Buscar…"
                            className="w-full rounded-xl px-4 py-3 pr-11
                 bg-gray-900 border border-gray-700
                 focus:ring-2 focus:ring-red-700 focus:outline-none"
                        />

                        <HiSearch
                            size={20}
                            className="absolute right-4 top-1/2 -translate-y-1/2
                 text-white/80 pointer-events-none"
                        />
                    </div>

                    {/* 🎛️ FILTROS DEBAJO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                        <select
                            value={localidadFiltro}
                            onChange={(e) => {
                                setLocalidadFiltro(e.target.value);
                                setEmpresaFiltro('TODAS');
                                setPagina(1);
                            }}
                            className="rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
                 focus:ring-2 focus:ring-red-700 focus:outline-none"
                        >
                            <option value="TODAS">Todas las localidades</option>
                            {localidadesUnicas.map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>

                        <select
                            value={empresaFiltro}
                            onChange={(e) => {
                                setEmpresaFiltro(e.target.value);
                                setPagina(1);
                            }}
                            className="rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
                 focus:ring-2 focus:ring-red-700 focus:outline-none"
                        >
                            <option value="TODAS">Todas las empresas</option>
                            {empresasOpciones.map((emp) => (
                                <option key={emp} value={emp}>{emp}</option>
                            ))}
                        </select>

                        <select
                            value={itemsPorPagina}
                            onChange={(e) => {
                                setItemsPorPagina(Number(e.target.value));
                                setPagina(1);
                            }}
                            className="rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
                 focus:ring-2 focus:ring-red-700 focus:outline-none"
                        >
                            {[10, 20, 50, 100].map((n) => (
                                <option key={n} value={n}>{n} por página</option>
                            ))}
                        </select>

                    </div>
                </section>

                {/* Tabla (desktop) */}
                <div className="hidden sm:block bg-gray-800/80 border border-gray-700 rounded-2xl p-5 shadow-lg space-y-4">
                    <table className="min-w-[1100px] w-full text-sm border-separate border-spacing-y-2">

                        <thead className="text-left text-white">
                            <tr
                                className="bg-gray-900 transition shadow-sm hover:shadow-md cursor-pointer
                                focus:outline-none focus:ring-2 focus:ring-blue-500
                                focus:ring-offset-2 focus:ring-offset-gray-900"
                            >
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Apellido</th>
                                <th className="p-3">DNI</th>
                                <th className="p-3">Teléfono</th>
                                <th className="p-3">Empresa</th>
                                <th className="p-3">Localidad</th>
                                <th className="p-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {listaPagina.map((emp) => (
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
                                    <td className="p-2">{emp.empresa}</td>
                                    <td className="p-2">{emp.localidad}</td>
                                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => editarEmpleado(emp._id)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-600 hover:bg-yellow-500 mr-2"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => eliminarEmpleado(emp._id)}
                                            className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-700 hover:bg-red-600"
                                            title="Eliminar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Cards (mobile) */}
                <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                    {listaPagina.map((emp) => (
                        <div
                            key={emp._id}
                            onClick={() => verDetalle(emp)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') verDetalle(emp); }}
                            className="rounded-2xl bg-gray-800 border-gray-700
                            p-4 border border-white/10 shadow-lg cursor-pointer
                        hover:bg-white/10 transition focus:outline-none
                            focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-700"
                            title="Ver detalle y QR"
                        >
                            <p><b>{emp.nombre} {emp.apellido}</b></p>
                            <p>DNI: {emp.dni}</p>
                            <p>Tel: {emp.telefono}</p>
                            <p>Empresa: {emp.empresa}</p>
                            <p>Localidad: {emp.localidad}</p>
                            <div className="mt-3 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={() => editarEmpleado(emp._id)}
                                    className="px-3 py-1 rounded-full bg-yellow-600 hover:bg-yellow-500 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => eliminarEmpleado(emp._id)}
                                    className="px-3 py-1 rounded-full bg-red-700 hover:bg-red-600 text-sm"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                        <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Paginación */}
                {totalPag > 1 && (
                    <div className="flex flex-col items-center gap-3 mt-10 pt-6 border-t border-gray-700">                    <div className="text-sm text-white/70">
                        Mostrando{' '}
                        <span className="font-semibold">
                            {(págActual - 1) * itemsPorPagina + 1}
                            {'–'}
                            {Math.min(págActual * itemsPorPagina, empleadosFiltrados.length)}
                        </span>{' '}
                        de <span className="font-semibold">{empleadosFiltrados.length}</span>
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
            </div>
        </main>
    );
}
