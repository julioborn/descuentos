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

type PrecioProducto = {
    producto: string;
    precio: number;
};

export default function PlayeroPage() {
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [precios, setPrecios] = useState<PrecioProducto[]>([]);
    const [scanError, setScanError] = useState('');
    const [form, setForm] = useState({ producto: '', litros: '' });
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserQRCodeReader | null>(null);

    useEffect(() => {
        const fetchPrecios = async () => {
            const res = await fetch('/api/precios');
            if (res.ok) {
                const data = await res.json();
                setPrecios(data);
            }
        };
        fetchPrecios();
    }, []);

    useEffect(() => {
        const startScanner = async () => {
            try {
                codeReader.current = new BrowserQRCodeReader();
                const preview = videoRef.current;
                if (!preview) return;

                await codeReader.current.decodeFromVideoDevice(undefined, preview, async (result) => {
                    if (result) {
                        const token = new URL(result.getText()).searchParams.get('token');
                        if (token) {
                            try {
                                const res = await fetch(`/api/empleados/token/${token}`);
                                if (!res.ok) throw new Error('Empleado no encontrado');
                                const data = await res.json();
                                setEmpleado(data);
                                (codeReader.current as any).reset();
                            } catch {
                                setScanError('QR inválido o empleado no encontrado.');
                            }
                        }
                    }
                });
            } catch {
                setScanError('Error al iniciar la cámara');
            }
        };

        startScanner();
        return () => {
            (codeReader.current as any).reset();
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const precioUnitario = precios.find(p => p.producto === form.producto)?.precio || 0;
    const litros = parseFloat(form.litros) || 0;
    const precioFinal = precioUnitario * litros;

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
                litros: litros,
                precioFinal,
                fecha: new Date().toISOString(),
            }),
        });

        if (res.ok) {
            alert('Carga registrada con éxito');
            setForm({ producto: '', litros: '' });
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
                        <select
                            name="producto"
                            value={form.producto}
                            onChange={handleChange}
                            required
                            className="w-full p-2 rounded bg-white/10 text-white border border-white/20"
                        >
                            <option value="">Seleccionar producto</option>
                            {precios.map(p => (
                                <option key={p.producto} value={p.producto}>
                                    {p.producto} - {p.precio.toLocaleString()} ₲
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            name="litros"
                            placeholder="Litros"
                            value={form.litros}
                            onChange={handleChange}
                            className="w-full p-2 rounded bg-white/10 text-white border border-white/20 placeholder-gray-400"
                            required
                        />

                        <div className="text-right text-green-400 font-semibold">
                            Total: {precioFinal.toLocaleString()} ₲
                        </div>

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
