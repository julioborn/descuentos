'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import LogoutButton from '@/components/LogoutButton';

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    empresa: string;
};

export default function PlayeroPage() {
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [scanError, setScanError] = useState('');
    const [form, setForm] = useState({ producto: '', litros: '', precioFinal: '' });
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserQRCodeReader | null>(null);

    useEffect(() => {
        const startScanner = async () => {
            try {
                codeReader.current = new BrowserQRCodeReader();

                const preview = videoRef.current;
                if (!preview) return;

                const controls = await codeReader.current.decodeFromVideoDevice(
                    undefined, // deja que seleccione la trasera automáticamente
                    preview,
                    async (result, err) => {
                        if (result) {
                            const token = new URL(result.getText()).searchParams.get('token');
                            if (token) {
                                try {
                                    const res = await fetch(`/api/empleados/token/${token}`);
                                    if (!res.ok) throw new Error('Empleado no encontrado');
                                    const data = await res.json();
                                    setEmpleado(data);
                                    (codeReader.current as any).reset();
                                    // Detener el escáner
                                } catch {
                                    setScanError('QR inválido o empleado no encontrado.');
                                }
                            }
                        }
                    }
                );
            } catch (error) {
                setScanError('Error al iniciar la cámara');
            }
        };

        startScanner();

        return () => {
            (codeReader.current as any).reset();
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empleado) return;

        const res = await fetch('/api/cargas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombreEmpleado: `${empleado.nombre} ${empleado.apellido}`,
                dniEmpleado: empleado.dni,
                producto: form.producto,
                litros: parseFloat(form.litros),
                precioFinal: parseFloat(form.precioFinal),
                fecha: new Date().toISOString(),
            }),
        });

        if (res.ok) {
            alert('Carga registrada con éxito');
            setForm({ producto: '', litros: '', precioFinal: '' });
            setEmpleado(null);
            (codeReader.current as any).reset();
            setTimeout(() => {
                codeReader.current?.decodeFromVideoDevice(undefined, videoRef.current!, () => { });
            }, 500);
        } else {
            alert('Error al registrar carga');
        }
    };

    return (
        <main className="min-h-screen px-4 py-6 bg-gray-900 text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Escanear QR del empleado</h1>
                <LogoutButton />
            </div>

            {!empleado && (
                <div className="mb-6">
                    <video ref={videoRef} className="w-full rounded shadow border border-white/10" />
                    {scanError && <p className="text-red-400 mt-4">{scanError}</p>}
                </div>
            )}

            {empleado && (
                <>
                    <div className="mb-6 bg-white/5 p-4 rounded shadow border border-white/10">
                        <p><strong>Empleado:</strong> {empleado.nombre} {empleado.apellido}</p>
                        <p><strong>DNI:</strong> {empleado.dni}</p>
                        <p><strong>Empresa:</strong> {empleado.empresa}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4 bg-white/5 p-4 rounded border border-white/10 max-w-md">
                        <input
                            type="text"
                            name="producto"
                            placeholder="Producto"
                            value={form.producto}
                            onChange={handleChange}
                            className="w-full p-2 rounded bg-white/10 text-white border border-white/20 placeholder-gray-400"
                            required
                        />
                        <input
                            type="number"
                            name="litros"
                            placeholder="Litros"
                            value={form.litros}
                            onChange={handleChange}
                            className="w-full p-2 rounded bg-white/10 text-white border border-white/20 placeholder-gray-400"
                            required
                        />
                        <input
                            type="number"
                            name="precioFinal"
                            placeholder="Precio final"
                            value={form.precioFinal}
                            onChange={handleChange}
                            className="w-full p-2 rounded bg-white/10 text-white border border-white/20 placeholder-gray-400"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition"
                        >
                            Registrar carga
                        </button>
                    </form>
                </>
            )}
        </main>
    );
}
