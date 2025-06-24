'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';

type Empleado = {
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    qrUrl: string;
};

export default function CargaMasivaPage() {
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(false);

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const datos = XLSX.utils.sheet_to_json(hoja) as Omit<Empleado, 'qrUrl'>[];

        const empleadosConQR: Empleado[] = [];

        for (const emp of datos) {
            const token = crypto.randomUUID();

            // Intentamos registrar en la DB
            try {
                const res = await fetch('/api/empleados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...emp, qrToken: token }),
                });

                if (!res.ok) throw new Error('Error al registrar en DB');

                // Generamos QR si fue exitoso
                const qrUrl = await QRCode.toDataURL(`${window.location.origin}/playero?token=${token}`);
                empleadosConQR.push({ ...emp, qrUrl });
            } catch (err) {
                console.error('Error con empleado:', emp, err);
            }
        }

        setEmpleados(empleadosConQR);
        setLoading(false);
    };

    const descargarTarjeta = async (index: number) => {
        const ref = document.getElementById(`tarjeta-${index}`);
        if (ref) {
            const canvas = await html2canvas(ref, { scale: 2 });
            const image = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            const emp = empleados[index];
            link.href = image;
            link.download = `tarjeta-${emp.nombre}-${emp.apellido}.png`;
            link.click();
        }
    };

    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">Carga Masiva de Empleados</h1>

            <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="mb-6 block mx-auto"
            />

            {loading && <p className="text-center text-lg">Procesando empleados...</p>}

            <div className="flex flex-wrap gap-6 justify-center">
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
                            <strong>{emp.nombre} {emp.apellido}</strong>
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
