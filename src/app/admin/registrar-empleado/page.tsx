'use client';

import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

export default function RegistrarEmpleadoPage() {
    const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', telefono: '', empresa: '' });
    const [qrUrl, setQrUrl] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = uuidv4();

        const res = await fetch('/api/empleados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, qrToken: token }),
        });

        if (res.ok) {
            const qr = await QRCode.toDataURL(`${window.location.origin}/playero?token=${token}`);
            setQrUrl(qr);
            alert('Empleado creado con éxito');
            setForm({ nombre: '', apellido: '', dni: '', telefono: '', empresa: '' });
        }
    };

    return (
        <main className="min-h-screen px-4 py-10 bg-gray-700 text-white space-y-8 max-w-xl mx-auto">
            <h1 className="text-3xl font-bold text-center">Registrar Empleado</h1>

            <form onSubmit={handleSubmit} className="bg-white/10 p-6 rounded-xl border border-white/20 shadow-xl space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.entries(form).map(([key, value]) => (
                        <input
                            key={key}
                            name={key}
                            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                            value={value}
                            onChange={handleChange}
                            className="p-3 rounded bg-slate-800 border border-slate-600 placeholder-gray-400 text-white"
                            required
                        />
                    ))}
                </div>
                <button type="submit" className="w-full bg-red-800 text-white py-3 rounded hover:scale-105 transition">
                    Generar QR
                </button>
                {qrUrl && (
                    <div className="text-center mt-6">
                        <h3 className="text-lg mb-2 font-semibold">QR generado</h3>
                        <img src={qrUrl} alt="QR" className="w-48 h-48 mx-auto rounded shadow-lg" />
                        <a href={qrUrl} download="qr-empleado.png" className="text-blue-400 hover:underline block mt-2">
                            Descargar QR
                        </a>
                    </div>
                )}
            </form>
        </main>
    );
}
