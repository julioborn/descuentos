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

const fmtAR = (n: number) =>
    isFinite(n)
        ? n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '0,00';

const symbolFor = (moneda?: string) =>
    moneda === 'ARS' ? '$' : moneda === 'Gs' ? 'Gs' : '';

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
                    title: 'QR no disponible',
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
    const symbol = symbolFor(moneda);

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
            width: 440,
            background: '#ffffff',
            color: '#111827',
            backdrop: 'rgba(0,0,0,0.4)',

            title: 'Confirmar carga',

            html: `
    <div class="sw-body">
        <div><b>Empleado:</b> ${empleado.nombre} ${empleado.apellido}</div>
        <div><b>DNI:</b> ${empleado.dni}</div>
        <div><b>Empresa:</b> ${empleado.empresa}</div>
        <div><b>Producto:</b> ${form.producto}</div>
        <div><b>Litros:</b> ${fmtAR(litros)}</div>

        <div class="sw-divider"></div>

        <div class="sw-total">
            <span>Total final</span>
            <span class="sw-total-price">
                ${symbol} ${fmtAR(precioFinal)}
            </span>
        </div>
    </div>
    `,

            showCancelButton: true,
            buttonsStyling: false,

            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',

            customClass: {
                popup: 'sw-popup-tight',
                title: 'sw-title-tight',
                htmlContainer: 'sw-html-tight',
                actions: 'sw-actions-tight',
                confirmButton: 'sw-ok',
                cancelButton: 'sw-cancel'
            },

            didOpen: () => {
                if (!document.getElementById('swal-tight-css')) {

                    const style = document.createElement('style');
                    style.id = 'swal-tight-css';

                    style.textContent = `
            .sw-popup-tight{
                padding:16px 18px !important;
                border-radius:16px;
            }

            .sw-title-tight{
                margin:0 !important;
                font-size:22px !important;
                font-weight:800;
            }

            .sw-html-tight{
                margin:10px 0 0 !important;
            }

            .sw-actions-tight{
                margin:18px 0 0 !important;
            }

            .sw-body{
                text-align:left;
                font-size:15px;
                line-height:1.5;
                display:grid;
                gap:6px;
                color:#374151;
            }

            .sw-divider{
                height:1px;
                background:#e5e7eb;
                margin:10px 0;
            }

            .sw-total{
  display:flex;
  justify-content:space-between;
  align-items:center;
  background:#f9fafb;
  border:1px solid #e5e7eb;
  border-radius:12px;
  padding:12px;
  font-weight:600;
  color:#111827;
}

            .sw-total-price{
                color:#16a34a;
                font-weight:800;
                font-size:18px;
            }

            .sw-ok{
                background:#16a34a !important;
                color:#fff !important;
                font-weight:700 !important;
                border-radius:9999px !important;
                padding:10px 20px !important;
                font-size:15px !important;
                box-shadow:0 6px 16px rgba(34,197,94,.25) !important;
            }

            .sw-ok:hover{
                background:#15803d !important;
            }

            .sw-cancel{
                background:#e5e7eb !important;
                color:#111827 !important;
                font-weight:600 !important;
                border-radius:9999px !important;
                padding:10px 20px !important;
                font-size:15px !important;
                margin-left:10px !important;
            }
            `;

                    document.head.appendChild(style);
                }
            }
        });
        if (!isConfirmed) return;

        setIsSubmitting(true);

        // 🌀 Mostrar loader
        Swal.fire({
            html: `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
      <div class="spin" style="width:34px;height:34px;border:3px solid #334155;border-top-color:#22c55e;border-radius:50%;animation:spin 0.9s linear infinite"></div>
      <div style="color:#cbd5e1;font-weight:600">Registrando carga...</div>
    </div>
  `,
            background: '#0f172a',
            color: '#e5e7eb',
            showConfirmButton: false,
            allowOutsideClick: false,
            didOpen: () => {
                const style = document.createElement('style');
                style.innerHTML = '@keyframes spin{to{transform:rotate(360deg)}}';
                document.head.appendChild(style);
            }
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
        <main className="min-h-screen px-6 py-10 bg-gray-100">

            <div className="mb-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center space-y-2">
                <h2 className="text-2xl font-bold text-[#111827]">
                    {empleado.nombre} {empleado.apellido}
                </h2>

                <p className="text-gray-600">
                    <span className="font-semibold">DNI:</span> {empleado.dni}
                </p>

                <p className="text-gray-500">
                    {empleado.empresa}
                </p>
            </div>

            <form
                onSubmit={handleSubmit}
                className="space-y-6 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 max-w-md mx-auto"
            >
                <div className="relative">
                    <select
                        name="producto"
                        value={form.producto}
                        onChange={handleChange}
                        className="appearance-none w-full p-4 text-lg font-semibold rounded-xl border border-gray-300 bg-white text-gray-900 pr-10 focus:ring-2 focus:ring-[#801818] outline-none"
                    >
                        <option value="">Elegir producto</option>
                        {precios.map(p => (
                            <option key={p.producto} value={p.producto}>
                                {p.producto}
                                {/* - {p.precio.toLocaleString()} {p.moneda} */}
                            </option>
                        ))}
                    </select>

                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    disabled={!form.producto}
                    className={`w-full p-4 text-2xl text-center border rounded-xl outline-none
    ${!form.producto
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-gray-300 text-gray-900 focus:ring-2 focus:ring-[#801818]'
                        }`}
                    placeholder="Litros"
                />

                {/* Pantalla de TOTAL */}
                <div className="mt-2">
                    <div className="
      mx-auto max-w-md rounded-2xl
      bg-gradient-to-b from-slate-900 to-slate-800
      border border-gray-300
      p-4
    ">
                        <div className="flex items-center justify-between text-slate-300 text-[11px] uppercase tracking-widest">
                            <span className="flex items-center gap-2">
                            </span>
                        </div>
                        <div className="mt-1 text-center font-mono tabular-nums text-2xl sm:text-5xl font-extrabold
                    text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,.35)] tracking-wider">
                            {symbol} {fmtAR(precioFinal)}
                        </div>
                    </div>

                    {porcentajeDescuento > 0 && (
                        <p className="mt-4 text-center text-xl font-semibold text-gray-900">
                            Descuento {porcentajeDescuento}%
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-[#801818] hover:bg-red-700 text-white text-xl font-bold transition"
                >
                    Cargar
                </button>
            </form>
        </main>
    );
}
