'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { HiChevronLeft, HiChevronRight, HiSearch } from 'react-icons/hi';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

/* Ventana de paginación con elipsis (igual a /docentes) */
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

export default function CargasPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);
    const [itemsPorPagina, setItemsPorPagina] = useState(10); // valor inicial configurable

    /* ---- filtros ---- */
    const [busqueda, setBusqueda] = useState('');
    const [productoFiltro, setProductoFiltro] = useState<'TODOS' | string>('TODOS');
    const [localidadFiltro, setLocalidadFiltro] = useState<'TODAS' | string>('TODAS');
    const [pagina, setPagina] = useState(1);
    const [añoFiltro, setAñoFiltro] = useState<'TODOS' | number>('TODOS');
    const [mesFiltro, setMesFiltro] = useState<number>(0); // 0 = Todos los meses
    const [empresaFiltro, setEmpresaFiltro] = useState<'TODAS' | string>('TODAS');
    // Localidades únicas
    const localidadesUnicas = useMemo(() => {
        return Array.from(new Set(cargas.map(c => c.localidad).filter(Boolean))).sort();
    }, [cargas]);
    const fmtMoneyAR = (n?: number) =>
        (typeof n === 'number' && isFinite(n))
            ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '-';

    // Mapa Localidad -> Set(Empresa)
    const empresasPorLocalidad = useMemo(() => {
        const map = new Map<string, Set<string>>();
        for (const c of cargas) {
            const loc = c.localidad;
            const emp = c.empresa || '-';
            if (!loc || emp === '-') continue;
            const set = map.get(loc) ?? new Set<string>();
            set.add(emp);
            map.set(loc, set);
        }
        return map;
    }, [cargas]);

    // Todas las empresas (para "TODAS" las localidades)
    const empresasTodas = useMemo(() => {
        const todas = cargas.map(c => c.empresa || '-').filter(e => e !== '-');
        return Array.from(new Set(todas)).sort();
    }, [cargas]);

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

    const [soloHoy, setSoloHoy] = useState(false);

    // helper: compara solo AAAA-MM-DD en hora local
    const esMismoDia = (a: Date, b: Date) => {
        return a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate();
    };

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

    // Parseo robusto: ISO, timestamp o "dd/mm/yyyy[ hh:mm[:ss]]" -> Date local
    const parseFecha = (raw: unknown): Date | null => {
        if (!raw) return null;
        if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;

        const s = String(raw).trim();

        // Intento 1: nativo (ISO, con/sin Z, etc.)
        const d1 = new Date(s);
        if (!isNaN(d1.getTime())) return d1;

        // Intento 2: dd/mm/yyyy [hh:mm[:ss]]
        const m = s.match(
            /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/
        );
        if (m) {
            const [, dd, mm, yyyy, HH = '0', MM = '0', SS = '0'] = m;
            const d = new Date(
                Number(yyyy),
                Number(mm) - 1,
                Number(dd),
                Number(HH),
                Number(MM),
                Number(SS)
            );
            return isNaN(d.getTime()) ? null : d;
        }

        return null;
    };

    // Límites de hoy en horario local
    const hoyStart = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    };
    const hoyEnd = () => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    };

    /* lista filtrada */
    const filtradas = useMemo(() => {
        const txt = busqueda.trim().toLowerCase();
        const ini = hoyStart();
        const fin = hoyEnd();

        return cargas
            .filter((c) => {
                const fecha = parseFecha(c.fecha);
                if (!fecha) return false;

                const coincideTxt =
                    !txt || `${c.nombreEmpleado} ${c.dniEmpleado}`.toLowerCase().includes(txt);

                const coincideLoc =
                    localidadFiltro === 'TODAS' || c.localidad === localidadFiltro; // NUEVO

                const coincideProd =
                    productoFiltro === 'TODOS' || c.producto === productoFiltro;

                const coincideEmpresa =
                    empresaFiltro === 'TODAS' || norm(c.empresa) === norm(empresaFiltro);

                const coincideFecha = soloHoy
                    ? fecha >= ini && fecha <= fin
                    : (
                        (añoFiltro === 'TODOS' || fecha.getFullYear() === añoFiltro) &&
                        (mesFiltro === 0 || (fecha.getMonth() + 1) === mesFiltro)
                    );

                return coincideTxt && coincideLoc && coincideProd && coincideEmpresa && coincideFecha;
            })
            .sort((a, b) => (parseFecha(b.fecha)?.getTime() || 0) - (parseFecha(a.fecha)?.getTime() || 0));
    }, [cargas, busqueda, localidadFiltro, productoFiltro, añoFiltro, mesFiltro, empresaFiltro, soloHoy]);

    /* paginación */
    const totalPag = Math.ceil(filtradas.length / itemsPorPagina);
    const págActual = Math.min(pagina, totalPag || 1);
    const pageList = filtradas.slice(
        (págActual - 1) * itemsPorPagina,
        págActual * itemsPorPagina
    );

    useEffect(() => {
        setPagina((p) => Math.min(p, totalPag || 1));
    }, [totalPag]);


    // MAPA DE ADVERTENCIAS
    const advertenciasPorId = useMemo(() => {
        const map = new Map<string, { muchasCargas: boolean; mas75: boolean }>();

        // Agrupamos por DNI + día
        const cargasPorPersonaDia = new Map<string, number>();

        filtradas.forEach(c => {
            const fechaObj = new Date(c.fecha);
            const diaClave = `${c.dniEmpleado}-${fechaObj.getFullYear()}-${fechaObj.getMonth()}-${fechaObj.getDate()}`;

            const count = cargasPorPersonaDia.get(diaClave) || 0;
            cargasPorPersonaDia.set(diaClave, count + 1);
        });

        filtradas.forEach(c => {
            const fechaObj = new Date(c.fecha);
            const diaClave = `${c.dniEmpleado}-${fechaObj.getFullYear()}-${fechaObj.getMonth()}-${fechaObj.getDate()}`;

            const muchasCargas = (cargasPorPersonaDia.get(diaClave) || 0) > 1;
            const mas75 = c.litros > 75;

            map.set(c._id, { muchasCargas, mas75 });
        });

        return map;
    }, [filtradas]);

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

    // Helpers reutilizables
    const slugify = (str?: string) =>
        (str ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9-_ ]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase();

    const buildNombreArchivo = (
        base: string,
        ext: 'pdf' | 'xlsx',
        opts?: { timestamp?: boolean }
    ) => {
        const partes: string[] = [slugify(base) || 'cargas'];

        if (añoFiltro !== 'TODOS') partes.push(slugify(String(añoFiltro)));
        if (mesFiltro !== 0) {
            const nombreMes = mesesDelAño.find(m => m.numero === mesFiltro)?.nombre;
            if (nombreMes) partes.push(slugify(nombreMes));
        }
        if (localidadFiltro && localidadFiltro !== 'TODAS') partes.push(`loc-${slugify(localidadFiltro)}`);
        if (empresaFiltro && empresaFiltro !== 'TODAS') partes.push(`empresa-${slugify(empresaFiltro)}`);
        if (productoFiltro && productoFiltro !== 'TODOS') partes.push(`producto-${slugify(productoFiltro)}`);
        if (añoFiltro === 'TODOS' && mesFiltro === 0) partes.push('todas');

        if (opts?.timestamp) {
            const d = new Date();
            const pad = (n: number) => String(n).padStart(2, '0');
            const sello = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
            partes.push(sello);
        }

        return `${partes.join('-').slice(0, 140)}.${ext}`;
    };

    /* =========================
        EXPORTAR EXCEL (con SUM)
       ========================= */
    const exportarExcel = async () => {
        try {
            // Armamos datos: precios y litros como NÚMEROS (no strings) para que SUM funcione
            const headers = [
                'Fecha', 'Hora', 'Localidad', 'Empresa', 'Empleado', 'DNI', 'Producto',
                'Litros', 'Precio surtidor', 'Precio con descuento', 'Moneda'
            ] as const;

            const data = filtradas.map(c => {
                const fechaObj = new Date(c.fecha);
                const dia = String(fechaObj.getDate()).padStart(2, '0');
                const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                const año = fechaObj.getFullYear();
                const hora = fechaObj.toLocaleTimeString('es-AR', { hour12: false });

                return {
                    Fecha: `${dia}/${mes}/${año}`,
                    Hora: hora,
                    Localidad: c.localidad,
                    Empresa: c.empresa || '-',
                    Empleado: c.nombreEmpleado,
                    DNI: c.dniEmpleado,
                    Producto: c.producto,
                    Litros: c.litros != null ? Number(c.litros) : null, // número
                    'Precio surtidor': c.precioFinalSinDescuento != null ? Number(c.precioFinalSinDescuento) : null, // número
                    'Precio con descuento': c.precioFinal != null ? Number(c.precioFinal) : null, // número
                    Moneda: c.moneda
                };
            });

            // Hoja con headers fijos para orden consistente
            const worksheet = XLSX.utils.json_to_sheet(data, { header: headers as unknown as string[] });

            // Cantidades de filas
            const dataStartRow = 2; // fila 1 = encabezados
            const endRow = dataStartRow + data.length - 1;

            // Agrego una fila en blanco y la fila de totales con fórmulas
            // Columnas: H = Litros, I = Precio surtidor, J = Precio con descuento
            const blankRowOrigin = `A${endRow + 1 + 1}`; // una después de la última (endRow) +1
            XLSX.utils.sheet_add_aoa(worksheet, [[]], { origin: blankRowOrigin });

            const totalsRowIdx = endRow + 2; // en números de Excel (1-based)
            XLSX.utils.sheet_add_aoa(
                worksheet,
                [[
                    'Totales', '', '', '', '', '', '',
                    { f: `SUM(H${dataStartRow}:H${endRow})` },
                    { f: `SUM(I${dataStartRow}:I${endRow})` },
                    { f: `SUM(J${dataStartRow}:J${endRow})` },
                    ''
                ]],
                { origin: `A${totalsRowIdx + 1}` } // +1 por la fila en blanco que agregamos antes
            );

            // Ajusto formatos numéricos (#,##0.00) para columnas H, I, J en datos y totales
            const setNumFmt = (addr: string) => {
                if (worksheet[addr]) worksheet[addr].z = '#,##0.00';
            };
            for (let r = dataStartRow; r <= endRow; r++) {
                setNumFmt(`H${r}`);
                setNumFmt(`I${r}`);
                setNumFmt(`J${r}`);
            }
            setNumFmt(`H${totalsRowIdx + 1}`);
            setNumFmt(`I${totalsRowIdx + 1}`);
            setNumFmt(`J${totalsRowIdx + 1}`);

            // Nombre de hoja acorde a filtros (máx 31 chars)
            const partesHoja: string[] = ['Cargas'];
            if (añoFiltro !== 'TODOS') partesHoja.push(String(añoFiltro));
            if (mesFiltro !== 0) {
                const nombreMes = mesesDelAño.find(m => m.numero === mesFiltro)?.nombre;
                if (nombreMes) partesHoja.push(nombreMes);
            }
            if (localidadFiltro && localidadFiltro !== 'TODAS') partesHoja.push(`Loc ${localidadFiltro}`);
            if (empresaFiltro && empresaFiltro !== 'TODAS') partesHoja.push(`Emp ${empresaFiltro}`);
            if (productoFiltro && productoFiltro !== 'TODOS') partesHoja.push(`Prod ${productoFiltro}`);
            if (añoFiltro === 'TODOS' && mesFiltro === 0) partesHoja.push('Todas');
            const nombreHoja = partesHoja.join(' - ').slice(0, 31) || 'Cargas';

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

            const nombreArchivo = buildNombreArchivo('Cargas', 'xlsx', { timestamp: false });
            saveAs(blob, nombreArchivo);
        } catch {
            Swal.fire('Error', 'No se pudieron exportar las cargas.', 'error');
        }
    };

    // ======================
    // EXPORTAR PDF (totales solo en la última página)
    // ======================
    const exportarPDF = () => {
        try {
            const sum = (arr: any[], key: string) =>
                arr.reduce((acc, c) => acc + (Number(c?.[key]) || 0), 0);

            const totalLitrosNum = sum(filtradas, 'litros');
            const totalSurtidorNum = sum(filtradas, 'precioFinalSinDescuento');
            const totalConDescNum = sum(filtradas, 'precioFinal');

            const fmt = (n: number) =>
                n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const dataFormateada = filtradas.map(c => {
                const fechaObj = new Date(c.fecha);
                const dia = String(fechaObj.getDate()).padStart(2, '0');
                const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                const año = fechaObj.getFullYear();
                const hora = fechaObj.toLocaleTimeString('es-AR', { hour12: false });

                return {
                    Fecha: `${dia}/${mes}/${año}`,
                    Hora: hora,
                    Localidad: c.localidad,
                    Empresa: c.empresa || '-',
                    Empleado: c.nombreEmpleado,
                    DNI: c.dniEmpleado,
                    Producto: c.producto,
                    Litros: c.litros != null ? fmt(Number(c.litros)) : '-',
                    'Precio surtidor': c.precioFinalSinDescuento != null ? fmt(Number(c.precioFinalSinDescuento)) : '-',
                    'Precio con descuento': c.precioFinal != null ? fmt(Number(c.precioFinal)) : '-',
                    Moneda: c.moneda
                };
            });

            const columns = [
                'Fecha', 'Hora', 'Localidad', 'Empresa', 'Empleado', 'DNI', 'Producto',
                'Litros', 'Precio surtidor', 'Precio con descuento', 'Moneda'
            ] as const;

            const rows = dataFormateada.map(r => [
                r.Fecha, r.Hora, r.Localidad, r.Empresa, r.Empleado, r.DNI, r.Producto,
                r.Litros, r['Precio surtidor'], r['Precio con descuento'], r.Moneda
            ]);

            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

            // ---- Logos en el encabezado (alineados a la derecha) ----
            const logo1 = '/icons/icon-192.png';   // PNG (último)
            const logo2 = '/icons/irossini.jpg';   // JPG (primero)

            const pageW = doc.internal.pageSize.getWidth();
            const topY = 20;         // margen superior
            const w = 40;            // ancho logo
            const h = 40;            // alto logo
            const gap = 10;          // separación entre logos
            const rightMargin = 40;  // margen derecho

            // logo1 último (más a la derecha)
            const xLogo1 = pageW - rightMargin - w;
            // logo2 primero (a la izquierda del logo1)
            const xLogo2 = xLogo1 - gap - w;

            // Dibujo primero logo2 y luego logo1
            doc.addImage(logo2, 'JPEG', xLogo2, topY, w, h);
            doc.addImage(logo1, 'PNG', xLogo1, topY, w, h);

            // ---- Título y filtros alineados a la izquierda ----
            doc.setFontSize(14);
            doc.text('Cargas', 40, 40); // más a la izquierda para que no se superponga con logos

            doc.setFontSize(10);
            const descFiltros = [
                añoFiltro !== 'TODOS' ? `Año: ${añoFiltro}` : 'Año: Todos',
                mesFiltro !== 0 ? `Mes: ${mesesDelAño.find(m => m.numero === mesFiltro)?.nombre}` : 'Mes: Todos',
                localidadFiltro !== 'TODAS' ? `Localidad: ${localidadFiltro}` : 'Localidad: Todas', // NUEVO
                productoFiltro !== 'TODOS' ? `Producto: ${productoFiltro}` : 'Producto: Todos',
                empresaFiltro !== 'TODAS' ? `Empresa: ${empresaFiltro}` : 'Empresa: Todas',
            ].join('   |   ');
            doc.text(descFiltros, 40, 58);

            autoTable(doc, {
                head: [columns as unknown as string[]],
                body: rows,
                startY: 80,
                margin: { bottom: 60 },
                styles: { fontSize: 8, cellPadding: 4, textColor: [0, 0, 0] },
                headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
                columnStyles: {
                    7: { halign: 'right' },
                    8: { halign: 'right' },
                    9: { halign: 'right' },
                },
                foot: [[
                    'Totales', '', '', '', '', '', '',
                    fmt(totalLitrosNum),
                    fmt(totalSurtidorNum),
                    fmt(totalConDescNum),
                    ''
                ]],
                showFoot: 'lastPage',
                footStyles: {
                    fillColor: [31, 41, 55],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                },
                didParseCell: (data) => {
                    if (data.section === 'foot' && [7, 8, 9].includes(Number(data.column.dataKey))) {
                        data.cell.styles.halign = 'right';
                    }
                },
                didDrawPage: () => {
                    const page = doc.getNumberOfPages();
                    doc.setFontSize(9);
                    doc.text(
                        `Página ${page}`,
                        doc.internal.pageSize.getWidth() - 80,
                        doc.internal.pageSize.getHeight() - 20
                    );
                },
            });

            const nombreArchivo = buildNombreArchivo('Cargas', 'pdf', { timestamp: false });
            doc.save(nombreArchivo);
        } catch {
            Swal.fire('Error', 'No se pudo exportar a PDF.', 'error');
        }
    };

    // 🔹 helper único para parsear (coma o punto, elimina separadores de miles)
    const parseNumAR = (val: string) => {
        if (!val) return NaN;
        // "1.234,56" -> "1234.56"
        const s = val.trim().replace(/\./g, '').replace(',', '.');
        return s === '' ? NaN : Number(s);
    };

    // 🔹 formatear de vuelta con coma (para mostrar en los inputs)
    const fmtAR = (n: number) => {
        if (!isFinite(n)) return '';
        return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const editarCarga = async (id: string) => {
        try {
            const res = await fetch(`/api/cargas/${id}`);
            if (!res.ok) throw new Error('fetch carga');
            const carga: Carga = await res.json();

            const { value: values } = await Swal.fire({
                title: 'Editar carga',
                width: 700,
                background: '#1f2937',
                color: '#e5e7eb',
                buttonsStyling: false,
                showCancelButton: true,
                confirmButtonText: 'Guardar',
                cancelButtonText: 'Cancelar',
                customClass: {
                    confirmButton:
                        'swal2-confirm bg-red-800 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded',
                    cancelButton:
                        'swal2-cancel bg-gray-500/60 hover:bg-gray-500/80 text-white font-semibold px-6 py-2 rounded'
                },
                html: `
        <div id="swal-form" style="
          display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:flex-start;width:100%;box-sizing:border-box;">
          <div>
            <label style="font-weight:600;display:block;margin-bottom:6px;">Litros</label>
            <input id="swal-litros" class="swal2-input" inputmode="decimal"
                   value="${carga.litros ?? ''}" placeholder="0,00"
                   style="width:100%;margin:0;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-weight:600;display:block;margin-bottom:6px;">Producto</label>
            <input id="swal-producto" class="swal2-input"
                   value="${carga.producto ?? ''}" placeholder="Ej: Súper"
                   style="width:100%;margin:0;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-weight:600;display:block;margin-bottom:6px;">
              Precio surtidor (${carga.moneda})
            </label>
            <input id="swal-precioSin" class="swal2-input" inputmode="decimal"
                   value="${carga.precioFinalSinDescuento ?? ''}" placeholder="0,00"
                   style="width:100%;margin:0;box-sizing:border-box;">
          </div>
          <div>
            <label style="font-weight:600;display:block;margin-bottom:6px;">
              Precio con descuento (${carga.moneda})
            </label>
            <input id="swal-precio" class="swal2-input" inputmode="decimal"
                   value="${carga.precioFinal ?? ''}" placeholder="0,00"
                   style="width:100%;margin:0;box-sizing:border-box;">
          </div>
          <div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin-top:-6px">
            <input id="swal-auto" type="checkbox" checked />
            <label for="swal-auto">Autocalcular precios al cambiar litros</label>
          </div>
        </div>
      `,
                focusConfirm: false,
                didOpen: () => {
                    const litrosEl = document.getElementById('swal-litros') as HTMLInputElement;
                    const sinEl = document.getElementById('swal-precioSin') as HTMLInputElement;
                    const conEl = document.getElementById('swal-precio') as HTMLInputElement;
                    const autoEl = document.getElementById('swal-auto') as HTMLInputElement;

                    // precios unitarios de referencia
                    const litros0 = Number(carga.litros) || 0;
                    const pSin0 = Number(carga.precioFinalSinDescuento ?? 0);
                    const pCon0 = Number(carga.precioFinal ?? 0);

                    const unitSin = litros0 ? pSin0 / litros0 : NaN;
                    const unitCon = litros0 ? pCon0 / litros0 : NaN;

                    const recalc = () => {
                        if (!autoEl.checked) return;
                        const l = parseNumAR(litrosEl.value);
                        if (!isFinite(l) || l <= 0) return;
                        if (isFinite(unitSin)) sinEl.value = fmtAR(l * unitSin);
                        if (isFinite(unitCon)) conEl.value = fmtAR(l * unitCon);
                    };

                    litrosEl.addEventListener('input', recalc);

                    // 👇 Inicializo los inputs formateados
                    litrosEl.value = fmtAR(Number(carga.litros) || 0);
                    if (carga.precioFinalSinDescuento) sinEl.value = fmtAR(Number(carga.precioFinalSinDescuento));
                    if (carga.precioFinal) conEl.value = fmtAR(Number(carga.precioFinal));
                },
                preConfirm: () => {
                    const litros = parseNumAR((document.getElementById('swal-litros') as HTMLInputElement).value);
                    const prod = (document.getElementById('swal-producto') as HTMLInputElement).value.trim();
                    const precioFinal = parseNumAR((document.getElementById('swal-precio') as HTMLInputElement).value);
                    const precioFinalSinDescuento = parseNumAR((document.getElementById('swal-precioSin') as HTMLInputElement).value);

                    if (Number.isNaN(litros) || Number.isNaN(precioFinal)) {
                        Swal.showValidationMessage('Revisá los números (podés usar coma o punto).');
                        return;
                    }
                    if (!prod) {
                        Swal.showValidationMessage('El producto es obligatorio.');
                        return;
                    }

                    return { litros, producto: prod, precioFinal, precioFinalSinDescuento };
                }
            });

            if (!values) return;

            const updateRes = await fetch(`/api/cargas/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            if (!updateRes.ok) throw new Error('patch carga');

            const actualizado: Partial<Carga> = await updateRes.json();
            setCargas((prev) => prev.map((c) => (c._id === id ? { ...c, ...actualizado } as Carga : c)));
            Swal.fire('Actualizado', 'La carga fue editada correctamente.', 'success');
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo editar la carga.', 'error');
        }
    };

    return (
        <main className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                <h1 className="text-3xl font-bold text-center mb-6">Cargas</h1>

                {/* -------- filtros -------- */}
                <section className="bg-gray-800/80 border border-gray-700 rounded-2xl p-5 shadow-lg space-y-4">
                    {/* Barra de búsqueda sola arriba */}
                    <div className='relative'>
                        <input
                            value={busqueda}
                            onChange={(e) => {
                                setBusqueda(e.target.value);
                                setPagina(1);
                            }}
                            placeholder="Buscar…"
                            className="w-full rounded-xl pr-11 px-4 py-3 bg-gray-900 border border-gray-700
           focus:ring-2 focus:ring-red-700 focus:outline-none"
                        />
                        {/* ícono lupa */}
                        <HiSearch
                            size={20}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 pointer-events-none"
                        />
                    </div>


                    {/* Contenedor de todos los filtros debajo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3">

                        <select
                            value={localidadFiltro}
                            onChange={(e) => {
                                setLocalidadFiltro(e.target.value);
                                setEmpresaFiltro('TODAS');
                                setPagina(1);
                            }}
                            className="w-full md:w-auto md:min-w-[180px] rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
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
                            className="w-full md:w-auto md:min-w-[180px] rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
focus:ring-2 focus:ring-red-700 focus:outline-none"
                        >
                            <option value="TODAS">Todas las empresas</option>
                            {empresasOpciones.map((empresa) => (
                                <option key={empresa} value={empresa}>{empresa}</option>
                            ))}
                        </select>

                        <select
                            value={productoFiltro}
                            onChange={(e) => {
                                setProductoFiltro(e.target.value);
                                setPagina(1);
                            }}
                            className="w-full md:w-auto md:min-w-[180px] rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
focus:ring-2 focus:ring-red-700 focus:outline-none"
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
                            className="w-full md:w-auto md:min-w-[140px] rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
focus:ring-2 focus:ring-red-700 focus:outline-none"
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
                            className="w-full md:w-auto md:min-w-[150px] rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
focus:ring-2 focus:ring-red-700 focus:outline-none"
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
                            className="w-full md:w-auto md:min-w-[140px] rounded-xl px-3 py-2 bg-gray-900 border border-gray-700
focus:ring-2 focus:ring-red-700 focus:outline-none"
                        >
                            {[5, 10, 20, 50, 100].map((cantidad) => (
                                <option key={cantidad} value={cantidad}>
                                    Ver {cantidad}
                                </option>
                            ))}
                        </select>

                        <label className="w-full md:w-auto inline-flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={soloHoy}
                                onChange={(e) => { setSoloHoy(e.target.checked); setPagina(1); }}
                                className="accent-red-700"
                            />
                            <span>Cargas del día</span>
                        </label>

                        <button
                            onClick={exportarExcel}
                            className="w-full md:w-auto md:min-w-[180px] flex items-center justify-center gap-2 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
 bg-green-800 hover:bg-green-700 px-4 py-2 text-white font-semibold shadow-md transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth={1.5}
                                className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5m0 0 5-5m-5 5V3" />
                            </svg>
                            Descargar Excel
                        </button>

                        <button
                            onClick={exportarPDF}
                            className="w-full md:w-auto md:min-w-[180px] flex items-center justify-center gap-2 rounded-xl focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900
 bg-red-800 hover:bg-red-700 px-4 py-2 text-white font-semibold shadow-md transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                                fill="none" stroke="currentColor" strokeWidth={1.5}
                                className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M7 10l5 5m0 0 5-5m-5 5V3" />
                            </svg>
                            Descargar PDF
                        </button>
                    </div>
                </section>

                {/* -------- Tabla desktop -------- */}
                <div className="hidden sm:block bg-gray-800/80 border border-gray-700 rounded-2xl p-5 shadow-lg space-y-4 overflow-x-auto">
                    <table className="min-w-[1100px] w-full text-sm border-separate border-spacing-y-2">
                        <thead className="text-left bg-white/5 text-white">
                            <tr className="bg-gray-900">
                                <th className="p-3 text-left rounded-tl-lg">Fecha</th>
                                <th className="p-3 text-left">Hora</th>
                                <th className="p-3 text-left">Empleado</th>
                                <th className="p-3 text-left">DNI</th>
                                <th className="p-3 text-left">Empresa</th>
                                <th className="p-3 text-left">Localidad</th>
                                <th className="p-3 text-left">Producto</th>
                                <th className="p-3 text-center">Litros</th>
                                <th className="p-3 text-center">Precio Surtidor</th>
                                <th className="p-3 text-center">Precio con Descuento</th>
                                <th className="p-3 text-center rounded-tr-lg">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageList.map((c) => (
                                <tr
                                    key={c._id}
                                    className="bg-gray-800 hover:bg-gray-700/80 transition shadow-sm hover:shadow-md cursor"
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
                                    <td className="p-3 font-semibold">
                                        <div className="flex items-center gap-2">
                                            {c.nombreEmpleado}

                                            {(() => {
                                                const adv = advertenciasPorId.get(c._id);
                                                if (!adv) return null;

                                                return (
                                                    <>
                                                        {adv.muchasCargas && (
                                                            <span title="Más de una carga en el día" className="text-yellow-400 text-xl">
                                                                ⚠️
                                                            </span>
                                                        )}
                                                        {adv.mas75 && (
                                                            <span title="Más de 75 litros" className="text-red-500 text-xl">
                                                                🔥
                                                            </span>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </td>
                                    <td className="p-3">{c.dniEmpleado}</td>
                                    <td className="p-3">{c.empresa || '-'}</td>
                                    <td className="p-3">{c.localidad || '-'}</td>
                                    <td className="p-3">{/*{banderaPorMoneda(c.moneda)}*/} {c.producto}</td>
                                    <td className="p-3 text-center font-semibold">{c.litros}</td>
                                    <td className="p-3 text-center text-gray-300">
                                        {c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}
                                    </td>
                                    <td className="p-3 text-center font-bold text-green-400">
                                        {fmtMoneyAR(c.precioFinal)} {c.moneda}
                                    </td>

                                    <td className="p-3 text-center rounded-r-lg">
                                        <div className='flex gap-1'>
                                            <button
                                                onClick={() => editarCarga(c._id)}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-600 hover:bg-yellow-500 shadow-md"
                                                title="Editar"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                                    <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                                </svg>
                                            </button>
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
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* -------- Cards mobile -------- */}
                <div className="sm:hidden flex flex-col gap-4 max-w-xl mx-auto">
                    {pageList.map((c) => (
                        <div
                            key={c._id}
                            className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-lg"
                        >
                            {/* Cabecera: nombre y producto */}
                            <div className="flex justify-between items-center mb-2">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-lg font-semibold">{c.nombreEmpleado}</h2>

                                    {(() => {
                                        const adv = advertenciasPorId.get(c._id);
                                        if (!adv) return null;

                                        return (
                                            <div className="flex gap-1">
                                                {adv.muchasCargas && (
                                                    <span title="Más de una carga en el día" className="text-yellow-400 text-xl">
                                                        ⚠️
                                                    </span>
                                                )}
                                                {adv.mas75 && (
                                                    <span title="Más de 75 litros" className="text-red-500 text-xl">
                                                        🔥
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <span className="text-sm bg-gray-700 px-3 py-1 rounded-full text-gray-300">
                                    {/*{banderaPorMoneda(c.moneda)}*/} {c.producto}
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
                                    <span className="text-gray-400">Precio surtidor:</span>{' '}
                                    <span className="text-red-400 font-semibold">
                                        {c.precioFinalSinDescuento?.toLocaleString() || '-'} {c.moneda}
                                    </span>
                                </p>
                                <p>
                                    <span className="text-gray-400">Precio con descuento:</span>{' '}
                                    <span className="text-green-400 font-semibold">
                                        {fmtMoneyAR(c.precioFinal)} {c.moneda}
                                    </span>
                                </p>
                            </div>

                            {/* Botones editar/eliminar */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => editarCarga(c._id)}
                                    className="px-4 py-1 text-sm bg-yellow-600 hover:bg-yellow-500 rounded-xl"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                                        <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => eliminarCarga(c._id)}
                                    className="px-4 py-1 text-sm bg-red-700 hover:bg-red-600 rounded-xl"
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
                    <div className="flex flex-col items-center gap-3 mt-10 pt-6 border-t border-gray-700">
                        <div className="text-sm text-white/70">
                            Mostrando{" "}
                            <span className="font-semibold">
                                {(págActual - 1) * itemsPorPagina + 1}
                                {"–"}
                                {Math.min(págActual * itemsPorPagina, filtradas.length)}
                            </span>{" "}
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
                                it === "…" ? (
                                    <span key={`e-${idx}`} className="px-2 h-9 grid place-items-center text-white/70">
                                        …
                                    </span>
                                ) : (
                                    <button
                                        key={it}
                                        onClick={() => setPagina(it as number)}
                                        className={`w-9 h-9 rounded-full font-semibold transition ${págActual === it ? "bg-red-700 text-white" : "bg-gray-700 hover:bg-gray-600"
                                            }`}
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
