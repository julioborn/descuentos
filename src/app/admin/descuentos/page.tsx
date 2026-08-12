'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';

type Descuento = {
    _id: string;
    empresa: string;
    porcentaje: number;
    pais: 'arg' | 'py';
    promoActiva?: boolean;
};

export default function AdminDescuentosPage() {

    const { data: session, status } = useSession();
    const role = session?.user?.role;

    const pais: 'arg' | 'py' | undefined =
        role === 'admin_arg'
            ? 'arg'
            : role === 'admin_py'
                ? 'py'
                : undefined;

    const [descuentos, setDescuentos] = useState<Descuento[]>([]);
    const [nuevaEmpresa, setNuevaEmpresa] = useState('');
    const [nuevoPorcentaje, setNuevoPorcentaje] = useState('');

    useEffect(() => {
        if (status !== 'authenticated' || !pais) return;

        fetch(`/api/descuentos?pais=${pais}`)
            .then((res) => res.json())
            .then(setDescuentos)
            .catch(() =>
                Swal.fire('Error', 'No se pudieron cargar los descuentos', 'error')
            );
    }, [status, pais]);

    const handleEditChange = (id: string, porcentaje: string) => {
        setDescuentos((prev) =>
            prev.map((d) =>
                d._id === id
                    ? { ...d, porcentaje: parseFloat(porcentaje) || 0 }
                    : d
            )
        );
    };

    const guardarUno = async (descuento: Descuento) => {
        try {

            const res = await fetch(`/api/descuentos/${descuento._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ porcentaje: descuento.porcentaje }),
            });

            if (!res.ok) throw new Error();

            Swal.fire({
                icon: 'success',
                title: 'Descuento actualizado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
            });

        } catch {
            Swal.fire('Error', 'No se pudo guardar el cambio', 'error');
        }
    };

    const cambiarModoPromo = async (descuento: Descuento) => {
        const nuevoValor = !(descuento.promoActiva ?? true);

        try {
            const res = await fetch(`/api/descuentos/${descuento._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promoActiva: nuevoValor }),
            });

            if (!res.ok) throw new Error();

            setDescuentos((prev) =>
                prev.map((d) => (d._id === descuento._id ? { ...d, promoActiva: nuevoValor } : d))
            );

            Swal.fire({
                icon: 'success',
                title: nuevoValor ? 'Modo torneo activado' : 'Modo info de empresa activado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
            });
        } catch {
            Swal.fire('Error', 'No se pudo cambiar el modo', 'error');
        }
    };

    const agregarDescuento = async () => {

        if (!nuevaEmpresa || !nuevoPorcentaje || !pais) return;

        try {

            const res = await fetch('/api/descuentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empresa: nuevaEmpresa.trim(),
                    porcentaje: parseFloat(nuevoPorcentaje),
                    pais,
                }),
            });

            if (!res.ok) throw new Error();

            const nuevo = await res.json() as Descuento;

            setDescuentos(prev => [...prev, nuevo]);
            setNuevaEmpresa('');
            setNuevoPorcentaje('');

        } catch {

            Swal.fire('Error', 'No se pudo agregar el descuento', 'error');

        }
    };

    if (status === 'loading' || !pais) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* Encabezado */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                            Configuración
                        </p>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                            Descuentos
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 self-start rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#801818]" />
                        {descuentos.length} {descuentos.length === 1 ? 'empresa' : 'empresas'}
                    </div>
                </div>

                {/* Agregar empresa */}
                <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">

                    <div className="flex items-center gap-1.5 mb-3">
                        <svg
                            className="h-3.5 w-3.5 text-stone-400"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                            Agregar empresa
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-3 sm:items-end">
                        <div>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Nombre de la empresa
                            </label>
                            <input
                                type="text"
                                value={nuevaEmpresa}
                                onChange={(e) => setNuevaEmpresa(e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 transition"
                                placeholder="Ej: COTRECO"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Porcentaje de descuento
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={nuevoPorcentaje}
                                    onChange={(e) => setNuevoPorcentaje(e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 transition"
                                    placeholder="Ej: 5"
                                />

                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                                    %
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={agregarDescuento}
                            className="bg-[#801818] hover:bg-red-700 text-white py-2 px-6 rounded-lg text-sm font-semibold transition shadow-sm"
                        >
                            Agregar empresa
                        </button>
                    </div>

                </div>

                {/* Lista */}
                {descuentos.length === 0 ? (
                    <div className="bg-white border border-stone-200 rounded-2xl p-10 text-center shadow-sm">
                        <p className="text-sm text-stone-500">
                            Todavía no hay empresas con descuento cargado.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                        {descuentos.map((d) => (

                            <div
                                key={d._id}
                                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm"
                            >

                                <div className="flex items-center gap-3 mb-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#801818]/10 text-xs font-bold text-[#801818]">
                                        %
                                    </div>
                                    <div className="text-base font-semibold text-stone-800 truncate">
                                        {d.empresa}
                                    </div>
                                </div>

                                <div className="flex gap-3">

                                    <div className="relative flex-1">

                                        <input
                                            type="number"
                                            value={d.porcentaje}
                                            min={0}
                                            step={0.01}
                                            onChange={(e) =>
                                                handleEditChange(d._id, e.target.value)
                                            }
                                            className="w-full bg-stone-50 border border-stone-200 rounded-lg py-2 pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 transition"
                                            placeholder="Porcentaje"
                                        />

                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-semibold text-sm">
                                            %
                                        </span>

                                    </div>

                                    <button
                                        onClick={() => guardarUno(d)}
                                        className="bg-[#801818] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700 transition shadow-sm"
                                    >
                                        Guardar
                                    </button>

                                </div>

                                {d.empresa === 'INDIECITO' && (
                                    <button
                                        onClick={() => cambiarModoPromo(d)}
                                        className={`mt-3 w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition ${(d.promoActiva ?? true)
                                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                            }`}
                                    >
                                        <span className={`h-1.5 w-1.5 rounded-full ${(d.promoActiva ?? true) ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                                        {(d.promoActiva ?? true) ? 'QR en modo torneo' : 'QR en modo info de empresa'}
                                    </button>
                                )}

                            </div>

                        ))}

                    </div>
                )}

            </div>
        </main>
    );
}