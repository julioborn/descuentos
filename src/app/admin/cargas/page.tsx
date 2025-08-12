'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

type Carga = {
    _id: string;
    fecha: string;
    nombreEmpleado: string;
    dniEmpleado: string;
    producto: string;
    litros: number;
    precioFinal: number;
    precioFinalSinDescuento?: number;
    moneda: string;
    empresa?: string;
    localidad: string;
};

export default function CargasPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemsPorPagina, setItemsPorPagina] = useState(10); // valor inicial configurable

    /* ---- filtros ---- */
    const [busqueda, setBusqueda] = useState('');
    const [productoFiltro, setProductoFiltro] = useState<'TODOS' | string>('TODOS');
    const [pagina, setPagina] = useState(1);
    const [añoFiltro, setAñoFiltro] = useState<'TODOS' | number>('TODOS');
    const [mesFiltro, setMesFiltro] = useState<number>(0); // 0 = Todos los meses
    const [empresaFiltro, setEmpresaFiltro] = useState<'TODAS' | string>('TODAS');
    const empresasUnicas = useMemo(() => {
        return Array.from(new Set(cargas.map((c) => c.empresa || '-')))
            .filter((e) => e !== '-')
            .sort();
    }, [cargas]);

    useEffect(() => {
        const fetchCargas = async () => {
            try {
                const res = await fetch('/api/cargas');
                if (!res.ok) throw new Error();
                setCargas(await res.json());
            } catch {
                Swal.fire('Error', 'No se pudieron cargar las cargas.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCargas();
    }, []);

    useEffect(() => {
        if (!loading && cargas.length > 0) {
            localStorage.setItem('ultimaVisitaCargas', new Date().toISOString());
        }
    }, [loading, cargas]);

    const añosDisponibles = useMemo(() => {
        const añosSet = new Set<number>();
        cargas.forEach(c => {
            const fecha = new Date(c.fecha);
            añosSet.add(fecha.getFullYear());
        });
        return Array.from(añosSet).sort((a, b) => b - a); // del más reciente al más viejo
    }, [cargas]);

    const mesesDelAño = useMemo(() => {
        return [
            { nombre: 'Enero', numero: 1 },
            { nombre: 'Febrero', numero: 2 },
            { nombre: 'Marzo', numero: 3 },
            { nombre: 'Abril', numero: 4 },
            { nombre: 'Mayo', numero: 5 },
            { nombre: 'Junio', numero: 6 },
            { nombre: 'Julio', numero: 7 },
            { nombre: 'Agosto', numero: 8 },
            { nombre: 'Septiembre', numero: 9 },
            { nombre: 'Octubre', numero: 10 },
            { nombre: 'Noviembre', numero: 11 },
            { nombre: 'Diciembre', numero: 12 },
        ];
    }, []);

    /* productos únicos para select */
    const productosUnicos = useMemo(
        () => Array.from(new Set(cargas.map((c) => c.producto))).sort(),
        [cargas]
    );

    // arriba (opcional pero recomendado)
    const norm = (s?: string) =>
        (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    /* lista filtrada */
    const filtradas = useMemo(() => {
        const txt = busqueda.trim().toLowerCase();

        return cargas
            .filter((c) => {
                const fecha = new Date(c.fecha);

                const coincideTxt =
                    !txt || `${c.nombreEmpleado} ${c.dniEmpleado}`.toLowerCase().includes(txt);

                const coincideProd =
                    productoFiltro === 'TODOS' || c.producto === productoFiltro;

                const coincideAño = añoFiltro === 'TODOS' || fecha.getFullYear() === añoFiltro;
                const coincideMes = mesFiltro === 0 || (fecha.getMonth() + 1) === mesFiltro;

                // 👇 NUEVO: filtro por empresa (robusto a espacios/acentos/mayúsculas)
                const coincideEmpresa =
                    empresaFiltro === 'TODAS' ||
                    norm(c.empresa) === norm(empresaFiltro);

                return coincideTxt && coincideProd && coincideAño && coincideMes && coincideEmpresa;
            })
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    }, [cargas, busqueda, productoFiltro, añoFiltro, mesFiltro, empresaFiltro]);


    /* paginación */
    const totalPag = Math.ceil(filtradas.length / itemsPorPagina);
    const págActual = Math.min(pagina, totalPag || 1);
    const pageList = filtradas.slice(
        (págActual - 1) * itemsPorPagina,
        págActual * itemsPorPagina
    );

    if (loading) return <Loader />;

    // const editarCarga = async (id: string) => {
    //     try {
    //         const res = await fetch(`/api/cargas/${id}`);
    //         if (!res.ok) throw new Error();
    //         const carga = await res.json();

    //         const { value: values } = await Swal.fire({
    //             title: 'Editar carga',
    //             html: `
    //                     <div style="display: flex; flex-direction: column; gap: 16px; text-align: center;">
    //                         <div style="display: flex; flex-direction: column; align-items: center;">
    //                             <label for="swal-litros" style="font-weight: 500; margin-bottom: 6px;">Litros</label>
    //                             <input id="swal-litros" class="swal2-input" type="number"
    //                                 value="${carga.litros}" style="width: 80%;">
    //                         </div>

    //                         <div style="display: flex; flex-direction: column; align-items: center;">
    //                             <label for="swal-precio" style="font-weight: 500; margin-bottom: 6px;">Precio final</label>
    //                             <input id="swal-precio" class="swal2-input" type="number"
    //                                 value="${carga.precioFinal}" style="width: 80%;">
    //                         </div>

    //                         <div style="display: flex; flex-direction: column; align-items: center;">
    //                             <label for="swal-precioSin" style="font-weight: 500; margin-bottom: 6px;">Precio sin descuento</label>
    //                             <input id="swal-precioSin" class="swal2-input" type="number"
    //                                 value="${carga.precioFinalSinDescuento || ''}" style="width: 80%;">
    //                         </div>
    //                     </div>
    //                 `,
    //             showCancelButton: true,
    //             confirmButtonText: 'Guardar',
    //             cancelButtonText: 'Cancelar',
    //             customClass: {
    //                 confirmButton:
    //                     'swal2-confirm bg-red-800 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded',
    //                 cancelButton:
    //                     'swal2-cancel px-6 py-2 rounded',
    //             },
    //             focusConfirm: false,
    //             preConfirm: () => {
    //                 const litros = parseFloat(
    //                     (document.getElementById('swal-litros') as HTMLInputElement).value
    //                 );
    //                 const precioFinal = parseFloat(
    //                     (document.getElementById('swal-precio') as HTMLInputElement).value
    //                 );
    //                 const precioFinalSinDescuento = parseFloat(
    //                     (document.getElementById('swal-precioSin') as HTMLInputElement).value
    //                 );

    //                 if (isNaN(litros) || isNaN(precioFinal)) {
    //                     Swal.showValidationMessage('Campos numéricos inválidos');
    //                     return;
    //                 }

    //                 return { litros, precioFinal, precioFinalSinDescuento };
    //             },
    //         });

    //         if (!values) return;

    //         const updateRes = await fetch(`/api/cargas/${id}`, {
    //             method: 'PATCH',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify(values),
    //         });

    //         if (!updateRes.ok) throw new Error();
    //         const actualizado = await updateRes.json();

    //         setCargas(prev =>
    //             prev.map(c => (c._id === id ? { ...c, ...actualizado } : c))
    //         );

    //         Swal.fire('Actualizado', 'La carga fue editada correctamente.', 'success');
    //     } catch {
    //         Swal.fire('Error', 'No se pudo editar la carga.', 'error');
    //     }
    // };

    const eliminarCarga = async (id: string) => {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
        });

        if (!isConfirmed) return;

        try {
            const res = await fetch(`/api/cargas/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error();

            setCargas((prev) => prev.filter((c) => c._id !== id));

            Swal.fire('Eliminado', 'La carga fue eliminada.', 'success');
        } catch {
            Swal.fire('Error', 'No se pudo eliminar.', 'error');
        }
    };

    const banderaPorMoneda = (moneda: string) => {
        if (moneda === 'ARS') return '🇦🇷';
        if (moneda === 'Gs') return '🇵🇾';
        return '';
    };

    const exportarExcel = async () => {
        try {
            const data = filtradas;

            const dataFormateada = data.map(c => {
                const fechaObj = new Date(c.fecha);
                const dia = String(fechaObj.getDate()).padStart(2, '0');
                const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                const año = fechaObj.getFullYear();
                const hora = fechaObj.toLocaleTimeString('es-AR', { hour12: false }); // ✅ 24hs

                return {
                    Fecha: `${dia}/${mes}/${año}`,
                    Hora: hora,
                    Localidad: c.localidad,
                    Empresa: c.empresa || '-',
                    Empleado: c.nombreEmpleado,
                    DNI: c.dniEmpleado,
                    Producto: c.producto,
                    Litros: c.litros,
                    'Precio sin descuento': c.precioFinalSinDescuento || '-',
                    'Precio final': c.precioFinal,
                    Moneda: c.moneda
                };
            });

            const worksheet = XLSX.utils.json_to_sheet(dataFormateada);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Cargas');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

            let nombreArchivo = 'cargas';
            if (añoFiltro !== 'TODOS') nombreArchivo += `-${añoFiltro}`;
            if (mesFiltro !== 0) {
                const nombreMes = mesesDelAño.find(m => m.numero === mesFiltro)?.nombre.toLowerCase();
                if (nombreMes) nombreArchivo += `-${nombreMes}`;
            }
            if (añoFiltro === 'TODOS' && mesFiltro === 0) nombreArchivo += `-todas`;
            nombreArchivo += `.xlsx`;

            saveAs(blob, nombreArchivo);

        } catch (err) {
            Swal.fire('Error', 'No se pudieron exportar las cargas.', 'error');
        }
    };

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-6">Cargas</h1>

            {/* -------- filtros -------- */}
            <section className="flex flex-col md:flex-row md:items-center md:justify-center md:flex-wrap gap-4 max-w-6xl mx-auto mb-6">

                <input
                    value={busqueda}
                    onChange={(e) => {
                        setBusqueda(e.target.value);
                        setPagina(1);
                    }}
                    placeholder="Buscar por nombre o DNI…"
                    className="w-full md:w-auto md:min-w-[200px] flex-1 rounded-lg px-4 py-2 bg-gray-800 border border-gray-600"
                />

                <select
                    value={empresaFiltro}
                    onChange={(e) => {
                        setEmpresaFiltro(e.target.value);
                        setPagina(1);
                    }}
                    className="w-full md:w-auto md:min-w-[180px] rounded-lg px-3 py-2 bg-gray-800 border border-gray-600"
                >
                    <option value="TODAS">Todas las empresas</option>
                    {empresasUnicas.map((empresa) => (
                        <option key={empresa} value={empresa}>{empresa}</option>
                    ))}
                </select>

                <select
                    value={productoFiltro}
                    onChange={(e) => {
                        setProductoFiltro(e.target.value);
                        setPagina(1);
                    }}
                    className="w-full md:w-auto md:min-w-[180px] rounded-lg px-3 py-2 bg-gray-800 border border-gray-600"
                >
                    <option value="TODOS">Todos los productos</option>
                    {productosUnicos.map((p) => {
                        const carga = cargas.find(c => c.producto === p);
                        const bandera = carga ? banderaPorMoneda(carga.moneda) : '';
                        return (
                            <option key={p} value={p}>{bandera} {p}</option>
                        );
                    })}
                </select>

                <select
                    value={añoFiltro}
                    onChange={(e) => {
                        const val = e.target.value;
                        setAñoFiltro(val === 'TODOS' ? 'TODOS' : parseInt(val));
                        setMesFiltro(0);
                        setPagina(1);
                    }}
                    className="w-full md:w-auto md:min-w-[140px] rounded-lg px-3 py-2 bg-gray-800 border border-gray-600"
                >
                    <option value="TODOS">Todos los años</option>
                    {añosDisponibles.map((año) => (
                        <option key={año} value={año}>{año}</option>
                    ))}
                </select>

                <select
                    value={mesFiltro}
                    onChange={(e) => {
                        setMesFiltro(Number(e.target.value));
                        setPagina(1);
                    }}
                    className="w-full md:w-auto md:min-w-[150px] rounded-lg px-3 py-2 bg-gray-800 border border-gray-600"
                >
                    <option value="0">Todos los meses</option>
                    {mesesDelAño.map((m) => (
                        <option key={m.numero} value={m.numero}>{m.nombre}</option>
                    ))}
                </select>

                <select
                    value={itemsPorPagina}
                    onChange={(e) => {
                        setItemsPorPagina(parseInt(e.target.value));
                        setPagina(1);
                    }}
                    className="w-full md:w-auto md:min-w-[140px] rounded-lg px-3 py-2 bg-gray-800 border border-gray-600"
                >
                    {[5, 10, 20, 50, 100].map((cantidad) => (
                        <option key={cantidad} value={cantidad}>
                            Ver {cantidad} por página
                        </option>
                    ))}
                </select>

                <button
                    onClick={exportarExcel}
                    className="w-full md:w-auto md:min-w-[180px] flex items-center justify-center gap-2 rounded-lg bg-green-800 hover:bg-green-700 px-4 py-2 text-white font-semibold shadow-md transition"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="w-5 h-5"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5 7.5 7.5-7.5m-7.5 7.5V3" />
                    </svg>
                    Descargar Excel
                </button>

            </section>

            {/* -------- Tabla desktop -------- */}
            <div className="hidden sm:block overflow-x-auto max-w-6xl mx-auto">
                <table className="min-w-[900px] w-full text-sm border-separate border-spacing-y-2">
                    <thead>
                        <tr className="bg-gray-900/80 text-gray-200">
                            <th className="p-3 text-left rounded-tl-lg">Fecha</th>
                            <th className="p-3 text-left">Hora</th>
                            <th className="p-3 text-left">Empleado</th>
                            <th className="p-3 text-left">DNI</th>
                            <th className="p-3 text-left">Empresa</th>
                            <th className="p-3 text-left">Localidad</th>
                            <th className="p-3 text-left">Producto</th>
                            <th className="p-3 text-center">Litros</th>
                            <th className="p-3 text-center">Sin desc.</th>
                            <th className="p-3 text-center">Final</th>
                            <th className="p-3 text-center rounded-tr-lg">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageList.map((c) => (
                            <tr
                                key={c._id}
                                className="bg-gray-800/90 text-gray-100 hover:bg-gray-700/90 transition-all shadow-sm"
                            >
                                <td className="p-3 rounded-l-lg">
                                    {new Date(c.fecha).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                    })}
                                </td>
                                <td className="p-3">
                                    {new Date(c.fecha).toLocaleTimeString('es-AR', {
                                        hour12: false,
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </td>
                                <td className="p-3 font-semibold">{c.nombreEmpleado}</td>
                                <td className="p-3">{c.dniEmpleado}</td>
                                <td className="p-3">{c.empresa || '-'}</td>
                                <td className="p-3">{c.localidad || '-'}</td>
                                <td className="p-3">{banderaPorMoneda(c.moneda)} {c.producto}</td>
                                <td className="p-3 text-center font-semibold">{c.litros}</td>
                                <td className="p-3 text-center text-gray-300">
                                    {c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}
                                </td>
                                <td className="p-3 text-center font-bold text-green-400">
                                    {c.precioFinal.toLocaleString()} {c.moneda}
                                </td>
                                <td className="p-3 text-center rounded-r-lg">
                                    <button
                                        onClick={() => eliminarCarga(c._id)}
                                        className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-700 hover:bg-red-600 shadow-md"
                                        title="Eliminar"
                                    >
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="size-5"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* -------- Cards mobile -------- */}
            <div className="sm:hidden flex flex-col gap-6 max-w-xl mx-auto">
                {pageList.map((c) => (
                    <div
                        key={c._id}
                        className="bg-gray-800 text-white rounded-2xl p-5 border border-gray-600 shadow-xl"
                    >
                        {/* Cabecera: nombre y producto */}
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-semibold">{c.nombreEmpleado}</h2>
                            <span className="text-sm bg-gray-700 px-3 py-1 rounded-full text-gray-300">
                                {banderaPorMoneda(c.moneda)} {c.producto}
                            </span>
                        </div>

                        {/* Info principal */}
                        <div className="space-y-1 text-sm">
                            <p>
                                <span className="font-semibold text-gray-300">DNI:</span> {c.dniEmpleado}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">Empresa:</span> {c.empresa || '-'}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">Localidad:</span> {c.localidad}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">Fecha:</span>{' '}
                                {new Date(c.fecha).toLocaleDateString('es-AR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric'
                                })}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">Hora:</span>{' '}
                                {new Date(c.fecha).toLocaleTimeString('es-AR', {
                                    hour12: false,
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })}
                            </p>
                            <p>
                                <span className="font-semibold text-gray-300">Litros:</span> {c.litros}
                            </p>
                        </div>

                        <hr className="my-3 border-white/10" />

                        {/* Precios */}
                        <div className="text-sm space-y-1 mb-4">
                            <p>
                                <span className="text-gray-400">Precio sin descuento:</span>{' '}
                                <span className="text-red-400 font-semibold">
                                    {c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}
                                </span>
                            </p>
                            <p>
                                <span className="text-gray-400">Precio final:</span>{' '}
                                <span className="text-green-400 font-semibold">
                                    {c.precioFinal.toLocaleString()} {c.moneda}
                                </span>
                            </p>
                        </div>

                        {/* Botones editar/eliminar */}
                        <div className="flex justify-end gap-3">
                            {/* <button
                                onClick={() => editarCarga(c._id)}
                                className="px-4 py-1 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-full"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                </svg>
                            </button> */}
                            <button
                                onClick={() => eliminarCarga(c._id)}
                                className="px-4 py-1 text-sm bg-red-700 hover:bg-red-600 rounded-full"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                    <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* -------- Paginación -------- */}
            {totalPag > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8 flex-wrap">
                    {/* Botón Anterior */}
                    <button
                        onClick={() => setPagina((p) => Math.max(p - 1, 1))}
                        disabled={págActual === 1}
                        className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-30 bg-gray-800 text-white"
                    >
                        <HiChevronLeft size={22} />
                    </button>

                    {/* Números de página */}
                    {Array.from({ length: totalPag }, (_, i) => i + 1).map((num) => (
                        <button
                            key={num}
                            onClick={() => setPagina(num)}
                            className={`w-9 h-9 rounded-full font-semibold transition 
                    ${págActual === num
                                    ? 'bg-red-700 text-white'
                                    : 'bg-gray-700 text-white hover:bg-gray-600'
                                }`}
                        >
                            {num}
                        </button>
                    ))}

                    {/* Botón Siguiente */}
                    <button
                        onClick={() => setPagina((p) => Math.min(p + 1, totalPag))}
                        disabled={págActual === totalPag}
                        className="p-2 rounded-full hover:bg-gray-700 disabled:opacity-30 bg-gray-800 text-white"
                    >
                        <HiChevronRight size={22} />
                    </button>
                </div>
            )}

        </main>
    );

}
