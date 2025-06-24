'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import Swal from 'sweetalert2';
import Loader from '@/components/Loader';
import html2canvas from 'html2canvas';
import { useRef } from 'react';

export default function RegistrarEmpleadoPage() {
    const [form, setForm] = useState({ nombre: '', apellido: '', dni: '', telefono: '', empresa: '' });
    const [qrUrl, setQrUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [empleadoGenerado, setEmpleadoGenerado] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        empresa: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validación mínima
        if (!form.nombre || !form.apellido || !form.dni) {
            return Swal.fire({
                icon: 'warning',
                title: 'Campos obligatorios',
                text: 'Completá nombre, apellido y DNI.',
            });
        }

        const token = uuidv4();
        setLoading(true);

        try {
            const res = await fetch('/api/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, qrToken: token }),
            });

            if (!res.ok) throw new Error();

            const qr = await QRCode.toDataURL(`${window.location.origin}/playero?token=${token}`);
            setQrUrl(qr);

            Swal.fire({
                icon: 'success',
                title: 'Empleado registrado',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
            });

            setEmpleadoGenerado({
                nombre: form.nombre,
                apellido: form.apellido,
                dni: form.dni,
                empresa: form.empresa,
            });

            setForm({ nombre: '', apellido: '', dni: '', telefono: '', empresa: '' });
        } catch {
            Swal.fire({
                icon: 'error',
                title: 'Error al registrar',
                text: 'No se pudo registrar al empleado.',
            });
        } finally {
            setLoading(false);
        }
    };

    const tarjetaRef = useRef<HTMLDivElement>(null);

    const descargarTarjeta = async () => {
        if (tarjetaRef.current) {
            const canvas = await html2canvas(tarjetaRef.current, {
                scale: 2, // mejora la resolución de la imagen exportada
            });
            const image = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.href = image;
            link.download = `tarjeta-${empleadoGenerado.nombre}-${empleadoGenerado.apellido}.png`;
            link.click();
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

                <button
                    type="submit"
                    className="w-full bg-red-800 text-white py-3 rounded hover:scale-105 transition"
                    disabled={loading}
                >
                    {loading ? 'Generando...' : 'Generar QR'}
                </button>

                {loading && (
                    <div className="flex justify-center py-4">
                        <Loader />
                    </div>
                )}

                {qrUrl && (
                    <>
                        <div className="flex justify-center mt-10">
                            <div
                                ref={tarjetaRef}
                                className="bg-white text-black p-6 rounded-lg shadow-xl w-[320px] space-y-4 relative"
                            >
                                <div className="flex justify-center">
                                    <img src="/idescuentos.png" alt="Logo" className="w-100 h-18" />
                                </div>

                                <div className="flex justify-center">
                                    <img src={qrUrl} alt="QR Code" className="w-52 h-52" />

                                </div>

                                <div className="text-sm text-center">
                                    <strong>{empleadoGenerado.nombre} {empleadoGenerado.apellido}</strong>
                                    <p>{empleadoGenerado.dni}</p>
                                    <p>{empleadoGenerado.empresa}</p>
                                </div>
                            </div>
                        </div>

                        {/* Botón FUERA del contenedor */}
                        <div className="text-center mt-4">
                            <button
                                onClick={descargarTarjeta}
                                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                            >
                                Descargar Tarjeta
                            </button>
                        </div>
                    </>
                )}

            </form>
        </main>
    );
}
