'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

type EmpleadoPY = {
    nombre: string;
    apellido: string;
    cedula: string;      // 👈 viene así en la planilla
    telefono: string;
    localidad: string;
    qrUrl: string;
};

export default function ImportarCotrecoPY() {
    const [empleados, setEmpleados] = useState<EmpleadoPY[]>([]);
    const [loading, setLoading] = useState(false);

    const limpiarCedula = (valor: string | number) =>
        String(valor).replace(/\D/g, '');

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const hoja = wb.Sheets[wb.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json(hoja) as Omit<EmpleadoPY, 'qrUrl'>[];

        const lista: EmpleadoPY[] = [];
        let nuevos = 0;
        let repetidos = 0;

        for (const emp of filas) {
            const token = crypto.randomUUID();
            const cedulaLimpia = limpiarCedula(emp.cedula);

            // 🔎 Validación mínima Paraguay
            if (!cedulaLimpia || cedulaLimpia.length < 6) {
                console.log('Cédula inválida:', emp.cedula);
                continue; // salta este registro
            }

            try {
                const res = await fetch('/api/empleados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: emp.nombre,
                        apellido: emp.apellido,
                        dni: cedulaLimpia,       // 👈 guardamos en campo dni
                        telefono: emp.telefono,
                        empresa: 'COTRECO',
                        localidad: emp.localidad,
                        qrToken: token,
                    }),
                });

                if (res.status === 409) {
                    repetidos++;
                    continue;
                }

                if (!res.ok) throw new Error();

                nuevos++;

                const qrUrl = await QRCode.toDataURL(
                    `${window.location.origin}/playero?token=${token}`
                );

                lista.push({
                    ...emp,
                    cedula: cedulaLimpia, // 👈 ahora la tarjeta usa la versión limpia
                    qrUrl
                });

            } catch (err) {
                console.error('Error cargando:', emp, err);
            }
        }

        setEmpleados(lista);
        setLoading(false);

        alert(`🇵🇾 COTRECO | Nuevos: ${nuevos} | Repetidos: ${repetidos}`);
    };

    const descargarTodas = async () => {
        const zip = new JSZip()

        for (let i = 0; i < empleados.length; i++) {
            const nodo = document.getElementById(`tarjeta-${i}`)
            if (!nodo) continue

            const canvas = await html2canvas(nodo, {
                scale: 2,
                ignoreElements: (element) =>
                    element.classList?.contains('no-print')
            })

            const blob = await new Promise<Blob | null>((resolve) =>
                canvas.toBlob(resolve, "image/png", 1)
            )

            if (blob) {
                zip.file(`qr-${empleados[i].cedula}.png`, blob)
            }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" })
        saveAs(zipBlob, "COTRECO_QR_PARAGUAY.zip")
    }

    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">
                Importador COTRECO - Paraguay
            </h1>

            <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="mb-6 block mx-auto"
            />

            {loading && (
                <p className="text-center text-lg font-semibold">
                    Procesando empleados PY...
                </p>
            )}

            {empleados.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-8 block bg-red-700 hover:bg-red-800 px-6 py-3 rounded font-semibold"
                >
                    Descargar TODAS en ZIP
                </button>
            )}

            <div className="flex flex-wrap gap-6 justify-center">
                {empleados.map((emp, idx) => (
                    <div
                        key={idx}
                        id={`tarjeta-${idx}`}
                        className="bg-white text-black p-4 rounded shadow-lg w-[280px] space-y-3"
                    >
                        {/* <div className="flex justify-center">
                            <img src="/idescuentos.png" className="h-12" />
                        </div> */}

                        <div className="text-center font-bold text-gray-700">
                            COTRECO
                        </div>

                        <div className="flex justify-center">
                            <img src={emp.qrUrl} className="w-40 h-40" />
                        </div>

                        <div className="text-center font-bold">
                            {emp.nombre} {emp.apellido}
                        </div>

                        <button
                            onClick={async () => {
                                const nodo = document.getElementById(`tarjeta-${idx}`)
                                if (!nodo) return

                                const canvas = await html2canvas(nodo, {
                                    scale: 2,
                                    ignoreElements: (element) =>
                                        element.classList?.contains('no-print')
                                })

                                canvas.toBlob(
                                    (b) => b && saveAs(b, `qr-${emp.cedula}.png`),
                                    "image/png",
                                    1
                                )
                            }}
                            className="no-print w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded"
                        >
                            Descargar
                        </button>
                    </div>
                ))}
            </div>
        </main>
    );
}