'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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

export default function CargaPage() {
    const router = useRouter();
    const params = useSearchParams();
    const token = params.get('token');
    const [empleado, setEmpleado] = useState<Empleado | null>(null);
    const [precios, setPrecios] = useState<PrecioProducto[]>([]);
    const [form, setForm] = useState({ producto: '', litros: '' });

    useEffect(() => {
        fetch('/api/precios').then(res => res.json()).then(setPrecios);
        if (token) {
            fetch(`/api/empleados/token/${token}`)
                .then(res => res.json())
                .then(setEmpleado)
                .catch(() => alert('Empleado no encontrado'));
        }
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const precioUnitario = precios.find(p => p.producto === form.producto)?.precio || 0;
    const moneda = precios.find(p => p.producto === form.producto)?.moneda || '';
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
            alert('Carga registrada');
            router.push('/playero'); // 👈 redirección
        } else {
            alert('Error al registrar');
        }
    };

    if (!empleado) return <p className="text-white p-6">Cargando empleado...</p>;

    return (
        <main className="min-h-screen px-4 py-6 bg-gray-700 text-white">

            <div className="mb-6 bg-white/10 p-6 rounded-lg flex flex-col justify-center items-center">
                <p className="text-2xl font-bold">{empleado.nombre} {empleado.apellido}</p>
                <p className="text-2xl">DNI: {empleado.dni}</p>
                <p className="text-2xl">Empresa: {empleado.empresa}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white/10 p-6 rounded-lg max-w-md mx-auto">
                <div className="relative">
                    <select
                        name="producto"
                        value={form.producto}
                        onChange={handleChange}
                        className="appearance-none w-full p-5 text-lg sm:text-xl rounded bg-gray-800 text-white pr-12"
                    >
                        <option value="">Seleccionar producto</option>
                        {precios.map(p => (
                            <option key={p.producto} value={p.producto}>
                                {p.producto} - {p.precio.toLocaleString()} {p.moneda}
                            </option>
                        ))}
                    </select>

                    {/* Icono de flechita */}
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    name="litros"
                    value={form.litros}
                    onChange={handleChange}
                    className="w-full p-5 text-2xl text-center bg-gray-800 text-white rounded"
                    placeholder="Litros"
                />

                <div className="text-center font-bold text-xl">
                    Total: {precioFinal.toLocaleString()} {moneda}
                </div>

                <button className="w-full bg-red-600 py-3 rounded text-white text-xl font-semibold">
                    Cargar
                </button>
            </form>
        </main>
    );
}
