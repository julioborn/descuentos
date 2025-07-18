'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type Empleado = {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    localidad: string; // ✅ nuevo
    qrUrl: string;
};

export default function ImportarEmpleados() {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(false);
    const contenedorRef = useRef<HTMLDivElement>(null);              // ⬅️ para zip-all

    /* ───────────────────── 1. Leer planilla y generar empleados + QR ───────────────────── */
    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const hoja = wb.Sheets[wb.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json(hoja) as Omit<Empleado, 'qrUrl'>[];

        const lista: Empleado[] = [];

        for (const emp of filas) {
            const token = crypto.randomUUID();

            try {
                const res = await fetch('/api/empleados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...emp,
                        localidad: emp.localidad, // ✅ aseguramos que se envía
                        qrToken: token
                    }),
                });
                if (!res.ok) throw new Error();

                const qrUrl = await QRCode.toDataURL(
                    `${window.location.origin}/playero?token=${token}`,
                );

                lista.push({ ...emp, qrUrl });
            } catch (err) {
                console.error('Falló el registro de', emp, err);
            }
        }

        setEmpleados(lista);
        setLoading(false);
    };

    /* ───────────────────────────── 2. Descargar tarjeta individual ─────────────────────── */
    const descargarTarjeta = async (idx: number) => {
        await generarYDescargar(idx);
    };

    /* ───────────────────────────── 3. Descargar TODAS en un ZIP ────────────────────────── */
    const descargarTodas = async () => {
        if (!empleados.length) return;

        setLoading(true);
        const zip = new JSZip();

        await Promise.all(
            empleados.map(async (_, idx) => {
                const { blob, nombreArchivo } = await generarTarjeta(idx);
                if (blob) zip.file(nombreArchivo, blob); // ✅ Solo si no es null
            }),
        );

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'tarjetas-empleados.zip');
        setLoading(false);
    };

    /* ─────────────────────────── helpers común (png o zip) ─────────────────────────────── */
    const generarTarjeta = async (idx: number) => {
        const emp = empleados[idx];
        const nodo = document.getElementById(`tarjeta-${idx}`);
        if (!nodo) return { blob: null, nombreArchivo: '' };

        const boton = nodo.querySelector('button');
        if (boton) boton.style.display = 'none';

        const canvas = await html2canvas(nodo as HTMLElement, { scale: 2 });
        if (boton) boton.style.display = '';

        const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, 'image/png', 1)
        );

        if (!blob) {
            console.error('Error generando blob para:', emp);
            return { blob: null, nombreArchivo: '' };
        }

        const nombreArchivo = `qr-${emp.nombre}-${emp.apellido}.png`;
        return { blob, nombreArchivo };
    };

    const generarYDescargar = async (idx: number) => {
        const { blob, nombreArchivo } = await generarTarjeta(idx);
        if (blob) saveAs(blob, nombreArchivo); // ✅ Solo si no es null
    };

    /* ───────────────────────────────────── render ──────────────────────────────────────── */
    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">
                Carga Masiva de Empleados
            </h1>

            <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="mb-6 block mx-auto"
            />

            {loading && (
                <p className="text-center text-lg font-semibold">
                    Procesando, por favor esperá…
                </p>
            )}

            {/* BOTÓN ZIP */}
            {empleados.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-8 block bg-red-800 hover:bg-red-800 px-6 py-3 rounded font-semibold"
                >
                    Descargar TODAS en ZIP
                </button>
            )}

            <div
                ref={contenedorRef}
                className="flex flex-wrap gap-6 justify-center"
            >
                {empleados.map((emp, idx) => (
                    <div
                        key={idx}
                        id={`tarjeta-${idx}`}
                        className="bg-white text-black p-4 rounded shadow-lg w-[280px] space-y-3 relative"
                    >
                        <div className="flex justify-center">
                            <img src="/idescuentos.png" alt="Logo" className="h-16" />
                        </div>

                        <div className="flex justify-center">
                            <img src={emp.qrUrl} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <div className="text-center text-sm">
                            <strong>
                                {emp.nombre} {emp.apellido}
                            </strong>
                            <p>{emp.dni}</p>
                            <p>{emp.empresa}</p>
                        </div>

                        <button
                            onClick={() => descargarTarjeta(idx)}
                            className="mt-2 w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded"
                        >
                            Descargar Tarjeta
                        </button>
                    </div>
                ))}
            </div>
        </main>
    );
}
