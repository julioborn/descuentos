'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const LOCALIDAD_PY = 'Paraguay';

type EmpleadoPY = {
    nombre: string;
    apellido: string;
    ci: string;
    telefono: string;
    empresa: string;
    qrUrl: string;
};

export default function ImportarParaguay() {

    const [empleados, setEmpleados] = useState<EmpleadoPY[]>([]);
    const [loading, setLoading] = useState(false);
    const [modo, setModo] = useState<'excel' | 'manual'>('excel');

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        ci: '',
        telefono: '',
        empresa: '',
    });

    const onlyDigits = (v: string) => v.replace(/\D/g, '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    /* ─────────────── EXCEL ─────────────── */

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {

        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);

        const data = await file.arrayBuffer();
        const wb = XLSX.read(data);
        const hoja = wb.Sheets[wb.SheetNames[0]];
        const filas = XLSX.utils.sheet_to_json<any>(hoja, { defval: '' });

        const lista: EmpleadoPY[] = [];

        let nuevos = 0;
        let repetidos = 0;

        const empleadosExist = await fetch('/api/empleados').then(r => r.json());
        const map = new Map(empleadosExist.map((e: any) => [String(e.dni), e]));

        for (const fila of filas) {

            const ci = onlyDigits(String(fila.ci ?? fila.CI ?? fila.cedula ?? ''));
            if (!ci) continue;

            if (map.has(ci)) {
                repetidos++;
                continue;
            }

            const token = crypto.randomUUID();

            try {

                const res = await fetch('/api/empleados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: String(fila.nombre).toUpperCase(),
                        apellido: String(fila.apellido).toUpperCase(),
                        dni: ci,
                        telefono: String(fila.telefono ?? ''),
                        empresa: String(fila.empresa ?? '').toUpperCase(),
                        localidad: LOCALIDAD_PY,
                        qrToken: token,
                        pais: 'PY',
                    }),
                });

                if (res.status === 409) {
                    repetidos++;
                    continue;
                }

                if (!res.ok) throw new Error();

                nuevos++;

                const qrUrl = await QRCode.toDataURL(
                    `${window.location.origin}/playero?token=${token}`,
                );

                lista.push({
                    nombre: String(fila.nombre).toUpperCase(),
                    apellido: String(fila.apellido).toUpperCase(),
                    ci,
                    telefono: String(fila.telefono ?? ''),
                    empresa: String(fila.empresa ?? '').toUpperCase(),
                    qrUrl,
                });

            } catch (err) {
                console.error('Error:', err);
            }
        }

        setEmpleados(lista);
        setLoading(false);

        alert(`🇵🇾 Nuevos: ${nuevos} | Repetidos: ${repetidos}`);
    };

    /* ─────────────── MANUAL ─────────────── */

    const crearEmpleado = async () => {

        const ci = onlyDigits(form.ci);

        if (!ci || !form.nombre || !form.apellido || !form.empresa) {
            alert('Completar nombre, apellido, CI y empresa');
            return;
        }

        setLoading(true);

        try {

            const existentes = await fetch('/api/empleados').then(r => r.json());
            if (existentes.find((e: any) => String(e.dni) === ci)) {
                alert('CI ya existe');
                setLoading(false);
                return;
            }

            const token = crypto.randomUUID();

            const res = await fetch('/api/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: form.nombre.toUpperCase(),
                    apellido: form.apellido.toUpperCase(),
                    dni: ci,
                    telefono: form.telefono,
                    empresa: form.empresa.toUpperCase(),
                    localidad: LOCALIDAD_PY,
                    qrToken: token,
                    pais: 'PY',
                }),
            });

            if (!res.ok) throw new Error();

            const qrUrl = await QRCode.toDataURL(
                `${window.location.origin}/playero?token=${token}`
            );

            setEmpleados(prev => [
                ...prev,
                {
                    nombre: form.nombre.toUpperCase(),
                    apellido: form.apellido.toUpperCase(),
                    ci,
                    telefono: form.telefono,
                    empresa: form.empresa.toUpperCase(),
                    qrUrl,
                }
            ]);

            setForm({
                nombre: '',
                apellido: '',
                ci: '',
                telefono: '',
                empresa: '',
            });

        } catch (err) {
            console.error(err);
            alert('Error creando empleado');
        }

        setLoading(false);
    };

    /* ─────────────── DESCARGAS ─────────────── */

    const generarTarjeta = async (idx: number) => {

        const nodo = document.getElementById(`tarjeta-${idx}`);
        if (!nodo) return { blob: null, nombreArchivo: '' };

        const boton = nodo.querySelector('button') as HTMLElement | null;
        if (boton) boton.style.display = 'none';

        const canvas = await html2canvas(nodo, { scale: 2 });

        if (boton) boton.style.display = '';

        const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, 'image/png', 1)
        );

        return {
            blob,
            nombreArchivo: `qr-${empleados[idx].ci}.png`
        };
    };

    const descargarTodas = async () => {

        const zip = new JSZip();

        for (let i = 0; i < empleados.length; i++) {
            const { blob, nombreArchivo } = await generarTarjeta(i);
            if (blob) zip.file(nombreArchivo, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'tarjetas-empleados-paraguay.zip');
    };

    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">

            <h1 className="text-3xl font-bold text-center mb-6">
                Importar Empleados - Paraguay
            </h1>

            {/* SWITCH */}
            <div className="flex justify-center gap-4 mb-6">
                <button onClick={() => setModo('excel')}
                    className={`px-4 py-2 rounded ${modo === 'excel' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    Excel
                </button>
                <button onClick={() => setModo('manual')}
                    className={`px-4 py-2 rounded ${modo === 'manual' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    Manual
                </button>
            </div>

            {/* MANUAL */}
            {modo === 'manual' && (
                <div className="max-w-xl mx-auto bg-gray-800 p-6 rounded space-y-3 mb-6">
                    <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="w-full p-2 text-black rounded" />
                    <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="w-full p-2 text-black rounded" />
                    <input name="ci" value={form.ci} onChange={handleChange} placeholder="CI (Cédula de Identidad)" inputMode="numeric" className="w-full p-2 text-black rounded" />
                    <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" inputMode="numeric" className="w-full p-2 text-black rounded" />
                    <input name="empresa" value={form.empresa} onChange={handleChange} placeholder="Empresa" className="w-full p-2 text-black rounded" />

                    <button onClick={crearEmpleado} className="w-full bg-blue-700 py-2 rounded">
                        Agregar
                    </button>
                </div>
            )}

            {/* EXCEL */}
            {modo === 'excel' && (
                <>
                    <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFile}
                        className="mb-2 block mx-auto"
                    />
                    <p className="text-center text-sm text-gray-400 mb-6">
                        Columnas esperadas: nombre, apellido, ci, telefono, empresa
                    </p>
                </>
            )}

            {loading && <p className="text-center">Procesando...</p>}

            {empleados.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-6 block bg-green-700 px-6 py-3 rounded"
                >
                    Descargar ZIP
                </button>
            )}

            <div className="flex flex-wrap gap-6 justify-center">
                {empleados.map((emp, idx) => (
                    <div key={idx} id={`tarjeta-${idx}`}
                        className="bg-white text-black p-4 rounded w-[280px]">

                        <div className="flex justify-center">
                            <img src="/idescuentos.png" className="h-16" />
                        </div>

                        <img src={emp.qrUrl} className="w-48 h-48 mx-auto" />

                        <p className="text-center font-semibold">
                            {emp.nombre} {emp.apellido}
                        </p>

                        <p className="text-center text-sm text-gray-600">
                            CI {emp.ci} · {emp.empresa}
                        </p>

                        <button
                            onClick={() => generarTarjeta(idx).then(r => r.blob && saveAs(r.blob, r.nombreArchivo))}
                            className="mt-2 w-full bg-blue-700 text-white py-2 rounded"
                        >
                            Descargar
                        </button>
                    </div>
                ))}
            </div>

        </main>
    );
}
