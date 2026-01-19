'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';

type Descuento = {
    _id: string;
    empresa: string;
    porcentaje: number;
    pais: 'arg' | 'py';           // ← ahora el modelo lo incluye
};

export default function AdminDescuentosPage() {
    /* ---------- sesión ---------- */
    const { data: session, status } = useSession();
    const role = session?.user?.role;

    // país según el rol
    const pais: 'arg' | 'py' | undefined = role === 'admin_arg' ? 'arg' : role === 'admin_py' ? 'py' : undefined;

    /* ---------- estado ---------- */
    const [descuentos, setDescuentos] = useState<Descuento[]>([]);
    const [nuevaEmpresa, setNuevaEmpresa] = useState('');
    const [nuevoPorcentaje, setNuevoPorcentaje] = useState('');

    /* ---------- carga inicial ---------- */
    useEffect(() => {
        if (status !== 'authenticated' || !pais) return;

        fetch(`/api/descuentos?pais=${pais}`)
            .then((res) => res.json())
            .then(setDescuentos)
            .catch(() =>
                Swal.fire('Error', 'No se pudieron cargar los descuentos', 'error')
            );
    }, [status, pais]);

    /* ---------- helpers ---------- */
    const handleEditChange = (id: string, porcentaje: string) => {
        setDescuentos((prev) =>
            prev.map((d) =>
                d._id === id ? { ...d, porcentaje: parseFloat(porcentaje) || 0 } : d
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
                title: `Descuento actualizado`,
                text: `${descuento.empresa}: ${descuento.porcentaje}%`,
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
            });
        } catch {
            Swal.fire('Error', 'No se pudo guardar el cambio', 'error');
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
                    pais, // 👈 enviamos el país según el rol
                }),
            });

            if (!res.ok) throw new Error();

            const nuevo = (await res.json()) as Descuento;
            setDescuentos((prev) => [...prev, nuevo]);
            setNuevaEmpresa('');
            setNuevoPorcentaje('');
        } catch {
            Swal.fire('Error', 'No se pudo agregar el descuento', 'error');
        }
    };

    /* ---------- UI ---------- */
    if (status === 'loading' || !pais) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-700 text-white">
                <p>Cargando…</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen px-6 py-10 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900 text-white">
            <h1 className="text-3xl font-bold text-center mb-8">
                Descuentos
                {/* &nbsp;
                <span className="text-base font-normal">
                    ({pais === 'arg' ? 'Argentina' : 'Paraguay'})
                </span> */}
            </h1>

            {/* Lista de empresas */}
            <div className="space-y-4 mb-10 max-w-md mx-auto">
                {descuentos.map((d) => (
                    <div key={d._id} className="bg-gray-800 p-4 rounded-2xl shadow">
                        <div className="font-semibold mb-3 text-lg">{d.empresa}</div>

                        {/* input + botón */}
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="number"
                                    value={d.porcentaje}
                                    min={0}
                                    step={0.01}
                                    onChange={(e) => handleEditChange(d._id, e.target.value)}
                                    className="w-full border p-2 pr-10 rounded text-black"
                                    placeholder="Porcentaje"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                    %
                                </span>
                            </div>

                            <button
                                onClick={() => guardarUno(d)}
                                className="px-4 py-2 bg-red-800 hover:bg-red-700 rounded text-sm font-semibold shrink-0"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Formulario para agregar una nueva empresa */}
            <div className="bg-gray-800 p-5 rounded-2xl shadow max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-3">Agregar empresa</h2>

                <input
                    type="text"
                    value={nuevaEmpresa}
                    onChange={(e) => setNuevaEmpresa(e.target.value)}
                    className="w-full border p-2 mb-3 rounded text-black"
                    placeholder="Nombre de la empresa"
                />

                <div className="relative mb-3">
                    <input
                        type="number"
                        value={nuevoPorcentaje}
                        onChange={(e) => setNuevoPorcentaje(e.target.value)}
                        className="w-full border p-2 pr-10 rounded text-black"
                        placeholder="Porcentaje de descuento"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                        %
                    </span>
                </div>

                <button
                    onClick={agregarDescuento}
                    className="w-full bg-red-800 hover:bg-red-700 text-white py-2 rounded"
                >
                    Agregar empresa
                </button>
            </div>
        </main>
    );
}
