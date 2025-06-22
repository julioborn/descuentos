'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader from '@/components/Loader';
import Swal from 'sweetalert2';

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
        fetch('/api/precios')
            .then(res => res.json())
            .then(setPrecios)
            .catch(() => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar los precios.',
                });
            });

        if (token) {
            fetch(`/api/empleados/token/${token}`)
                .then(res => {
                    if (!res.ok) throw new Error();
                    return res.json();
                })
                .then(setEmpleado)
                .catch(() => {
                    Swal.fire({
                        icon: 'error',
                        title: 'Empleado no encontrado',
                        text: 'Verificá el enlace o el token QR.',
                    });
                });
        }
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const precioUnitario = precios.find(p => p.producto === form.producto)?.precio || 0;
    const moneda = precios.find(p => p.producto === form.producto)?.moneda || '';
    const litros = parseFloat(form.litros.replace(',', '.')) || 0;
    const precioFinal = precioUnitario * litros;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empleado) return;

        // Validación: producto seleccionado
        if (!form.producto) {
            return Swal.fire({
                icon: 'warning',
                title: 'Producto requerido',
                text: 'Por favor seleccioná un producto.',
            });
        }

        // Validación: litros > 0
        const litros = parseFloat(form.litros.replace(',', '.'));
        if (isNaN(litros) || litros <= 0) {
            return Swal.fire({
                icon: 'warning',
                title: 'Litros inválidos',
                text: 'Ingresá una cantidad válida de litros.',
            });
        }

        const precioUnitario = precios.find(p => p.producto === form.producto)?.precio || 0;
        const precioFinal = precioUnitario * litros;

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
            Swal.fire({
                icon: 'success',
                title: 'Carga registrada',
                showConfirmButton: false,
                timer: 1500,
                toast: true,
                position: 'top-end',
            });
            router.push('/playero');
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo registrar la carga.',
            });
        }
    };

    if (!empleado) return <Loader />;

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
                        <option value="">Producto</option>
                        {precios.map(p => (
                            <option key={p.producto} value={p.producto}>
                                {p.producto} 
                                {/* - {p.precio.toLocaleString()} {p.moneda} */}
                            </option>
                        ))}
                    </select>

                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>

                <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
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
