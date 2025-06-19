'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    empresa: string;
    moneda: string;
};

type PrecioProducto = {
    producto: string;
    precio: number;
    moneda: string;
};

export default function PlayeroPage() {
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [precios, setPrecios] = useState<PrecioProducto[]>([]);
    const [scanError, setScanError] = useState('');
    const [form, setForm] = useState({ producto: '', litros: '' });
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserQRCodeReader | null>(null);
    const moneda = precios.find((p) => p.producto === form.producto)?.moneda || '';

    // Traer precios
    useEffect(() => {
        fetch('/api/precios')
            .then((res) => res.json())
            .then(setPrecios);
    }, []);

    // Verificar si hay token por URL
    useEffect(() => {
        const token = new URLSearchParams(window.location.search).get('token');
        if (token) {
            fetch(`/api/empleados/token/${token}`)
                .then((res) => res.json())
                .then(setEmpleado)
                .catch(() => setScanError('Empleado no encontrado con token en la URL'));
        }
    }, []);

    // Activar cámara automáticamente si no hay empleado
    useEffect(() => {
        if (empleado) return;

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
                                if (!res.ok) throw new Error();
                                const data = await res.json();
                                setEmpleado(data);
                                (codeReader.current as any)?.stopContinuousDecode?.();
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
            (codeReader.current as any)?.stopContinuousDecode?.();
        };
    }, [empleado]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const precioUnitario = precios.find((p) => p.producto === form.producto)?.precio || 0;
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
                litros,
                precioFinal,
                fecha: new Date().toISOString(),
            }),
        });

        if (res.ok) {
            alert('Carga registrada con éxito');
            setForm({ producto: '', litros: '' });
            setEmpleado(null); // reset para escanear otro
            (codeReader.current as any)?.stopContinuousDecode?.();
            setTimeout(() => {
                codeReader.current?.decodeFromVideoDevice(undefined, videoRef.current!, () => { });
            }, 500);
        } else {
            alert('Error al registrar carga');
        }
    };

    return (
        <main className="min-h-screen px-4 py-6 bg-gray-700 text-white">
            <h1 className="text-2xl font-bold mb-4">Escanear QR</h1>

            {!empleado && (
                <>
                    <video
                        ref={videoRef}
                        className="w-full h-64 rounded shadow border border-white/10 bg-black"
                        autoPlay
                        muted
                        playsInline
                    />
                    {scanError && <p className="text-red-400 mt-4">{scanError}</p>}
                </>
            )}

            {empleado && (
                <>
                    <div className="mb-6 bg-white/10 p-6 rounded-2xl shadow-lg border border-white/20">
                        <p className="text-2xl font-semibold mb-2">{empleado.nombre} {empleado.apellido}</p>
                        <p className="text-xl mb-1"><span className="text-gray-300">DNI:</span> {empleado.dni}</p>
                        <p className="text-xl"><span className="text-gray-300">Empresa:</span> {empleado.empresa}</p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-6 bg-white/10 p-6 rounded-lg border border-white/20 max-w-md mx-auto shadow-lg"
                    >
                        <select
                            name="producto"
                            value={form.producto}
                            onChange={handleChange}
                            required
                            className="w-full text-xl min-h-[60px] p-5 rounded-xl bg-gray-700 text-white border border-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                            <option value="">Seleccionar producto</option>
                            {precios.map((p) => (
                                <option key={p.producto} value={p.producto}>
                                    {p.producto} - {p.precio.toLocaleString()} {p.moneda}
                                </option>
                            ))}
                        </select>

                        <input
                            type="number"
                            name="litros"
                            placeholder="Litros"
                            value={form.litros}
                            onChange={handleChange}
                            className="w-full text-3xl text-center font-semibold p-4 rounded-lg bg-gray-700 text-white border border-gray-500 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                        />

                        <div className="text-center text-white text-2xl font-bold">
                            Total: {precioFinal.toLocaleString()} {moneda}
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-red-800 hover:bg-red-700 text-white text-xl py-4 rounded-lg font-bold transition"
                        >
                            Cargar
                        </button>
                    </form>
                </>
            )}
        </main>
    );
}
