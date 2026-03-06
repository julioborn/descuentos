'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Swal from 'sweetalert2';

type Descuento = {
    _id: string;
    empresa: string;
    porcentaje: number;
    pais: 'arg' | 'py';
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
            <main className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-600">Cargando…</p>
            </main>
        );
    }

    return (
        <main className="min-h-screen px-6 py-12 bg-gray-50">

            <h1 className="text-3xl font-bold text-center mb-10 text-[#111827]">
                Descuentos
            </h1>

            {/* Lista */}
            <div className="space-y-6 mb-12 max-w-md mx-auto">

                {descuentos.map((d) => (

                    <div
                        key={d._id}
                        className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
                    >

                        <div className="text-lg font-semibold text-gray-800 mb-3">
                            {d.empresa}
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
                                    className="w-full bg-gray-100 border border-gray-200 rounded-lg py-2 pr-10 pl-3 focus:outline-none focus:ring-2 focus:ring-[#801818]"
                                    placeholder="Porcentaje"
                                />

                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                    %
                                </span>

                            </div>

                            <button
                                onClick={() => guardarUno(d)}
                                className="bg-[#801818] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition shadow-sm"
                            >
                                Guardar
                            </button>

                        </div>

                    </div>

                ))}

            </div>

            {/* Agregar empresa */}

            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm max-w-md mx-auto">

                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Agregar empresa
                </h2>

                <input
                    type="text"
                    value={nuevaEmpresa}
                    onChange={(e) => setNuevaEmpresa(e.target.value)}
                    className="w-full bg-gray-100 border border-gray-200 rounded-lg py-2 px-3 mb-3 focus:outline-none focus:ring-2 focus:ring-[#801818]"
                    placeholder="Nombre de la empresa"
                />

                <div className="relative mb-4">

                    <input
                        type="number"
                        value={nuevoPorcentaje}
                        onChange={(e) => setNuevoPorcentaje(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-200 rounded-lg py-2 pr-10 pl-3 focus:outline-none focus:ring-2 focus:ring-[#801818]"
                        placeholder="Porcentaje de descuento"
                    />

                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                        %
                    </span>

                </div>

                <button
                    onClick={agregarDescuento}
                    className="w-full bg-[#801818] hover:bg-red-700 text-white py-2 rounded-lg transition shadow-sm"
                >
                    Agregar empresa
                </button>

            </div>

        </main>
    );
}