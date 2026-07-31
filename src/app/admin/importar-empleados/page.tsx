'use client';

import { useState } from 'react';
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
    localidad: string;
    qrUrl: string;
};

export default function ImportarEmpleados() {

    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(false);
    const [modo, setModo] = useState<'excel' | 'manual'>('excel');

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        empresa: '',
        localidad: '',
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

        const lista: Empleado[] = [];

        let nuevos = 0;
        let repetidos = 0;

        const empleadosExist = await fetch('/api/empleados').then(r => r.json());
        const map = new Map(empleadosExist.map((e: any) => [String(e.dni), e]));

        for (const fila of filas) {

            const dni = String(fila.dni || fila.DNI || '').trim();
            if (!dni) continue;

            if (map.has(dni)) {
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
                        dni,
                        telefono: String(fila.telefono ?? ''),
                        empresa: String(fila.empresa ?? ''),
                        localidad: String(fila.localidad ?? ''),
                        qrToken: token,
                        pais: 'AR'
                    }),
                });

                if (!res.ok) throw new Error();

                nuevos++;

                const qrUrl = await QRCode.toDataURL(
                    `${window.location.origin}/playero?token=${token}`,
                );

                lista.push({
                    nombre: String(fila.nombre).toUpperCase(),
                    apellido: String(fila.apellido).toUpperCase(),
                    dni,
                    telefono: String(fila.telefono ?? ''),
                    empresa: String(fila.empresa ?? ''),
                    localidad: String(fila.localidad ?? ''),
                    qrUrl
                });

            } catch (err) {
                console.error('Error:', err);
            }
        }

        setEmpleados(lista);
        setLoading(false);

        alert(`🆕 ${nuevos} | ⚠️ ${repetidos}`);
    };

    /* ─────────────── MANUAL ─────────────── */

    const crearEmpleado = async () => {

        const dni = onlyDigits(form.dni);

        if (!dni || !form.nombre || !form.apellido) {
            alert('Completar datos');
            return;
        }

        setLoading(true);

        try {

            const existentes = await fetch('/api/empleados').then(r => r.json());
            if (existentes.find((e: any) => String(e.dni) === dni)) {
                alert('DNI ya existe');
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
                    dni,
                    telefono: form.telefono,
                    empresa: form.empresa,
                    localidad: form.localidad,
                    qrToken: token,
                    pais: 'AR'
                }),
            });

            if (!res.ok) throw new Error();

            const qrUrl = await QRCode.toDataURL(
                `${window.location.origin}/playero?token=${token}`
            );

            setEmpleados(prev => [
                ...prev,
                {
                    ...form,
                    nombre: form.nombre.toUpperCase(),
                    apellido: form.apellido.toUpperCase(),
                    dni,
                    qrUrl
                }
            ]);

            setForm({
                nombre: '',
                apellido: '',
                dni: '',
                telefono: '',
                empresa: '',
                localidad: '',
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
            nombreArchivo: `qr-${empleados[idx].dni}.png`
        };
    };

    const descargarTodas = async () => {

        const zip = new JSZip();

        for (let i = 0; i < empleados.length; i++) {
            const { blob, nombreArchivo } = await generarTarjeta(i);
            if (blob) zip.file(nombreArchivo, blob);
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'tarjetas-empleados.zip');
    };

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                        Herramientas
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                        Importar Empleados
                    </h1>
                </div>

                <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
                    {/* SWITCH */}
                    <div className="flex gap-2">
                        <button onClick={() => setModo('excel')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${modo === 'excel' ? 'bg-[#801818] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                            Excel
                        </button>
                        <button onClick={() => setModo('manual')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${modo === 'manual' ? 'bg-[#801818] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                            Manual
                        </button>
                    </div>

                    {/* MANUAL */}
                    {modo === 'manual' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Nombre</label>
                                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Apellido</label>
                                <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">DNI</label>
                                <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" inputMode="numeric" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Teléfono</label>
                                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" inputMode="numeric" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Empresa</label>
                                <input name="empresa" value={form.empresa} onChange={handleChange} placeholder="Empresa" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Localidad</label>
                                <input name="localidad" value={form.localidad} onChange={handleChange} placeholder="Localidad" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>

                            <button onClick={crearEmpleado} className="sm:col-span-2 bg-[#801818] hover:bg-red-700 text-white py-2 rounded-xl text-sm font-semibold transition shadow-sm">
                                Agregar
                            </button>
                        </div>
                    )}

                    {/* EXCEL */}
                    {modo === 'excel' && (
                        <div>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Archivo Excel
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFile}
                                className="block w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#801818]/10 file:text-[#801818] hover:file:bg-[#801818]/20 cursor-pointer"
                            />
                        </div>
                    )}
                </section>

                {loading && (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                        <span className="h-2 w-2 rounded-full bg-[#801818] animate-pulse" />
                        Procesando...
                    </div>
                )}

                {empleados.length > 0 && (
                    <button
                        onClick={descargarTodas}
                        className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-white text-sm font-semibold shadow-sm transition"
                    >
                        Descargar ZIP
                    </button>
                )}

                <div className="flex flex-wrap gap-6">
                    {empleados.map((emp, idx) => (
                        <div key={idx} id={`tarjeta-${idx}`}
                            className="bg-white text-stone-900 border border-stone-200 p-4 rounded-2xl shadow-sm w-[280px]">

                            <div className="flex justify-center">
                                <img src="/idescuentos.png" className="h-16" />
                            </div>

                            <img src={emp.qrUrl} className="w-48 h-48 mx-auto" />

                            <p className="text-center font-semibold">
                                {emp.nombre} {emp.apellido}
                            </p>

                            <button
                                onClick={() => generarTarjeta(idx).then(r => r.blob && saveAs(r.blob, r.nombreArchivo))}
                                className="mt-2 w-full bg-[#801818] hover:bg-red-700 text-white py-2 rounded-xl text-sm font-semibold transition shadow-sm"
                            >
                                Descargar
                            </button>
                        </div>
                    ))}
                </div>

            </div>
        </main>
    );
}