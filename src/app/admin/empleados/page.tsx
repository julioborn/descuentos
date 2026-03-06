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
    subcategoria?: string; // 👈 NUEVO
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
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

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
                !txt || sinAcentos(`${e.nombre} ${e.apellido} ${e.dni} ${e.localidad} ${e.empresa} ${e.subcategoria ?? ''}`).includes(txt);
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

    const hayPoliciasEnVista = useMemo(
        () => listaPagina.some((e) => e.empresa === 'POLICIA'),
        [listaPagina]
    );

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
            const qrUrl = await QR.toDataURL(`${origin}/playero?token=${emp.qrToken}`, {
                width: 220,
                margin: 2
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
${emp.empresa}
</div>
${emp.empresa === "POLICIA" && emp.subcategoria
                    ? `<div style="font-size:14px;color:#4b5563">${emp.subcategoria}</div>`
                    : ""
                }

<div style="margin-top:14px;font-size:15px;color:#4b5563">
${emp.localidad}
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

<img src="${qrUrl}" alt="QR" style="width:220px;height:auto;display:block"/>

</div>

</div>
`;
            await Swal.fire({
                html,
                width: 520,
                showConfirmButton: true,
                confirmButtonText: "Cerrar",
                background: "#ffffff",
                color: "#111827",
                customClass: {
                    popup: "rounded-2xl shadow-xl p-6",
                    confirmButton:
                        "bg-[#801818] hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-xl",
                },
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo generar el QR.', 'error');
        }
    };



    return (
        <main className="min-h-screen px-6 py-10 bg-gray-50 text-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                <h1 className="text-3xl font-bold text-center mb-6 text-[#111827]">
                    Empleados
                </h1>

                {/* Controles */}
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
                        {/* 🎛️ FILTROS */}
                        <div className={`${filtrosAbiertos ? "block" : "hidden"} sm:block`}>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

                                <select
                                    value={localidadFiltro}
                                    onChange={(e) => {
                                        setLocalidadFiltro(e.target.value);
                                        setEmpresaFiltro('TODAS');
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
                                    value={empresaFiltro}
                                    onChange={(e) => {
                                        setEmpresaFiltro(e.target.value);
                                        setPagina(1);
                                    }}
                                    className="rounded-xl px-3 py-2
bg-white border border-gray-200
focus:ring-2 focus:ring-[#801818] focus:outline-none cursor-pointer"
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
                    </div>


                </section>

                {/* Tabla (desktop) */}
                <div className="hidden sm:block bg-gray-50 border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <table className="min-w-[1100px] w-full text-sm border-separate border-spacing-y-2">

                        <thead className="text-left text-gray-800">
                            <tr className="bg-gray-900 text-white">
                                <th className="p-3">Apellido</th>
                                <th className="p-3">Nombre</th>
                                <th className="p-3">DNI</th>
                                <th className="p-3">Teléfono</th>
                                <th className="p-3">Empresa</th>
                                {hayPoliciasEnVista && (
                                    <th className="p-3">Subcategoría</th>
                                )}
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
                                    className="bg-gray-100 hover:bg-gray-100 transition cursor-pointer focus:outline-none
                                    focus:ring-2 focus:ring-[#801818] focus:ring-offset-2 focus:ring-offset-white"
                                    title="Ver detalle y QR"
                                >
                                    <td className="p-2 font-semibold">{emp.apellido}</td>
                                    <td className="p-2 font-semibold">{emp.nombre}</td>
                                    <td className="p-2">{emp.dni}</td>
                                    <td className="p-2">{emp.telefono}</td>
                                    <td className="p-2 text-red-800">{emp.empresa}</td>
                                    {hayPoliciasEnVista && (
                                        <td className="p-2">
                                            {emp.empresa === 'POLICIA' ? emp.subcategoria || '—' : ''}
                                        </td>
                                    )}
                                    <td className="p-2">{emp.localidad}</td>
                                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => editarEmpleado(emp._id)}
                                            className="inline-flex items-center text-white justify-center w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-400 mr-2"
                                            title="Editar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => eliminarEmpleado(emp._id)}
                                            className="inline-flex items-center text-white justify-center w-8 h-8 rounded-full bg-[#801818] hover:bg-red-700"
                                            title="Eliminar"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Lista mobile estilo table-card */}
                <div className="sm:hidden flex flex-col gap-3">

                    {listaPagina.map((emp) => (
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

                            {/* FILA 1 */}
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
                                        onClick={() => editarEmpleado(emp._id)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-500 hover:bg-yellow-400 text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                            <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                        </svg>
                                    </button>

                                    <button
                                        onClick={() => eliminarEmpleado(emp._id)}
                                        className="flex items-center justify-center w-8 h-8 rounded-full bg-[#801818] hover:bg-red-700 text-white"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                        </svg>
                                    </button>

                                </div>

                            </div>

                            {/* FILA 2 */}
                            <div className="flex justify-between items-center mt-3">

                                <div className="text-sm font-medium text-red-800">
                                    {emp.empresa}
                                </div>

                                <div className="text-xs text-gray-500">
                                    {emp.localidad}
                                </div>

                            </div>

                            {/* FILA 3 */}
                            <div className="flex justify-between items-center mt-2 text-xs text-gray-500">

                                <div>
                                    📞 {emp.telefono}
                                </div>

                                {emp.empresa === 'POLICIA' && emp.subcategoria && (
                                    <div>
                                        {emp.subcategoria}
                                    </div>
                                )}

                            </div>

                        </div>
                    ))}

                </div>

                {/* Paginación */}
                {totalPag > 1 && (
                    <div className="flex flex-col items-center gap-3 border-gray-700">
                        <div className="text-sm text-gray-600">
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
                    ${págActual === it ? 'bg-red-700 text-white' : 'bg-white border border-gray-200 hover:bg-gray-100'}`}
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
