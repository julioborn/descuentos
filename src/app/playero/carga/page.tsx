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
    moneda === 'ARS' ? '$' : moneda === 'Gs' ? '₲' : '';

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
            background: '#0f172a',
            color: '#e5e7eb',
            backdrop: 'rgba(0,0,0,0.85)',

            // usa título simple y lo estilamos por clase
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
        <span style="font-weight:700;">Total final</span>
        <span style="color:#22c55e;font-weight:800;font-size:18px;">
          ${fmtAR(precioFinal)} ${symbol}
        </span>
      </div>
    </div>
  `,

            showCancelButton: true,
            buttonsStyling: false,
            confirmButtonText: `
    <span style="display:inline-flex;align-items:center;gap:8px">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 7L9 18l-5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Confirmar
    </span>
  `,
            cancelButtonText: 'Cancelar',

            // 🔧 damos clases a cada parte para apretar los espacios
            customClass: {
                popup: 'sw-popup-tight',
                title: 'sw-title-tight',
                htmlContainer: 'sw-html-tight',
                actions: 'sw-actions-tight',
                confirmButton: 'sw-ok',
                cancelButton: 'sw-cancel',
            },

            didOpen: () => {
                // Inyectamos CSS una sola vez (si no existiera)
                if (!document.getElementById('swal-tight-css')) {
                    const style = document.createElement('style');
                    style.id = 'swal-tight-css';
                    style.textContent = `
        .sw-popup-tight{ padding:14px 16px 16px !important; border-radius:16px; }
        .sw-title-tight{ margin:0 !important; font-size:22px !important; font-weight:800; }
        .sw-html-tight{ margin:8px 0 0 !important; }           /* menos gap bajo el título */
        .sw-actions-tight{ margin:14px 0 0 !important; }       /* menos gap sobre los botones */

        .sw-body{ text-align:left; font-size:16px; line-height:1.5; display:grid; gap:6px; }
        .sw-divider{ height:1px; background:#334155; margin:8px 0 10px; }
        .sw-total{
          display:flex; justify-content:space-between; align-items:center;
          background:#0b1220; border:1px solid #1f2937; border-radius:12px;
          padding:10px 12px;
        }

        /* Botones */
        .sw-ok{
          background:linear-gradient(135deg,#16a34a,#22c55e) !important;
          color:#fff !important; font-weight:800 !important; border-radius:9999px !important;
          padding:10px 18px !important; font-size:16px !important;
          box-shadow:0 8px 20px rgba(34,197,94,.25) !important;
        }
        .sw-cancel{
          background:#374151 !important; color:#fff !important; font-weight:700 !important;
          border-radius:9999px !important; padding:10px 18px !important; font-size:16px !important;
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
        <main className="min-h-screen px-4 py-6 bg-gray-700 text-white">

            <div className="mb-6 bg-white/10 p-6 rounded-lg flex flex-col justify-center items-center gap-3">
                {/* Nombre */}
                <h2 className="flex items-center gap-2 text-2xl font-extrabold tracking-wide text-white text-center">
                    {empleado.nombre} {empleado.apellido}
                </h2>

                {/* DNI */}
                <p className="flex items-center gap-2 text-xl text-slate-200">
                    <span className="font-semibold text-white">DNI:</span> {empleado.dni}
                </p>

                {/* Empresa */}
                <p className="flex items-center gap-2 text-xl text-slate-200">
                    {empleado.empresa}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white/10 p-6 rounded-lg max-w-md mx-auto">
                <div className="relative">
                    <select
                        name="producto"
                        value={form.producto}
                        onChange={handleChange}
                        className="appearance-none w-full p-5 font-semibold text-lg sm:text-xl rounded bg-gray-800 text-white pr-12"
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

                {/* Pantalla de TOTAL */}
                <div className="mt-2">
                    <div className="
      mx-auto max-w-md rounded-2xl
      bg-gradient-to-b from-slate-900 to-slate-800
      border border-slate-600/50
      shadow-[inset_0_-60px_120px_rgba(0,0,0,.35),0_10px_30px_rgba(0,0,0,.4)]
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
                        <p className="mt-2 text-center text-xl font-semibold text-emerald-300">
                            Descuento {porcentajeDescuento}%
                        </p>
                    )}
                </div>

                <button className="w-full bg-red-700 py-3 rounded text-white text-xl font-bold">
                    Cargar
                </button>
            </form>
        </main>
    );
}
