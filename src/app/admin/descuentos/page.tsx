'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

type Descuento = {
    _id: string;
    empresa: string;
    porcentaje: number;
};

export default function AdminDescuentosPage() {
    const [descuentos, setDescuentos] = useState<Descuento[]>([]);
    const [nuevaEmpresa, setNuevaEmpresa] = useState('');
    const [nuevoPorcentaje, setNuevoPorcentaje] = useState('');

    useEffect(() => {
        fetch('/api/descuentos')
            .then(res => res.json())
            .then(data => setDescuentos(data))
            .catch(() => Swal.fire('Error', 'No se pudieron cargar los descuentos', 'error'));
    }, []);

    const handleChange = (id: string, porcentaje: string) => {
        setDescuentos(prev =>
            prev.map(d =>
                d._id === id ? { ...d, porcentaje: parseFloat(porcentaje) || 0 } : d
            )
        );
    };

    const guardarCambios = async () => {
        const res = await fetch('/api/descuentos', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(descuentos),
        });

        if (res.ok) {
            Swal.fire('Éxito', 'Descuentos actualizados', 'success');
        } else {
            Swal.fire('Error', 'No se pudieron guardar los cambios', 'error');
        }
    };

    const agregarDescuento = async () => {
        if (!nuevaEmpresa || !nuevoPorcentaje) return;

        const res = await fetch('/api/descuentos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                empresa: nuevaEmpresa,
                porcentaje: parseFloat(nuevoPorcentaje),
            }),
        });

        if (res.ok) {
            const nuevo = await res.json();
            setDescuentos(prev => [...prev, nuevo]);
            setNuevaEmpresa('');
            setNuevoPorcentaje('');
        } else {
            Swal.fire('Error', 'No se pudo agregar el descuento', 'error');
        }
    };

    return (
        <main className="min-h-screen p-6 bg-gray-700 text-white">
            <h1 className="text-3xl font-bold text-center mb-8 text-white">Descuentos</h1>

            <div className="space-y-4 mb-2 max-w-md mx-auto">
                {descuentos.map(d => (
                    <div key={d._id} className="bg-white text-black p-4 rounded shadow">
                        <div className="font-semibold mb-2">{d.empresa}</div>

                        <div className="relative">
                            <input
                                type="number"
                                value={d.porcentaje}
                                onChange={e => handleChange(d._id, e.target.value)}
                                className="w-full border p-2 pr-10 rounded"
                                placeholder="Porcentaje de descuento"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                                %
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="max-w-md mx-auto mb-8">
                <button
                    onClick={guardarCambios}
                    className="w-full bg-red-800 hover:bg-red-700 text-white py-2 rounded"
                >
                    Guardar cambios
                </button>
            </div>

            <div className="bg-white text-black p-4 rounded shadow max-w-md mx-auto">
                <h2 className="text-xl font-semibold mb-2">Agregar empresa</h2>
                <input
                    type="text"
                    value={nuevaEmpresa}
                    onChange={e => setNuevaEmpresa(e.target.value)}
                    className="w-full border p-2 mb-2 rounded"
                    placeholder="Nombre de la empresa"
                />
                <input
                    type="number"
                    value={nuevoPorcentaje}
                    onChange={e => setNuevoPorcentaje(e.target.value)}
                    className="w-full border p-2 mb-2 rounded"
                    placeholder="Porcentaje de descuento"
                />
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
