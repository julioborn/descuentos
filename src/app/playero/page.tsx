'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import LogoutButton from '@/components/LogoutButton';

// Import dinámico para evitar errores de SSR
const QrScanner = dynamic(() => import('react-qr-scanner'), { ssr: false });

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    empresa: string;
};

export default function PlayeroPage() {
    const [scanResult, setScanResult] = useState('');
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [form, setForm] = useState({ producto: '', litros: '', precioFinal: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Detectar empleado a partir del QR escaneado
    useEffect(() => {
        const fetchEmpleado = async () => {
            try {
                const token = new URL(scanResult).searchParams.get('token');
                if (!token) return;

                setLoading(true);
                const res = await fetch(`/api/empleados/token/${token}`);
                if (!res.ok) throw new Error('Empleado no encontrado');
                const data = await res.json();
                setEmpleado(data);
                setError('');
            } catch (err) {
                setError('QR inválido o empleado no encontrado.');
                setEmpleado(null);
            } finally {
                setLoading(false);
            }
        };

        if (scanResult) fetchEmpleado();
    }, [scanResult]);

    const handleScan = (data: any) => {
        if (data?.text && data.text !== scanResult) {
            setScanResult(data.text);
        }
    };

    const handleError = (err: any) => {
        console.error(err);
        setError('Error al acceder a la cámara');
    };

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
            setScanResult('');
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
                    <QrScanner
                        delay={300}
                        style={{ width: '100%' }}
                        onError={handleError}
                        onScan={handleScan}
                        constraints={{ facingMode: { exact: "environment" } }} // 👈 clave para usar la trasera
                    />
                    {error && <p className="text-red-400 mt-4">{error}</p>}
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
