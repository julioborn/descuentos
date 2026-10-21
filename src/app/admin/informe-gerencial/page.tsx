'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import 'react-day-picker/dist/style.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { DayPicker, DateRange } from 'react-day-picker';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
} from 'chart.js';
import {
    TrendingUp,
    Fuel,
    DollarSign,
    Percent,
    Users,
    Building2,
    MapPin,
    Receipt,
} from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
);

type Carga = {
    _id: string;
    fecha: string;
    nombreEmpleado: string;
    dniEmpleado: string;
    empresa?: string;
    producto: string;
    litros: number;
    precioFinal: number;
    precioFinalSinDescuento?: number;
    moneda: string;
    localidad?: string;
};

const MESES = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const COLORES_DONA = [
    '#801818', '#b45309', '#15803d', '#1d4ed8', '#6d28d9', '#be185d', '#0f766e', '#a16207',
];

export default function InformeGerencialPage() {
    const { data: session } = useSession();
    const esParaguay = session?.user?.role === 'admin_py';
    const paisQuery = esParaguay ? 'py' : 'arg';

    const [cargas, setCargas] = useState<Carga[]>([]);
    const [empleadosActivos, setEmpleadosActivos] = useState(0);
    const [empresasConDescuento, setEmpresasConDescuento] = useState(0);
    const [loading, setLoading] = useState(true);

    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');
    const [range, setRange] = useState<DateRange | undefined>();
    const [mostrarCalendario, setMostrarCalendario] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const calendarioRef = useRef<HTMLDivElement | null>(null);

    const refMesLitros = useRef<ChartJS<'bar'> | null>(null);
    const refMesMonto = useRef<ChartJS<'line'> | null>(null);
    const refEmpresa = useRef<ChartJS<'bar'> | null>(null);
    const refProducto = useRef<ChartJS<'doughnut'> | null>(null);
    const refLocalidad = useRef<ChartJS<'bar'> | null>(null);

    useEffect(() => {
        const cargarTodo = async () => {
            try {
                const [resCargas, resEmpleados, resDescuentos] = await Promise.all([
                    fetch('/api/cargas'),
                    fetch('/api/empleados'),
                    fetch(`/api/descuentos?pais=${paisQuery}`),
                ]);

                if (!resCargas.ok) throw new Error();

                setCargas(await resCargas.json());

                if (resEmpleados.ok) {
                    const emp = await resEmpleados.json();
                    setEmpleadosActivos(Array.isArray(emp) ? emp.length : 0);
                }

                if (resDescuentos.ok) {
                    const desc = await resDescuentos.json();
                    setEmpresasConDescuento(
                        Array.isArray(desc) ? desc.filter((d: any) => (d.activo ?? true)).length : 0
                    );
                }
            } catch {
                Swal.fire('Error', 'No se pudieron cargar los datos del informe.', 'error');
            } finally {
                setLoading(false);
            }
        };
        cargarTodo();
    }, [paisQuery]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!mostrarCalendario) return;
            const target = event.target as Node;
            if (calendarioRef.current && !calendarioRef.current.contains(target)) {
                setMostrarCalendario(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mostrarCalendario]);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    const moneda = cargas[0]?.moneda || (esParaguay ? 'Gs' : 'ARS');
    const simboloMoneda = moneda === 'ARS' ? '$' : 'Gs';

    const fmtNum = (n?: number) =>
        (typeof n === 'number' && isFinite(n))
            ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '0,00';

    const fmtMoney = (n?: number) => `${simboloMoneda} ${fmtNum(n)}`;

    const fmtPct = (n: number) =>
        `${n >= 0 ? '+' : ''}${n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

    /* ---- filtrado por rango de fechas ---- */
    const dentroDeRango = (fechaIso: string, desde: Date | null, hasta: Date | null) => {
        const f = new Date(fechaIso);
        if (desde && f < desde) return false;
        if (hasta && f > hasta) return false;
        return true;
    };

    const desdeDate = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const hastaDate = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;

    const filtradas = useMemo(
        () => cargas.filter((c) => dentroDeRango(c.fecha, desdeDate, hastaDate)),
        [cargas, fechaDesde, fechaHasta]
    );

    /* ---- período anterior equivalente, para comparar ---- */
    const comparacion = useMemo(() => {
        if (!desdeDate || !hastaDate) return null;

        const duracionMs = hastaDate.getTime() - desdeDate.getTime();
        const prevHasta = new Date(desdeDate.getTime() - 1);
        const prevDesde = new Date(prevHasta.getTime() - duracionMs);

        const previas = cargas.filter((c) => dentroDeRango(c.fecha, prevDesde, prevHasta));

        const litrosActual = filtradas.reduce((a, c) => a + (Number(c.litros) || 0), 0);
        const montoActual = filtradas.reduce((a, c) => a + (Number(c.precioFinal) || 0), 0);
        const litrosPrevio = previas.reduce((a, c) => a + (Number(c.litros) || 0), 0);
        const montoPrevio = previas.reduce((a, c) => a + (Number(c.precioFinal) || 0), 0);

        const variacion = (actual: number, previo: number) =>
            previo > 0 ? ((actual - previo) / previo) * 100 : (actual > 0 ? 100 : 0);

        return {
            litrosPrevio,
            montoPrevio,
            variacionLitros: variacion(litrosActual, litrosPrevio),
            variacionMonto: variacion(montoActual, montoPrevio),
            etiqueta: `${format(prevDesde, 'd MMM', { locale: es })} — ${format(prevHasta, 'd MMM yyyy', { locale: es })}`,
        };
    }, [cargas, filtradas, fechaDesde, fechaHasta]);

    /* ---- KPIs ---- */
    const kpis = useMemo(() => {
        const litros = filtradas.reduce((a, c) => a + (Number(c.litros) || 0), 0);
        const montoSinDescuento = filtradas.reduce((a, c) => a + (Number(c.precioFinalSinDescuento ?? c.precioFinal) || 0), 0);
        const montoConDescuento = filtradas.reduce((a, c) => a + (Number(c.precioFinal) || 0), 0);
        const descuentoOtorgado = montoSinDescuento - montoConDescuento;
        const pctDescuento = montoSinDescuento > 0 ? (descuentoOtorgado / montoSinDescuento) * 100 : 0;
        const cantidadCargas = filtradas.length;
        const litrosPromedio = cantidadCargas > 0 ? litros / cantidadCargas : 0;
        const empresasActivas = new Set(filtradas.map((c) => c.empresa || 'Sin empresa')).size;
        const localidadesActivas = new Set(filtradas.map((c) => c.localidad || 'Sin localidad')).size;

        return {
            litros, montoSinDescuento, montoConDescuento, descuentoOtorgado,
            pctDescuento, cantidadCargas, litrosPromedio, empresasActivas, localidadesActivas,
        };
    }, [filtradas]);

    /* ---- evolución mensual ---- */
    const porMes = useMemo(() => {
        const map = new Map<string, { clave: string; anio: number; mes: number; litros: number; montoSinDescuento: number; montoConDescuento: number }>();

        filtradas.forEach((c) => {
            const f = new Date(c.fecha);
            const anio = f.getFullYear();
            const mes = f.getMonth() + 1;
            const clave = `${anio}-${String(mes).padStart(2, '0')}`;
            const actual = map.get(clave) || { clave, anio, mes, litros: 0, montoSinDescuento: 0, montoConDescuento: 0 };
            actual.litros += Number(c.litros) || 0;
            actual.montoSinDescuento += Number(c.precioFinalSinDescuento ?? c.precioFinal) || 0;
            actual.montoConDescuento += Number(c.precioFinal) || 0;
            map.set(clave, actual);
        });

        return Array.from(map.values()).sort((a, b) => a.clave.localeCompare(b.clave));
    }, [filtradas]);

    const porMesLabel = (f: { anio: number; mes: number }) => `${MESES[f.mes - 1]} ${f.anio}`;

    /* ---- por empresa ---- */
    const porEmpresa = useMemo(() => {
        const map = new Map<string, { empresa: string; litros: number; montoSinDescuento: number; montoConDescuento: number; cargas: number }>();

        filtradas.forEach((c) => {
            const empresa = c.empresa || 'Sin empresa';
            const actual = map.get(empresa) || { empresa, litros: 0, montoSinDescuento: 0, montoConDescuento: 0, cargas: 0 };
            actual.litros += Number(c.litros) || 0;
            actual.montoSinDescuento += Number(c.precioFinalSinDescuento ?? c.precioFinal) || 0;
            actual.montoConDescuento += Number(c.precioFinal) || 0;
            actual.cargas += 1;
            map.set(empresa, actual);
        });

        const totalLitros = kpis.litros || 1;
        return Array.from(map.values())
            .map((e) => ({
                ...e,
                descuentoOtorgado: e.montoSinDescuento - e.montoConDescuento,
                pctLitros: (e.litros / totalLitros) * 100,
            }))
            .sort((a, b) => b.litros - a.litros);
    }, [filtradas, kpis.litros]);

    /* ---- por producto ---- */
    const porProducto = useMemo(() => {
        const map = new Map<string, { producto: string; litros: number; monto: number }>();
        filtradas.forEach((c) => {
            const producto = c.producto || 'Sin producto';
            const actual = map.get(producto) || { producto, litros: 0, monto: 0 };
            actual.litros += Number(c.litros) || 0;
            actual.monto += Number(c.precioFinal) || 0;
            map.set(producto, actual);
        });
        return Array.from(map.values()).sort((a, b) => b.litros - a.litros);
    }, [filtradas]);

    /* ---- por localidad ---- */
    const porLocalidad = useMemo(() => {
        const map = new Map<string, { localidad: string; litros: number; monto: number }>();
        filtradas.forEach((c) => {
            const localidad = c.localidad || 'Sin localidad';
            const actual = map.get(localidad) || { localidad, litros: 0, monto: 0 };
            actual.litros += Number(c.litros) || 0;
            actual.monto += Number(c.precioFinal) || 0;
            map.set(localidad, actual);
        });
        return Array.from(map.values()).sort((a, b) => b.litros - a.litros);
    }, [filtradas]);

    /* ---- top empleados por consumo ---- */
    const topEmpleados = useMemo(() => {
        const map = new Map<string, { dni: string; nombre: string; empresa: string; litros: number; monto: number; cargas: number }>();
        filtradas.forEach((c) => {
            const key = c.dniEmpleado;
            const actual = map.get(key) || { dni: c.dniEmpleado, nombre: c.nombreEmpleado, empresa: c.empresa || '-', litros: 0, monto: 0, cargas: 0 };
            actual.litros += Number(c.litros) || 0;
            actual.monto += Number(c.precioFinal) || 0;
            actual.cargas += 1;
            map.set(key, actual);
        });
        return Array.from(map.values()).sort((a, b) => b.litros - a.litros).slice(0, 10);
    }, [filtradas]);

    const rangoLabel = () => {
        if (desdeDate && hastaDate) {
            return `${format(desdeDate, 'd MMM yyyy', { locale: es })} — ${format(hastaDate, 'd MMM yyyy', { locale: es })}`;
        }
        if (desdeDate) return `Desde ${format(desdeDate, 'd MMM yyyy', { locale: es })}`;
        return 'Todo el historial';
    };

    const slugify = (str?: string) =>
        (str ?? '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-zA-Z0-9-_ ]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase();

    const buildNombreArchivo = (ext: 'pdf' | 'xlsx') => {
        const partes = ['Informe-Gerencial'];
        if (desdeDate) partes.push(slugify(format(desdeDate, 'yyyy-MM-dd')));
        if (hastaDate) partes.push(slugify(format(hastaDate, 'yyyy-MM-dd')));
        return `${partes.join('_').slice(0, 140)}.${ext}`;
    };

    /* ===================== EXPORTAR EXCEL ===================== */
    const exportarExcel = () => {
        try {
            const workbook = XLSX.utils.book_new();

            const resumenData = [
                { Indicador: 'Período', Valor: rangoLabel() },
                { Indicador: 'Litros totales', Valor: Number(kpis.litros.toFixed(2)) },
                { Indicador: `Facturación a precio surtidor (${moneda})`, Valor: Number(kpis.montoSinDescuento.toFixed(2)) },
                { Indicador: `Facturación con descuento aplicado (${moneda})`, Valor: Number(kpis.montoConDescuento.toFixed(2)) },
                { Indicador: `Descuento total otorgado (${moneda})`, Valor: Number(kpis.descuentoOtorgado.toFixed(2)) },
                { Indicador: '% promedio de descuento', Valor: Number(kpis.pctDescuento.toFixed(2)) },
                { Indicador: 'Cantidad de cargas', Valor: kpis.cantidadCargas },
                { Indicador: 'Litros promedio por carga', Valor: Number(kpis.litrosPromedio.toFixed(2)) },
                { Indicador: 'Empresas con movimiento en el período', Valor: kpis.empresasActivas },
                { Indicador: 'Empresas con descuento activo (total)', Valor: empresasConDescuento },
                { Indicador: 'Localidades con movimiento', Valor: kpis.localidadesActivas },
                { Indicador: 'Empleados beneficiarios activos (total)', Valor: empleadosActivos },
            ];
            const hojaResumen = XLSX.utils.json_to_sheet(resumenData);
            XLSX.utils.book_append_sheet(workbook, hojaResumen, 'Resumen');

            const hojaMensual = XLSX.utils.json_to_sheet(porMes.map((f) => ({
                Período: porMesLabel(f),
                Litros: Number(f.litros.toFixed(2)),
                [`Monto sin descuento (${moneda})`]: Number(f.montoSinDescuento.toFixed(2)),
                [`Monto con descuento (${moneda})`]: Number(f.montoConDescuento.toFixed(2)),
                [`Descuento otorgado (${moneda})`]: Number((f.montoSinDescuento - f.montoConDescuento).toFixed(2)),
            })));
            XLSX.utils.book_append_sheet(workbook, hojaMensual, 'Evolución mensual');

            const hojaEmpresa = XLSX.utils.json_to_sheet(porEmpresa.map((e) => ({
                Empresa: e.empresa,
                Litros: Number(e.litros.toFixed(2)),
                '% del total': Number(e.pctLitros.toFixed(2)),
                [`Monto sin descuento (${moneda})`]: Number(e.montoSinDescuento.toFixed(2)),
                [`Monto con descuento (${moneda})`]: Number(e.montoConDescuento.toFixed(2)),
                [`Descuento otorgado (${moneda})`]: Number(e.descuentoOtorgado.toFixed(2)),
                Cargas: e.cargas,
            })));
            XLSX.utils.book_append_sheet(workbook, hojaEmpresa, 'Por Empresa');

            const hojaProducto = XLSX.utils.json_to_sheet(porProducto.map((p) => ({
                Producto: p.producto,
                Litros: Number(p.litros.toFixed(2)),
                [`Monto (${moneda})`]: Number(p.monto.toFixed(2)),
            })));
            XLSX.utils.book_append_sheet(workbook, hojaProducto, 'Por Producto');

            const hojaLocalidad = XLSX.utils.json_to_sheet(porLocalidad.map((l) => ({
                Localidad: l.localidad,
                Litros: Number(l.litros.toFixed(2)),
                [`Monto (${moneda})`]: Number(l.monto.toFixed(2)),
            })));
            XLSX.utils.book_append_sheet(workbook, hojaLocalidad, 'Por Localidad');

            const hojaTop = XLSX.utils.json_to_sheet(topEmpleados.map((e) => ({
                Empleado: e.nombre,
                DNI: e.dni,
                Empresa: e.empresa,
                Litros: Number(e.litros.toFixed(2)),
                [`Monto (${moneda})`]: Number(e.monto.toFixed(2)),
                Cargas: e.cargas,
            })));
            XLSX.utils.book_append_sheet(workbook, hojaTop, 'Top 10 Consumo');

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(blob, buildNombreArchivo('xlsx'));
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo exportar el informe a Excel.', 'error');
        }
    };

    /* ===================== EXPORTAR PDF ===================== */
    const exportarPDF = () => {
        try {
            const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const marginX = 40;

            const logo1 = '/icons/icon-192.png';
            const logo2 = '/icons/irossini.jpg';
            const wLogo = 34;
            const hLogo = 34;
            const topY = 24;
            const xLogo1 = pageW - marginX - wLogo;
            const xLogo2 = xLogo1 - 10 - wLogo;

            if (!esParaguay) doc.addImage(logo2, 'JPEG', xLogo2, topY, wLogo, hLogo);
            doc.addImage(logo1, 'PNG', xLogo1, topY, wLogo, hLogo);

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Informe Gerencial', marginX, 40);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Período: ${rangoLabel()}`, marginX, 58);
            doc.text(`Generado: ${format(new Date(), "d 'de' MMMM yyyy, HH:mm", { locale: es })}`, marginX, 72);

            let y = 100;

            // ---- KPIs ----
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Resumen ejecutivo', marginX, y);
            y += 12;

            const kpiRows: [string, string][] = [
                ['Litros totales', fmtNum(kpis.litros)],
                [`Facturación a precio surtidor`, fmtMoney(kpis.montoSinDescuento)],
                [`Facturación cobrada (con descuento)`, fmtMoney(kpis.montoConDescuento)],
                [`Descuento total otorgado`, `${fmtMoney(kpis.descuentoOtorgado)}  (${kpis.pctDescuento.toFixed(1)}%)`],
                ['Cantidad de cargas', String(kpis.cantidadCargas)],
                ['Litros promedio por carga', fmtNum(kpis.litrosPromedio)],
                ['Empresas con movimiento', String(kpis.empresasActivas)],
                ['Empresas con descuento activo (total)', String(empresasConDescuento)],
                ['Localidades con movimiento', String(kpis.localidadesActivas)],
                ['Empleados beneficiarios activos (total)', String(empleadosActivos)],
            ];

            if (comparacion) {
                kpiRows.push(['Variación de litros vs. período anterior', fmtPct(comparacion.variacionLitros)]);
                kpiRows.push(['Variación de facturación vs. período anterior', fmtPct(comparacion.variacionMonto)]);
            }

            autoTable(doc, {
                body: kpiRows,
                startY: y,
                margin: { left: marginX, right: marginX },
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: { top: 3, bottom: 3, left: 0, right: 4 } },
                columnStyles: {
                    0: { textColor: [87, 83, 78], cellWidth: 260 },
                    1: { fontStyle: 'bold', textColor: [17, 24, 39] },
                },
            });

            y = (doc as any).lastAutoTable.finalY + 24;

            // ---- Gráficos ----
            const agregarGrafico = (ref: React.MutableRefObject<any>, titulo: string, w: number, h: number) => {
                if (!ref.current) return;
                if (y + 20 + h > pageH - 40) {
                    doc.addPage();
                    y = 40;
                }
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(titulo, marginX, y);
                const img = ref.current.toBase64Image();
                doc.addImage(img, 'PNG', marginX, y + 8, w, h);
                y += h + 28;
            };

            const chartW = pageW - marginX * 2;
            agregarGrafico(refMesLitros, 'Litros por mes', chartW, 180);
            agregarGrafico(refMesMonto, `Facturación con descuento por mes (${moneda})`, chartW, 180);
            agregarGrafico(refEmpresa, 'Litros por empresa', chartW, Math.max(140, porEmpresa.length * 18));
            agregarGrafico(refProducto, 'Distribución por producto', chartW * 0.6, 180);
            agregarGrafico(refLocalidad, 'Litros por localidad', chartW, Math.max(140, porLocalidad.length * 18));

            // ---- Tablas ----
            const agregarTabla = (titulo: string, head: string[], rows: (string | number)[][]) => {
                if (y > pageH - 100) {
                    doc.addPage();
                    y = 40;
                }
                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');
                doc.text(titulo, marginX, y);

                autoTable(doc, {
                    head: [head],
                    body: rows,
                    startY: y + 8,
                    margin: { left: marginX, right: marginX, bottom: 50 },
                    styles: { fontSize: 8, cellPadding: 4, textColor: [0, 0, 0] },
                    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
                    didDrawPage: () => {
                        const pagina = doc.getNumberOfPages();
                        doc.setFontSize(9);
                        doc.text(`Página ${pagina}`, pageW - 80, pageH - 20);
                    },
                });

                y = (doc as any).lastAutoTable.finalY + 24;
            };

            doc.addPage();
            y = 40;

            agregarTabla(
                'Detalle por empresa',
                ['Empresa', 'Litros', '% litros', `Monto sin desc.`, `Monto con desc.`, 'Descuento', 'Cargas'],
                porEmpresa.map((e) => [
                    e.empresa, fmtNum(e.litros), `${e.pctLitros.toFixed(1)}%`,
                    fmtMoney(e.montoSinDescuento), fmtMoney(e.montoConDescuento), fmtMoney(e.descuentoOtorgado), e.cargas,
                ])
            );

            agregarTabla(
                'Detalle por producto',
                ['Producto', 'Litros', `Monto (${moneda})`],
                porProducto.map((p) => [p.producto, fmtNum(p.litros), fmtMoney(p.monto)])
            );

            agregarTabla(
                'Detalle por localidad',
                ['Localidad', 'Litros', `Monto (${moneda})`],
                porLocalidad.map((l) => [l.localidad, fmtNum(l.litros), fmtMoney(l.monto)])
            );

            agregarTabla(
                'Evolución mensual',
                ['Período', 'Litros', 'Monto sin desc.', 'Monto con desc.', 'Descuento'],
                porMes.map((f) => [
                    porMesLabel(f), fmtNum(f.litros), fmtMoney(f.montoSinDescuento),
                    fmtMoney(f.montoConDescuento), fmtMoney(f.montoSinDescuento - f.montoConDescuento),
                ])
            );

            agregarTabla(
                'Top 10 beneficiarios por consumo',
                ['Empleado', 'DNI', 'Empresa', 'Litros', `Monto (${moneda})`, 'Cargas'],
                topEmpleados.map((e) => [e.nombre, e.dni, e.empresa, fmtNum(e.litros), fmtMoney(e.monto), e.cargas])
            );

            doc.save(buildNombreArchivo('pdf'));
        } catch (e) {
            console.error(e);
            Swal.fire('Error', 'No se pudo exportar el informe a PDF.', 'error');
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    const statCards = [
        { label: 'Litros totales', valor: fmtNum(kpis.litros), icon: <Fuel className="w-5 h-5" />, variacion: comparacion?.variacionLitros },
        { label: 'Facturación cobrada', valor: fmtMoney(kpis.montoConDescuento), icon: <DollarSign className="w-5 h-5" />, variacion: comparacion?.variacionMonto },
        { label: 'Descuento otorgado', valor: fmtMoney(kpis.descuentoOtorgado), sub: `${kpis.pctDescuento.toFixed(1)}% promedio`, icon: <Percent className="w-5 h-5" /> },
        { label: 'Cargas registradas', valor: String(kpis.cantidadCargas), sub: `${fmtNum(kpis.litrosPromedio)} L/carga prom.`, icon: <Receipt className="w-5 h-5" /> },
        { label: 'Empresas con movimiento', valor: String(kpis.empresasActivas), sub: `${empresasConDescuento} con descuento activo`, icon: <Building2 className="w-5 h-5" /> },
        { label: 'Localidades activas', valor: String(kpis.localidadesActivas), icon: <MapPin className="w-5 h-5" /> },
        { label: 'Beneficiarios activos', valor: String(empleadosActivos), icon: <Users className="w-5 h-5" /> },
    ];

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                            Análisis y reportes
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                            Informe Gerencial
                        </h1>
                        <p className="mt-1 text-xs text-stone-500 max-w-md">
                            Vista consolidada del negocio para dirección: facturación, descuentos, consumo y actividad por empresa.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#801818]" />
                        {rangoLabel()}
                    </div>
                </div>

                {/* Filtros + exportar */}
                <section className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M6 10h12M10 16h4" />
                        </svg>
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                            Rango de fechas
                        </h2>
                    </div>

                    <div className="h-px bg-stone-100" />

                    <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                        <div className="relative w-full sm:w-72" ref={calendarioRef}>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Período
                            </label>
                            <button
                                type="button"
                                onClick={() => setMostrarCalendario((prev) => !prev)}
                                className="w-full rounded-lg px-3 py-1.5 text-sm bg-stone-50 border border-stone-200 hover:bg-stone-100 text-left transition"
                            >
                                {range?.from ? (
                                    range?.to
                                        ? `${format(range.from, 'd MMM', { locale: es })} — ${format(range.to, 'd MMM yyyy', { locale: es })}`
                                        : `Desde ${format(range.from, 'd MMM yyyy', { locale: es })}`
                                ) : (
                                    'Todo el historial'
                                )}
                            </button>

                            {mostrarCalendario && (
                                <div className="absolute z-50 top-16 left-0 bg-white border border-stone-200 rounded-xl shadow-xl p-4">
                                    <DayPicker
                                        mode="range"
                                        locale={es}
                                        selected={range}
                                        numberOfMonths={isMobile ? 1 : 2}
                                        showOutsideDays
                                        style={{
                                            '--rdp-accent-color': '#801818',
                                            '--rdp-accent-background-color': '#80181820',
                                        } as React.CSSProperties}
                                        classNames={{
                                            months: isMobile ? 'flex flex-col gap-4' : 'flex flex-row gap-6',
                                        }}
                                        onSelect={(r) => {
                                            setRange(r);
                                            setFechaDesde(r?.from ? format(r.from, 'yyyy-MM-dd') : '');
                                            setFechaHasta(r?.to ? format(r.to, 'yyyy-MM-dd') : '');
                                            if (r?.from && r?.to && r.from.getTime() !== r.to.getTime()) {
                                                setMostrarCalendario(false);
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {range?.from && (
                            <button
                                onClick={() => { setRange(undefined); setFechaDesde(''); setFechaHasta(''); }}
                                className="text-xs font-semibold text-stone-500 hover:text-[#801818] transition px-2 py-1.5"
                            >
                                Limpiar
                            </button>
                        )}

                        <div className="flex-1" />

                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={exportarExcel}
                                className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-white text-sm font-semibold shadow-sm transition"
                            >
                                Descargar Excel
                            </button>
                            <button
                                onClick={exportarPDF}
                                className="flex items-center gap-2 rounded-xl bg-[#801818] hover:bg-red-700 px-4 py-2 text-white text-sm font-semibold shadow-sm transition"
                            >
                                Descargar PDF
                            </button>
                        </div>
                    </div>

                    {comparacion && (
                        <p className="text-[11px] text-stone-400 pt-1">
                            Comparado contra el período anterior equivalente ({comparacion.etiqueta})
                        </p>
                    )}
                </section>

                {filtradas.length === 0 ? (
                    <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center text-stone-500 shadow-sm">
                        No hay cargas registradas para el período seleccionado.
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {statCards.map((kpi) => (
                                <div key={kpi.label} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#801818]/10 text-[#801818]">
                                            {kpi.icon}
                                        </div>
                                        {typeof kpi.variacion === 'number' && (
                                            <span className={`flex items-center gap-1 text-xs font-bold ${kpi.variacion >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                <TrendingUp className={`w-3.5 h-3.5 ${kpi.variacion < 0 ? 'rotate-180' : ''}`} />
                                                {fmtPct(kpi.variacion)}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-2xl font-black text-[#111827] tracking-tight">{kpi.valor}</p>
                                    <p className="text-xs text-stone-500 mt-1">{kpi.label}</p>
                                    {kpi.sub && <p className="text-[11px] text-stone-400 mt-0.5">{kpi.sub}</p>}
                                </div>
                            ))}
                        </div>

                        {/* Gráficos */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold mb-4 text-stone-700">Litros por mes</h3>
                                <div style={{ height: 260 }}>
                                    <Bar
                                        ref={refMesLitros}
                                        data={{
                                            labels: porMes.map(porMesLabel),
                                            datasets: [{ label: 'Litros', data: porMes.map((f) => f.litros), backgroundColor: 'rgba(128,24,24,0.75)' }],
                                        }}
                                        options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, animation: false }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold mb-4 text-stone-700">Facturación cobrada por mes ({moneda})</h3>
                                <div style={{ height: 260 }}>
                                    <Line
                                        ref={refMesMonto}
                                        data={{
                                            labels: porMes.map(porMesLabel),
                                            datasets: [{ label: 'Monto', data: porMes.map((f) => f.montoConDescuento), borderColor: '#111827', backgroundColor: 'rgba(17,24,39,0.2)', fill: true }],
                                        }}
                                        options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, animation: false }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold mb-4 text-stone-700">Litros por empresa</h3>
                                <div style={{ height: Math.max(220, porEmpresa.length * 34) }}>
                                    <Bar
                                        ref={refEmpresa}
                                        data={{
                                            labels: porEmpresa.map((e) => e.empresa),
                                            datasets: [{ label: 'Litros', data: porEmpresa.map((e) => e.litros), backgroundColor: 'rgba(128,24,24,0.75)' }],
                                        }}
                                        options={{ maintainAspectRatio: false, indexAxis: 'y' as const, plugins: { legend: { display: false } }, animation: false }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold mb-4 text-stone-700">Distribución por producto</h3>
                                <div style={{ height: Math.max(220, porEmpresa.length * 34) }}>
                                    <Doughnut
                                        ref={refProducto}
                                        data={{
                                            labels: porProducto.map((p) => p.producto),
                                            datasets: [{ data: porProducto.map((p) => p.litros), backgroundColor: COLORES_DONA }],
                                        }}
                                        options={{ maintainAspectRatio: false, animation: false }}
                                    />
                                </div>
                            </div>

                            <div className="bg-white border border-stone-200 p-6 rounded-2xl shadow-sm lg:col-span-2">
                                <h3 className="text-sm font-semibold mb-4 text-stone-700">Litros por localidad</h3>
                                <div style={{ height: Math.max(220, porLocalidad.length * 34) }}>
                                    <Bar
                                        ref={refLocalidad}
                                        data={{
                                            labels: porLocalidad.map((l) => l.localidad),
                                            datasets: [{ label: 'Litros', data: porLocalidad.map((l) => l.litros), backgroundColor: 'rgba(17,24,39,0.8)' }],
                                        }}
                                        options={{ maintainAspectRatio: false, plugins: { legend: { display: false } }, animation: false }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tabla por empresa */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-semibold text-stone-800">Detalle por empresa</h2>
                            <div className="bg-white border border-stone-200 shadow-sm rounded-2xl p-5 overflow-x-auto">
                                <table className="min-w-[700px] w-full text-sm border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="bg-[#111827] text-white">
                                            <th className="p-3 text-left rounded-tl-lg">Empresa</th>
                                            <th className="p-3 text-right">Litros</th>
                                            <th className="p-3 text-right">% litros</th>
                                            <th className="p-3 text-right">Monto sin desc.</th>
                                            <th className="p-3 text-right">Monto cobrado</th>
                                            <th className="p-3 text-right">Descuento</th>
                                            <th className="p-3 text-right rounded-tr-lg">Cargas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {porEmpresa.map((e) => (
                                            <tr key={e.empresa} className="bg-stone-50 hover:bg-stone-100 transition">
                                                <td className="p-3 rounded-l-lg font-medium text-stone-700">{e.empresa}</td>
                                                <td className="p-3 text-right font-semibold text-stone-900">{fmtNum(e.litros)}</td>
                                                <td className="p-3 text-right text-stone-500">{e.pctLitros.toFixed(1)}%</td>
                                                <td className="p-3 text-right text-stone-500">{fmtMoney(e.montoSinDescuento)}</td>
                                                <td className="p-3 text-right font-bold text-green-700">{fmtMoney(e.montoConDescuento)}</td>
                                                <td className="p-3 text-right text-[#801818] font-semibold">{fmtMoney(e.descuentoOtorgado)}</td>
                                                <td className="p-3 text-right rounded-r-lg text-stone-500">{e.cargas}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Top empleados */}
                        <section className="space-y-3">
                            <h2 className="text-lg font-semibold text-stone-800">Top 10 beneficiarios por consumo</h2>
                            <div className="bg-white border border-stone-200 shadow-sm rounded-2xl p-5 overflow-x-auto">
                                <table className="min-w-[600px] w-full text-sm border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="bg-[#111827] text-white">
                                            <th className="p-3 text-left rounded-tl-lg">Empleado</th>
                                            <th className="p-3 text-left">Empresa</th>
                                            <th className="p-3 text-right">Litros</th>
                                            <th className="p-3 text-right">Monto</th>
                                            <th className="p-3 text-right rounded-tr-lg">Cargas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {topEmpleados.map((e) => (
                                            <tr key={e.dni} className="bg-stone-50 hover:bg-stone-100 transition">
                                                <td className="p-3 rounded-l-lg font-medium text-stone-700">{e.nombre}</td>
                                                <td className="p-3 text-stone-500">{e.empresa}</td>
                                                <td className="p-3 text-right font-semibold text-stone-900">{fmtNum(e.litros)}</td>
                                                <td className="p-3 text-right font-bold text-green-700">{fmtMoney(e.monto)}</td>
                                                <td className="p-3 text-right rounded-r-lg text-stone-500">{e.cargas}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </>
                )}
            </div>
        </main>
    );
}
