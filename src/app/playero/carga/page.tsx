'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Loader from '@/components/Loader';
import Swal from 'sweetalert2';
import { useSession } from 'next-auth/react';

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
    const { data: session } = useSession();
    const username = session?.user?.name; // asumimos que 'name' es 'playeropy' o 'playeroarg'
    const [porcentajeDescuento, setPorcentajeDescuento] = useState(0);

    // 1. Primero: buscar al empleado con el token
    useEffect(() => {
        if (!token) return;

        fetch(`/api/empleados/token/${token}`)
            .then(res => {
                if (!res.ok) throw new Error("Token inválido");
                return res.json();
            })
            .then(data => setEmpleado(data))
            .catch(() => {
                Swal.fire({
                    icon: 'error',
                    title: 'Token inválido',
                    text: 'No se pudo encontrar al empleado.',
                }).then(() => router.push('/playero'));
            });
    }, [token, router]);

    // 2. Segundo: cargar los precios según el usuario logueado
    useEffect(() => {
        if (!session?.user?.moneda) return;

        fetch('/api/precios')
            .then(res => res.json())
            .then(data => {
                setPrecios(data.filter((p: PrecioProducto) => p.moneda === session.user.moneda));
            })
            .catch(() => {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudieron cargar los precios.',
                });
            });
    }, [session?.user?.moneda]);

    useEffect(() => {
        if (!empleado) return;

        fetch('/api/descuentos')
            .then(res => res.json())
            .then(data => {
                const descuento = data.find((d: { empresa: string }) => d.empresa === empleado.empresa);
                setPorcentajeDescuento(descuento?.porcentaje || 0);
            })
            .catch(() => {
                Swal.fire({
                    icon: 'warning',
                    title: 'Atención',
                    text: 'No se pudo obtener el descuento de la empresa.',
                });
            });
    }, [empleado]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const precioUnitario = precios.find(p => p.producto === form.producto)?.precio || 0;
    const moneda = precios.find(p => p.producto === form.producto)?.moneda || '';
    const litros = parseFloat(form.litros.replace(',', '.')) || 0;
    const precioSinDescuento = precioUnitario * litros;
    const descuentoAplicado = precioSinDescuento * (porcentajeDescuento / 100);
    const precioFinal = precioSinDescuento - descuentoAplicado;

    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!empleado || isSubmitting) return;

        if (!form.producto) {
            return Swal.fire({
                icon: 'warning',
                title: 'Producto requerido',
                text: 'Por favor seleccioná un producto.',
            });
        }

        const litros = parseFloat(form.litros.replace(',', '.'));
        if (isNaN(litros) || litros <= 0) {
            return Swal.fire({
                icon: 'warning',
                title: 'Litros inválidos',
                text: 'Ingresá una cantidad válida de litros.',
            });
        }

        // ✅ Paso de confirmación
        const { isConfirmed } = await Swal.fire({
            title: '<h2 style="font-size: 22px; font-weight: bold;">Confirmar carga</h2>',
            html: `
        <div style="text-align: left; font-size: 18px; line-height: 1.6;">
            <b>Empleado:</b> ${empleado.nombre} ${empleado.apellido}<br/>
            <b>DNI:</b> ${empleado.dni}<br/>
            <b>Empresa:</b> ${empleado.empresa}<br/>
            <b>Producto:</b> ${form.producto}<br/>
            <b>Litros:</b> ${litros}<br/>
            <b>Precio sin descuento:</b> ${precioSinDescuento.toLocaleString()} ${moneda}<br/>
            ${porcentajeDescuento > 0
                    ? `<b>Descuento aplicado:</b> ${porcentajeDescuento}% (-${descuentoAplicado.toLocaleString()} ${moneda})<br/>`
                    : ''
                }
            <hr style="margin: 12px 0; border: none; border-top: 1px solid #ccc;" />
            <b>Total final:</b> <span style="color: #4ade80; font-size: 20px; font-weight: bold;">
                ${precioFinal.toLocaleString()} ${moneda}
            </span>
        </div>
    `,
            width: '420px', // ✅ Más ancho que el default (~32rem)
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            background: '#1f2937',
            color: '#fff',
            backdrop: `rgba(0,0,0,0.9)`,
            customClass: {
                confirmButton:
                    'bg-red-800 hover:bg-red-700 text-white font-bold text-lg px-8 py-3 rounded',
                cancelButton:
                    'bg-gray-600 hover:bg-gray-500 text-white font-bold text-lg px-8 py-3 rounded'
            },
            buttonsStyling: false
        });

        if (!isConfirmed) return;

        setIsSubmitting(true);

        // 🌀 Mostrar loader
        Swal.fire({
            title: 'Registrando carga...',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            },
        });

        const res = await fetch('/api/cargas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombreEmpleado: `${empleado.nombre} ${empleado.apellido}`,
                dniEmpleado: empleado.dni,
                empresa: empleado.empresa,
                producto: form.producto,
                litros,
                precioSinDescuento,
                porcentajeDescuento,
                descuentoAplicado,
                precioFinal,
                fecha: new Date().toISOString(),
            }),
        });

        Swal.close();
        setIsSubmitting(false);

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
                    {porcentajeDescuento > 0 && (
                        <p className="text-sm text-green-300">Descuento aplicado: {porcentajeDescuento}%</p>
                    )}
                </div>

                <button className="w-full bg-red-600 py-3 rounded text-white text-xl font-semibold">
                    Cargar
                </button>
            </form>
        </main>
    );
}
