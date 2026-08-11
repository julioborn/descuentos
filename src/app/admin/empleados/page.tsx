'use client';

import { useEffect, useMemo, useState, useDeferredValue } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { HiChevronLeft, HiChevronRight, HiSearch } from 'react-icons/hi';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

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

const inicialesDe = (nombre?: string, apellido?: string) =>
    `${(apellido?.[0] ?? '').toUpperCase()}${(nombre?.[0] ?? '').toUpperCase()}` || '\u2014';

const slugify = (s?: string) =>
    (s ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();

// El QR de INDIECITO usa una p\u00e1gina p\u00fablica informativa (adem\u00e1s de servir
// para cargar el descuento); el resto de las empresas mantiene el link de siempre.
const urlParaQr = (origin: string, emp: { empresa: string; qrToken: string }) =>
    emp.empresa === 'INDIECITO'
        ? `${origin}/promo?token=${emp.qrToken}`
        : `${origin}/playero?token=${emp.qrToken}`;

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
    const labelDoc = role === 'admin_py' ? 'CI' : 'DNI';
    const labelDocPara = (pais?: string) => (pais === 'PY' ? 'CI' : 'DNI');

    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
    const [generandoZip, setGenerandoZip] = useState(false);
    const [tarjetasZip, setTarjetasZip] = useState<{ emp: Empleado; qrUrl: string }[]>([]);

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

    if (status === 'loading' || loading) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    /* acciones */
    const eliminarEmpleado = async (id: string) => {
        const emp = empleados.find((e) => e._id === id);
        const nombreCompleto = emp ? `${emp.nombre} ${emp.apellido}` : 'este empleado';

        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar empleado?',
            html: `
                <p style="color:#57534e;font-size:14px;margin:0 0 4px;">Vas a eliminar a</p>
                <p style="color:#111827;font-size:17px;font-weight:700;margin:0 0 10px;">${nombreCompleto}</p>
                <p style="color:#a8a29e;font-size:13px;margin:0;">Esta acción no se puede deshacer.</p>
            `,
            icon: 'warning',
            iconColor: '#801818',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            buttonsStyling: false,
            background: '#ffffff',
            color: '#111827',
            customClass: {
                popup: 'rounded-2xl shadow-xl',
                confirmButton: 'bg-[#801818] hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm',
                cancelButton: 'bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-6 py-2.5 rounded-xl',
            },
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

            const labelDni = labelDocPara(empleado.pais);

            const campoStyle = `
                width:100%;
                padding:10px 12px;
                border-radius:10px;
                border:1px solid #e7e5e4;
                background:#fafaf9;
                color:#1c1917;
                font-size:14px;
                outline:none;
                box-sizing:border-box;
            `.replace(/\s+/g, ' ');

            const campo = (id: string, label: string, value: string) => `
                <div style="text-align:left">
                    <label style="display:block;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#a8a29e;margin-bottom:4px;">
                        ${label}
                    </label>
                    <input id="${id}" class="emp-edit-field" style="${campoStyle}" value="${value}">
                </div>
            `;

            const { value: values } = await Swal.fire({
                title: 'Editar empleado',
                html: `
                    <style>
                        .emp-edit-field:focus {
                            border-color: rgba(128,24,24,.5) !important;
                            box-shadow: 0 0 0 3px rgba(128,24,24,.12) !important;
                            background: #fff !important;
                        }
                    </style>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:6px;">
                        ${campo('swal-nombre', 'Nombre', empleado.nombre)}
                        ${campo('swal-apellido', 'Apellido', empleado.apellido)}
                        ${campo('swal-dni', labelDni, empleado.dni)}
                        ${campo('swal-telefono', 'Teléfono', empleado.telefono)}
                        ${campo('swal-empresa', 'Empresa', empleado.empresa)}
                        ${campo('swal-localidad', 'Localidad', empleado.localidad)}
                    </div>
                `,
                width: 480,
                focusConfirm: false,
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Cancelar',
                showCancelButton: true,
                buttonsStyling: false,
                background: '#ffffff',
                color: '#111827',
                customClass: {
                    popup: 'rounded-2xl shadow-xl text-left',
                    confirmButton: 'bg-[#801818] hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm',
                    cancelButton: 'bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-6 py-2.5 rounded-xl',
                },
                preConfirm: () => {
                    const nombre = (document.getElementById('swal-nombre') as HTMLInputElement).value.trim();
                    const apellido = (document.getElementById('swal-apellido') as HTMLInputElement).value.trim();
                    const dni = (document.getElementById('swal-dni') as HTMLInputElement).value.trim();
                    const telefono = (document.getElementById('swal-telefono') as HTMLInputElement).value.trim();
                    const empresa = (document.getElementById('swal-empresa') as HTMLInputElement).value.trim();
                    const localidad = (document.getElementById('swal-localidad') as HTMLInputElement).value.trim();
                    if (!nombre || !apellido || !dni || !telefono || !empresa || !localidad) {
                        Swal.showValidationMessage('Todos los campos son obligatorios');
                        return;
                    }
                    return { nombre, apellido, dni, telefono, empresa, localidad };
                },
            });

            if (!values) return;

            const updateRes = await fetch(`/api/empleados/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (updateRes.status === 409) {
                Swal.fire('Error', `Ya existe otro empleado con ese ${labelDni}.`, 'error');
                return;
            }
            if (!updateRes.ok) throw new Error();
            const actualizado = await updateRes.json();

            setEmpleados((prev) => prev.map((e) => (e._id === id ? { ...e, ...actualizado } : e)));
            Swal.fire('Actualizado', 'El empleado fue editado correctamente.', 'success');
        } catch {
            Swal.fire('Error', 'No se pudo editar el empleado.', 'error');
        }
    };

    /* Descargar en ZIP el QR de cada empleado que queda dentro del filtro actual */
    const descargarQRsZip = async () => {
        const lista = empleadosFiltrados;

        if (lista.length === 0) {
            Swal.fire('Sin resultados', 'No hay empleados para descargar con estos filtros.', 'warning');
            return;
        }

        const { isConfirmed } = await Swal.fire({
            title: 'Descargar QRs',
            html: `Se van a generar <b>${lista.length}</b> código${lista.length === 1 ? '' : 's'} QR
                   (empresa: <b>${empresaFiltro === 'TODAS' ? 'todas' : empresaFiltro}</b>).`,
            icon: 'question',
            iconColor: '#801818',
            showCancelButton: true,
            confirmButtonText: 'Descargar',
            cancelButtonText: 'Cancelar',
            buttonsStyling: false,
            background: '#ffffff',
            color: '#111827',
            customClass: {
                popup: 'rounded-2xl shadow-xl',
                confirmButton: 'bg-[#801818] hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm',
                cancelButton: 'bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold px-6 py-2.5 rounded-xl',
            },
        });
        if (!isConfirmed) return;

        setGenerandoZip(true);

        try {
            const origin = window.location.origin;

            const pares = await Promise.all(
                lista.map(async (emp) => ({
                    emp,
                    qrUrl: await QRCode.toDataURL(urlParaQr(origin, emp), {
                        width: 400,
                        margin: 2,
                    }),
                }))
            );

            setTarjetasZip(pares);
            await new Promise((r) => setTimeout(r, 200)); // esperar a que React pinte las tarjetas ocultas

            const zip = new JSZip();

            for (let i = 0; i < pares.length; i++) {
                const nodo = document.getElementById(`tarjeta-zip-${i}`);
                if (!nodo) continue;

                const canvas = await html2canvas(nodo, { scale: 2 });
                const blob = await new Promise<Blob | null>((resolve) =>
                    canvas.toBlob(resolve, 'image/png', 1)
                );

                if (blob) {
                    const { emp } = pares[i];
                    const nombreArchivo = `qr-${slugify(emp.apellido)}-${slugify(emp.nombre)}-${emp.dni}.png`;
                    zip.file(nombreArchivo, blob);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const nombreZip = `QRs-${empresaFiltro === 'TODAS' ? 'todas-las-empresas' : slugify(empresaFiltro)}.zip`;
            saveAs(zipBlob, nombreZip);

            Swal.fire({
                icon: 'success',
                title: 'Listo',
                text: `Se descargaron ${pares.length} QR${pares.length === 1 ? '' : 's'}.`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2500,
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudieron generar los QRs.', 'error');
        } finally {
            setTarjetasZip([]);
            setGenerandoZip(false);
        }
    };

    /* Detalle + QR on-demand al tocar fila */
    const verDetalle = async (emp: Empleado) => {
        try {
            const QR = await import('qrcode'); // carga diferida
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const qrUrl = await QR.toDataURL(urlParaQr(origin, emp), {
                width: 220,
                margin: 2
            });

            const html = `
<div style="display:flex;flex-direction:column;align-items:center;gap:20px">

<div style="display:flex;align-items:center;justify-content:center;width:56px;height:56px;border-radius:9999px;background:rgba(128,24,24,.1);color:#801818;font-size:16px;font-weight:800;">
${inicialesDe(emp.nombre, emp.apellido)}
</div>

<div style="text-align:center">

<div style="font-size:20px;font-weight:800;color:#111827;letter-spacing:.2px">
${emp.nombre} ${emp.apellido}
</div>

<div style="margin-top:8px;font-size:14px;color:#57534e;font-weight:500">
${labelDocPara(emp.pais)} ${emp.dni} · TEL ${emp.telefono}
</div>

<div style="margin-top:12px;display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:9999px;background:rgba(128,24,24,.1);color:#801818;font-size:12px;font-weight:700;">
${emp.empresa}
</div>
${emp.empresa === "POLICIA" && emp.subcategoria
                    ? `<div style="margin-top:6px;font-size:13px;color:#78716c">${emp.subcategoria}</div>`
                    : ""
                }

<div style="margin-top:10px;font-size:13px;color:#a8a29e">
${emp.localidad}
</div>

</div>

<div style="
padding:16px;
background:#fafaf9;
border:1px solid #e7e5e4;
border-radius:16px;
display:flex;
justify-content:center;
">

<img src="${qrUrl}" alt="QR" style="width:220px;height:auto;display:block"/>

</div>

</div>
`;
            await Swal.fire({
                html,
                width: 480,
                showConfirmButton: true,
                confirmButtonText: "Cerrar",
                buttonsStyling: false,
                background: "#ffffff",
                color: "#111827",
                customClass: {
                    popup: "rounded-2xl shadow-xl p-6",
                    confirmButton:
                        "bg-[#801818] hover:bg-red-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm",
                },
            });
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo generar el QR.', 'error');
        }
    };



    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                            Gestión de personas
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                            Empleados
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#801818]" />
                        {empleadosFiltrados.length} de {empleados.length} empleados
                    </div>
                </div>

                {/* Controles */}
                <section className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">

                    {/* HEADER FILTROS */}
                    <div className="flex items-center justify-between">

                        <div className="flex items-center gap-1.5">
                            <svg
                                className="h-3.5 w-3.5 text-stone-400"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 10h12M10 16h4" />
                            </svg>
                            <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                                Filtros
                            </h2>
                        </div>

                        <button
                            onClick={() => setFiltrosAbiertos(!filtrosAbiertos)}
                            className="sm:hidden flex items-center gap-1 text-xs font-medium text-[#801818]"
                        >
                            <span>{filtrosAbiertos ? "Ocultar" : "Mostrar"}</span>

                            <svg
                                className={`w-3.5 h-3.5 transition-transform ${filtrosAbiertos ? "rotate-180" : ""}`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>

                        </button>

                    </div>

                    <div className="h-px bg-stone-100" />

                    {/* 🔍 BUSCADOR */}
                    <div className="space-y-2.5">
                        <div>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Buscar
                            </label>
                            <div className="relative">
                                <input
                                    value={busqueda}
                                    onChange={(e) => {
                                        setBusqueda(e.target.value)
                                        setPagina(1)
                                    }}
                                    placeholder="Nombre, DNI/CI, empresa, localidad…"
                                    className="w-full rounded-lg px-3 py-2 pr-9 text-sm
bg-stone-50 border border-stone-200
focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition"
                                />
                                <HiSearch
                                    size={16}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                                />
                            </div>
                        </div>

                        {/* 🎛️ FILTROS */}
                        <div className={`${filtrosAbiertos ? "block" : "hidden"} sm:block`}>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">

                                <div>
                                    <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                        Localidad
                                    </label>
                                    <select
                                        value={localidadFiltro}
                                        onChange={(e) => {
                                            setLocalidadFiltro(e.target.value);
                                            setEmpresaFiltro('TODAS');
                                            setPagina(1);
                                        }}
                                        className="w-full rounded-lg px-2.5 py-1.5 text-sm
bg-stone-50 border border-stone-200 text-stone-700
focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none cursor-pointer transition"
                                    >
                                        <option value="TODAS">Todas las localidades</option>
                                        {localidadesUnicas.map((loc) => (
                                            <option key={loc} value={loc}>{loc}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                        Empresa
                                    </label>
                                    <select
                                        value={empresaFiltro}
                                        onChange={(e) => {
                                            setEmpresaFiltro(e.target.value);
                                            setPagina(1);
                                        }}
                                        className="w-full rounded-lg px-2.5 py-1.5 text-sm
bg-stone-50 border border-stone-200 text-stone-700
focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none cursor-pointer transition"
                                    >
                                        <option value="TODAS">Todas las empresas</option>
                                        {empresasOpciones.map((emp) => (
                                            <option key={emp} value={emp}>{emp}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                        Por página
                                    </label>
                                    <select
                                        value={itemsPorPagina}
                                        onChange={(e) => {
                                            setItemsPorPagina(Number(e.target.value));
                                            setPagina(1);
                                        }}
                                        className="w-full rounded-lg px-2.5 py-1.5 text-sm
bg-stone-50 border border-stone-200 text-stone-700
focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none cursor-pointer transition"
                                    >
                                        {[10, 20, 50, 100].map((n) => (
                                            <option key={n} value={n}>{n} por página</option>
                                        ))}
                                    </select>
                                </div>

                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                            onClick={descargarQRsZip}
                            disabled={generandoZip}
                            className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-white text-sm font-semibold shadow-sm transition disabled:opacity-60"
                        >
                            {generandoZip ? 'Generando…' : 'Descargar QRs (ZIP)'}
                        </button>
                    </div>

                </section>

                {/* Tarjetas ocultas usadas solo para generar las imagenes del ZIP */}
                {tarjetasZip.length > 0 && (
                    <div className="fixed left-[-9999px] top-0">
                        {tarjetasZip.map(({ emp, qrUrl }, idx) => (
                            <div
                                key={emp._id}
                                id={`tarjeta-zip-${idx}`}
                                className="relative overflow-hidden bg-white p-9 rounded-[28px] flex flex-col items-center gap-6 w-[320px] border border-stone-200 shadow-lg"
                            >
                                <div className="absolute top-0 inset-x-0 h-1.5 bg-[#801818]" />

                                <div className="mt-2 rounded-2xl border-2 border-[#801818]/25 p-4 bg-white">
                                    <img src={qrUrl} alt="QR" className="w-52 h-52" />
                                </div>

                                <div className="flex flex-col items-center gap-2.5">
                                    <div className="h-[2px] w-10 bg-[#801818] rounded-full" />
                                    <div className="text-lg font-bold uppercase tracking-wide text-[#111827] text-center leading-snug">
                                        {emp.nombre} {emp.apellido}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Estado vacío */}
                {listaPagina.length === 0 && (
                    <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
                        <p className="text-sm text-stone-500">
                            No se encontraron empleados con estos filtros.
                        </p>
                    </div>
                )}

                {listaPagina.length > 0 && (
                    <>
                        {/* Tabla (desktop) */}
                        <div className="hidden sm:block bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
                            <table className="min-w-[1100px] w-full text-sm border-separate border-spacing-y-2">

                                <thead className="text-left text-stone-800">
                                    <tr className="bg-[#111827] text-white">
                                        <th className="p-3 rounded-l-lg">Empleado</th>
                                        <th className="p-3">{labelDoc}</th>
                                        <th className="p-3">Teléfono</th>
                                        <th className="p-3">Empresa</th>
                                        {hayPoliciasEnVista && (
                                            <th className="p-3">Subcategoría</th>
                                        )}
                                        <th className="p-3">Localidad</th>
                                        <th className="p-3 text-center rounded-r-lg">Acciones</th>
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
                                            className="bg-stone-50 hover:bg-stone-100 transition cursor-pointer focus:outline-none
                                            focus:ring-2 focus:ring-[#801818] focus:ring-offset-2 focus:ring-offset-white"
                                            title="Ver detalle y QR"
                                        >
                                            <td className="p-2 rounded-l-lg">
                                                <div className="flex items-center gap-3">
                                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#801818]/10 text-xs font-bold text-[#801818]">
                                                        {inicialesDe(emp.nombre, emp.apellido)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-stone-900 truncate">
                                                            {emp.apellido} {emp.nombre}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-2 text-stone-600">{emp.dni}</td>
                                            <td className="p-2 text-stone-600">{emp.telefono}</td>
                                            <td className="p-2">
                                                <span className="inline-flex items-center rounded-full bg-[#801818]/10 px-2.5 py-1 text-xs font-semibold text-[#801818]">
                                                    {emp.empresa}
                                                </span>
                                            </td>
                                            {hayPoliciasEnVista && (
                                                <td className="p-2 text-stone-600">
                                                    {emp.empresa === 'POLICIA' ? emp.subcategoria || '—' : ''}
                                                </td>
                                            )}
                                            <td className="p-2 text-stone-600">{emp.localidad}</td>
                                            <td className="p-2 text-center rounded-r-lg" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => editarEmpleado(emp._id)}
                                                    className="inline-flex items-center text-white justify-center w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 mr-2 shadow-sm transition"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => eliminarEmpleado(emp._id)}
                                                    className="inline-flex items-center text-white justify-center w-8 h-8 rounded-full bg-[#801818] hover:bg-red-700 shadow-sm transition"
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
border border-stone-200
rounded-2xl
p-4
shadow-sm
active:scale-[0.99]
transition
cursor-pointer
"
                                >

                                    {/* FILA 1 */}
                                    <div className="flex justify-between items-start gap-3">

                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#801818]/10 text-xs font-bold text-[#801818]">
                                                {inicialesDe(emp.nombre, emp.apellido)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-stone-900 truncate">
                                                    {emp.apellido} {emp.nombre}
                                                </p>

                                                <p className="text-xs text-stone-500">
                                                    {labelDocPara(emp.pais)} {emp.dni}
                                                </p>
                                            </div>
                                        </div>

                                        <div
                                            className="flex gap-2 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >

                                            <button
                                                onClick={() => editarEmpleado(emp._id)}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-white shadow-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                                </svg>
                                            </button>

                                            <button
                                                onClick={() => eliminarEmpleado(emp._id)}
                                                className="flex items-center justify-center w-8 h-8 rounded-full bg-[#801818] hover:bg-red-700 text-white shadow-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                                                </svg>
                                            </button>

                                        </div>

                                    </div>

                                    {/* FILA 2 */}
                                    <div className="flex justify-between items-center mt-3">

                                        <span className="inline-flex items-center rounded-full bg-[#801818]/10 px-2.5 py-1 text-xs font-semibold text-[#801818]">
                                            {emp.empresa}
                                        </span>

                                        <div className="text-xs text-stone-500">
                                            {emp.localidad}
                                        </div>

                                    </div>

                                    {/* FILA 3 */}
                                    <div className="flex justify-between items-center mt-2 text-xs text-stone-500">

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
                    </>
                )}

                {/* Paginación */}
                {totalPag > 1 && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="text-sm text-stone-500">
                            Mostrando{' '}
                            <span className="font-semibold text-stone-700">
                                {(págActual - 1) * itemsPorPagina + 1}
                                {'–'}
                                {Math.min(págActual * itemsPorPagina, empleadosFiltrados.length)}
                            </span>{' '}
                            de <span className="font-semibold text-stone-700">{empleadosFiltrados.length}</span>
                        </div>

                        <div className="flex flex-wrap justify-center items-center gap-1">
                            <button
                                onClick={() => setPagina(1)}
                                disabled={págActual === 1}
                                className="px-3 h-9 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30"
                                aria-label="Primera"
                            >
                                «
                            </button>
                            <button
                                onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                                disabled={págActual === 1}
                                className="px-3 h-9 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30"
                                aria-label="Anterior"
                            >
                                <HiChevronLeft size={20} />
                            </button>

                            {buildPageWindow(totalPag, págActual, 7).map((it, idx) =>
                                it === '…' ? (
                                    <span key={`e-${idx}`} className="px-2 h-9 grid place-items-center text-stone-400">…</span>
                                ) : (
                                    <button
                                        key={it}
                                        onClick={() => setPagina(it as number)}
                                        className={`w-9 h-9 rounded-full font-semibold transition
                    ${págActual === it ? 'bg-[#801818] text-white' : 'bg-white border border-stone-200 hover:bg-stone-100'}`}
                                    >
                                        {it}
                                    </button>
                                )
                            )}

                            <button
                                onClick={() => setPagina((p) => Math.min(p + 1, totalPag))}
                                disabled={págActual === totalPag}
                                className="px-3 h-9 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30"
                                aria-label="Siguiente"
                            >
                                <HiChevronRight size={20} />
                            </button>
                            <button
                                onClick={() => setPagina(totalPag)}
                                disabled={págActual === totalPag}
                                className="px-3 h-9 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 disabled:opacity-30"
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
