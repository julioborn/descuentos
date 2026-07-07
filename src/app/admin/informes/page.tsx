'use client';

import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    PointElement,
    LineElement
);

type Carga = {
    _id: string;
    fecha: string;
    empresa?: string;
    litros: number;
    precioFinal: number;
    moneda: string;
};

type Fila = { anio: number; mes: number; litros: number; monto: number };
type Bloque = { empresa: string; moneda: string; filas: Fila[]; totalLitros: number; totalMonto: number };

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MESES_OPCIONES = MESES.map((nombre, i) => ({ nombre, numero: i + 1 }));

export default function InformesPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [loading, setLoading] = useState(true);
    const [añoFiltro, setAñoFiltro] = useState<'TODOS' | number>('TODOS');
    const [mesFiltro, setMesFiltro] = useState<number>(0); // 0 = todos los meses
    const [empresaActiva, setEmpresaActiva] = useState<'TODAS' | string>('TODAS');

    useEffect(() => {
        const fetchCargas = async () => {
            try {
                const res = await fetch('/api/cargas');
                if (!res.ok) throw new Error();
                setCargas(await res.json());
            } catch {
                Swal.fire('Error', 'No se pudieron cargar los datos del informe.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchCargas();
    }, []);

    const norm = (s?: string) =>
        (s ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const fmtMoneyAR = (n?: number) =>
        (typeof n === 'number' && isFinite(n))
            ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '-';

    const empresasUnicas = useMemo(() => {
        return Array.from(new Set(cargas.map(c => c.empresa).filter(Boolean) as string[])).sort();
    }, [cargas]);

    const añosDisponibles = useMemo(() => {
        const set = new Set<number>();
        cargas.forEach(c => set.add(new Date(c.fecha).getFullYear()));
        return Array.from(set).sort((a, b) => b - a);
    }, [cargas]);

    useEffect(() => {
        if (añoFiltro === 'TODOS' && añosDisponibles.length > 0) {
            setAñoFiltro(añosDisponibles[0]);
        }
    }, [añosDisponibles]);

    const bloques: Bloque[] = useMemo(() => {
        const base = empresaActiva === 'TODAS'
            ? cargas
            : cargas.filter(c => norm(c.empresa) === norm(empresaActiva));

        const filtradas = base.filter(c => {
            const fecha = new Date(c.fecha);
            const coincideAnio = añoFiltro === 'TODOS' || fecha.getFullYear() === añoFiltro;
            const coincideMes = mesFiltro === 0 || (fecha.getMonth() + 1) === mesFiltro;
            return coincideAnio && coincideMes;
        });

        const map = new Map<string, Map<string, Fila>>();
        for (const c of filtradas) {
            const empresa = c.empresa || 'Sin empresa';
            const moneda = c.moneda || '-';
            const grupoKey = `${empresa}||${moneda}`;
            const fecha = new Date(c.fecha);
            const anio = fecha.getFullYear();
            const mes = fecha.getMonth() + 1;
            const key = `${anio}-${mes}`;

            if (!map.has(grupoKey)) map.set(grupoKey, new Map());
            const sub = map.get(grupoKey)!;
            const actual = sub.get(key) || { anio, mes, litros: 0, monto: 0 };
            actual.litros += Number(c.litros) || 0;
            actual.monto += Number(c.precioFinal) || 0;
            sub.set(key, actual);
        }

        return Array.from(map.entries())
            .map(([grupoKey, sub]) => {
                const [empresa, moneda] = grupoKey.split('||');
                let filas: Fila[];
                if (añoFiltro !== 'TODOS' && mesFiltro === 0) {
                    filas = Array.from({ length: 12 }, (_, i) => {
                        const mes = i + 1;
                        return sub.get(`${añoFiltro}-${mes}`) || { anio: añoFiltro as number, mes, litros: 0, monto: 0 };
                    });
                } else {
                    filas = Array.from(sub.values()).sort((a, b) => a.anio - b.anio || a.mes - b.mes);
                }
                const totalLitros = filas.reduce((acc, f) => acc + f.litros, 0);
                const totalMonto = filas.reduce((acc, f) => acc + f.monto, 0);
                return { empresa, moneda, filas, totalLitros, totalMonto };
            })
            .sort((a, b) => a.empresa.localeCompare(b.empresa) || a.moneda.localeCompare(b.moneda));
    }, [cargas, empresaActiva, añoFiltro, mesFiltro]);

    const periodoLabel = (f: Fila) =>
        añoFiltro !== 'TODOS' ? MESES[f.mes - 1] : `${MESES[f.mes - 1]} ${f.anio}`;

    const slugify = (str?: string) =>
        (str ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9-_ ]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .toLowerCase();

    const buildNombreArchivo = (ext: 'pdf' | 'xlsx') => {
        const partes: string[] = ['Informe'];
        partes.push(empresaActiva !== 'TODAS' ? slugify(empresaActiva) : 'todas-las-empresas');
        partes.push(añoFiltro !== 'TODOS' ? String(añoFiltro) : 'todos-los-anios');
        if (mesFiltro !== 0) {
            const nombreMes = MESES_OPCIONES.find(m => m.numero === mesFiltro)?.nombre;
            if (nombreMes) partes.push(slugify(nombreMes));
        }
        return `${partes.join('-').slice(0, 140)}.${ext}`;
    };

    const exportarExcel = () => {
        try {
            const workbook = XLSX.utils.book_new();

            bloques.forEach(bloque => {
                const headers = ['Período', 'Litros', 'Monto'] as const;
                const data = bloque.filas.map(f => ({
                    Período: periodoLabel(f),
                    Litros: Number(f.litros),
                    Monto: Number(f.monto),
                }));

                const worksheet = XLSX.utils.json_to_sheet(data, { header: headers as unknown as string[] });

                const dataStartRow = 2;
                const endRow = dataStartRow + data.length - 1;
                const totalsRowIdx = endRow + 2;

                XLSX.utils.sheet_add_aoa(worksheet, [[]], { origin: `A${endRow + 1}` });
                XLSX.utils.sheet_add_aoa(
                    worksheet,
                    [[
                        'Totales',
                        { f: `SUM(B${dataStartRow}:B${endRow})` },
                        { f: `SUM(C${dataStartRow}:C${endRow})` },
                    ]],
                    { origin: `A${totalsRowIdx}` }
                );

                const setNumFmt = (addr: string) => {
                    if (worksheet[addr]) worksheet[addr].z = '#,##0.00';
                };
                for (let r = dataStartRow; r <= endRow; r++) {
                    setNumFmt(`B${r}`);
                    setNumFmt(`C${r}`);
                }
                setNumFmt(`B${totalsRowIdx}`);
                setNumFmt(`C${totalsRowIdx}`);

                const baseHoja = `${bloque.empresa} - ${bloque.moneda}`.slice(0, 31);
                let nombreHoja = baseHoja || 'Hoja';
                let sufijo = 1;
                while (workbook.SheetNames.includes(nombreHoja)) {
                    sufijo += 1;
                    nombreHoja = `${baseHoja.slice(0, 28)} (${sufijo})`;
                }
                XLSX.utils.book_append_sheet(workbook, worksheet, nombreHoja);
            });

            if (bloques.length === 0) {
                const worksheet = XLSX.utils.json_to_sheet([{ Período: '-', Litros: 0, Monto: 0 }]);
                XLSX.utils.book_append_sheet(workbook, worksheet, 'Sin datos');
            }

            const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
            saveAs(blob, buildNombreArchivo('xlsx'));
        } catch {
            Swal.fire('Error', 'No se pudo exportar el informe a Excel.', 'error');
        }
    };

    const exportarPDF = () => {
        try {
            const fmt = (n: number) =>
                n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

            const logo1 = '/icons/icon-192.png';
            const logo2 = '/icons/irossini.jpg';

            const pageW = doc.internal.pageSize.getWidth();
            const topY = 20;
            const w = 40;
            const h = 40;
            const gap = 10;
            const rightMargin = 40;

            const xLogo1 = pageW - rightMargin - w;
            const xLogo2 = xLogo1 - gap - w;

            doc.addImage(logo2, 'JPEG', xLogo2, topY, w, h);
            doc.addImage(logo1, 'PNG', xLogo1, topY, w, h);

            doc.setFontSize(14);
            doc.text('Informe por Empresa', 40, 40);

            doc.setFontSize(10);
            const descFiltros = [
                `Empresa: ${empresaActiva === 'TODAS' ? 'Todas' : empresaActiva}`,
                `Año: ${añoFiltro === 'TODOS' ? 'Todos' : añoFiltro}`,
                `Mes: ${mesFiltro === 0 ? 'Todos' : MESES_OPCIONES.find(m => m.numero === mesFiltro)?.nombre}`,
            ].join('   |   ');
            doc.text(descFiltros, 40, 58);

            let startY = 80;

            if (bloques.length === 0) {
                doc.setFontSize(11);
                doc.text('No hay datos para los filtros seleccionados.', 40, startY);
            }

            bloques.forEach((bloque, idx) => {
                doc.setFontSize(11);
                doc.text(`Empresa: ${bloque.empresa}`, 40, startY);

                const rows = bloque.filas.map(f => [
                    periodoLabel(f),
                    fmt(f.litros),
                    fmt(f.monto),
                ]);

                autoTable(doc, {
                    head: [['Período', 'Litros', `Monto (${bloque.moneda})`]],
                    body: rows,
                    startY: startY + 10,
                    margin: { bottom: 60 },
                    styles: { fontSize: 8, cellPadding: 4, textColor: [0, 0, 0] },
                    headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255] },
                    columnStyles: {
                        1: { halign: 'right' },
                        2: { halign: 'right' },
                    },
                    foot: [[
                        'Totales',
                        fmt(bloque.totalLitros),
                        fmt(bloque.totalMonto),
                    ]],
                    showFoot: 'lastPage',
                    footStyles: {
                        fillColor: [31, 41, 55],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                    },
                    didParseCell: (data) => {
                        if (data.section === 'foot' && [1, 2].includes(Number(data.column.dataKey))) {
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

                startY = (doc as any).lastAutoTable.finalY + 30;

                if (idx < bloques.length - 1 && startY > doc.internal.pageSize.getHeight() - 100) {
                    doc.addPage();
                    startY = 40;
                }
            });

            doc.save(buildNombreArchivo('pdf'));
        } catch {
            Swal.fire('Error', 'No se pudo exportar el informe a PDF.', 'error');
        }
    };

    if (loading) return <Loader />;

    return (
        <main className="min-h-screen px-6 py-10 bg-gray-50 text-gray-900">
            <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

                <h1 className="text-3xl font-bold text-center mb-6 text-[#111827]">
                    Informes por Empresa
                </h1>

                {/* -------- filtros -------- */}
                <section className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <h2 className="font-semibold text-gray-800">Filtros</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <select
                            value={añoFiltro}
                            onChange={(e) => {
                                const val = e.target.value;
                                setAñoFiltro(val === 'TODOS' ? 'TODOS' : parseInt(val));
                            }}
                            className="rounded-xl px-3 py-2 bg-white border border-gray-200 focus:ring-[#801818] focus:outline-none cursor-pointer"
                        >
                            <option value="TODOS">Todos los años</option>
                            {añosDisponibles.map((año) => (
                                <option key={año} value={año}>{año}</option>
                            ))}
                        </select>

                        <select
                            value={mesFiltro}
                            onChange={(e) => setMesFiltro(Number(e.target.value))}
                            className="rounded-xl px-3 py-2 bg-white border border-gray-200 focus:ring-[#801818] focus:outline-none cursor-pointer"
                        >
                            <option value="0">Todos los meses</option>
                            {MESES_OPCIONES.map((m) => (
                                <option key={m.numero} value={m.numero}>{m.nombre}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                        <button
                            onClick={exportarExcel}
                            className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-white font-semibold shadow-sm transition"
                        >
                            Descargar Excel
                        </button>

                        <button
                            onClick={exportarPDF}
                            className="flex items-center gap-2 rounded-xl bg-[#801818] hover:bg-red-700 px-4 py-2 text-white font-semibold shadow-sm transition"
                        >
                            Descargar PDF
                        </button>
                    </div>
                </section>

                {bloques.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-500 shadow-sm">
                        No hay datos para los filtros seleccionados.
                    </div>
                )}

                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setEmpresaActiva('TODAS')}
                        className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-sm transition ${
                            empresaActiva === 'TODAS'
                                ? 'bg-gray-900 text-white'
                                : 'bg-white border border-blue-200 text-gray-900 hover:bg-gray-50'
                        }`}
                    >
                        Todas las empresas
                    </button>

                    {empresasUnicas.map((empresa) => (
                        <button
                            key={empresa}
                            onClick={() => setEmpresaActiva(empresa)}
                            className={`px-4 py-2 rounded-xl font-semibold text-sm shadow-sm transition ${
                                empresaActiva === empresa
                                    ? 'bg-[#801818] text-white'
                                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            {empresa}
                        </button>
                    ))}
                </div>

                {bloques.map((bloque) => (
                    <section key={`${bloque.empresa}-${bloque.moneda}`} className="space-y-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            {bloque.empresa}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold mb-4 text-gray-700">Litros por mes</h3>
                                <Bar
                                    data={{
                                        labels: bloque.filas.map(periodoLabel),
                                        datasets: [{
                                            label: 'Litros',
                                            data: bloque.filas.map(f => f.litros),
                                            backgroundColor: 'rgba(128,24,24,0.7)',
                                        }],
                                    }}
                                    options={{ plugins: { legend: { display: false } } }}
                                />
                            </div>

                            <div className="bg-white border border-gray-200 p-6 rounded-2xl shadow-sm">
                                <h3 className="text-sm font-semibold mb-4 text-gray-700">
                                    Monto generado por mes ({bloque.moneda})
                                </h3>
                                <Line
                                    data={{
                                        labels: bloque.filas.map(periodoLabel),
                                        datasets: [{
                                            label: 'Monto',
                                            data: bloque.filas.map(f => f.monto),
                                            borderColor: '#111827',
                                            backgroundColor: 'rgba(17,24,39,0.2)',
                                            fill: true,
                                        }],
                                    }}
                                    options={{ plugins: { legend: { display: false } } }}
                                />
                            </div>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 shadow-sm rounded-2xl p-5 overflow-x-auto">
                            <table className="min-w-[500px] w-full text-sm border-separate border-spacing-y-2">
                                <thead className="text-left text-gray-800">
                                    <tr className="bg-gray-900 text-white">
                                        <th className="p-3 text-left rounded-tl-lg">Período</th>
                                        <th className="p-3 text-right">Litros</th>
                                        <th className="p-3 text-right rounded-tr-lg">Monto ({bloque.moneda})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bloque.filas.map((f) => (
                                        <tr key={`${f.anio}-${f.mes}`} className="bg-gray-100 hover:bg-gray-200 transition shadow-sm">
                                            <td className="p-3 rounded-l-lg font-medium">{periodoLabel(f)}</td>
                                            <td className="p-3 text-right font-semibold">{fmtMoneyAR(f.litros)}</td>
                                            <td className="p-3 text-right rounded-r-lg font-bold text-green-700">
                                                {fmtMoneyAR(f.monto)} {bloque.moneda}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-900 text-white font-bold">
                                        <td className="p-3 rounded-l-lg">Totales</td>
                                        <td className="p-3 text-right">{fmtMoneyAR(bloque.totalLitros)}</td>
                                        <td className="p-3 text-right rounded-r-lg">
                                            {fmtMoneyAR(bloque.totalMonto)} {bloque.moneda}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </section>
                ))}
            </div>
        </main>
    );
}
