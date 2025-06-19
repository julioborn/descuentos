'use client';

import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";
import LogoutButton from "@/components/LogoutButton";

type Carga = {
    _id: string;
    nombreEmpleado: string;
    dniEmpleado: string;
    producto: string;
    litros: number;
    precioFinal: number;
    fecha: string;
};

type Empleado = {
    _id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono: string;
    empresa: string;
    qrToken: string;
};

export default function AdminPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [qrMap, setQrMap] = useState<Record<string, string>>({});
    const [form, setForm] = useState({ nombre: "", apellido: "", dni: "", telefono: "", empresa: "" });
    const [qrUrl, setQrUrl] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            const resCargas = await fetch("/api/cargas");
            const resEmpleados = await fetch("/api/empleados");

            if (resCargas.ok) setCargas(await resCargas.json());
            if (resEmpleados.ok) {
                const empleadosData = await resEmpleados.json();
                setEmpleados(empleadosData);

                const qrData = await Promise.all(
                    empleadosData.map((emp: Empleado) =>
                        QRCode.toDataURL(`${window.location.origin}/playero?token=${emp.qrToken}`).then(url => ({ id: emp._id, url }))
                    )
                );

                const map: Record<string, string> = {};
                qrData.forEach(({ id, url }) => (map[id] = url));
                setQrMap(map);
            }
        };
        fetchData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = uuidv4();

        const res = await fetch("/api/empleados", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, qrToken: token }),
        });

        if (res.ok) {
            const qr = await QRCode.toDataURL(
                `https://descuentos-estacion.vercel.app/playero?token=${token}`
            );
            setQrUrl(qr);
            alert("Empleado creado con éxito");
            setForm({ nombre: "", apellido: "", dni: "", telefono: "", empresa: "" });

            const updated = await fetch("/api/empleados");
            const data = await updated.json();
            setEmpleados(data);

            const qrData = await Promise.all(
                data.map((emp: Empleado) =>
                    QRCode.toDataURL(`${window.location.origin}/playero?token=${emp.qrToken}`).then(url => ({ id: emp._id, url }))
                )
            );
            const map: Record<string, string> = {};
            qrData.forEach(({ id, url }) => (map[id] = url));
            setQrMap(map);
        }
    };

    return (
        <main className="min-h-screen px-6 py-10 bg-gradient-to-tr from-black via-slate-900 to-black text-white font-sans space-y-16">
            <div className="flex justify-between items-center">
                <h1 className="text-4xl font-bold tracking-tight">⚡ Admin Dashboard</h1>
                <LogoutButton />
            </div>

            <section className="grid md:grid-cols-2 gap-10 items-start">
                <form onSubmit={handleSubmit} className="bg-white/10 p-6 rounded-xl border border-white/20 shadow-xl space-y-5">
                    <h2 className="text-2xl font-bold text-violet-400 mb-4">Registrar nuevo empleado</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input type="text" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} className="p-2 rounded bg-slate-800 border border-slate-600 placeholder-gray-400" required />
                        <input type="text" name="apellido" placeholder="Apellido" value={form.apellido} onChange={handleChange} className="p-2 rounded bg-slate-800 border border-slate-600 placeholder-gray-400" required />
                        <input type="text" name="dni" placeholder="DNI" value={form.dni} onChange={handleChange} className="p-2 rounded bg-slate-800 border border-slate-600 placeholder-gray-400" required />
                        <input type="text" name="telefono" placeholder="Teléfono" value={form.telefono} onChange={handleChange} className="p-2 rounded bg-slate-800 border border-slate-600 placeholder-gray-400" required />
                        <input type="text" name="empresa" placeholder="Empresa" value={form.empresa} onChange={handleChange} className="p-2 rounded bg-slate-800 border border-slate-600 placeholder-gray-400" required />
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 text-white py-2 rounded hover:scale-105 transition-transform">Generar QR</button>

                    {qrUrl && (
                        <div className="text-center mt-6">
                            <h3 className="text-lg mb-2 font-semibold">QR generado</h3>
                            <img src={qrUrl} alt="QR" className="w-48 h-48 mx-auto rounded shadow-lg" />
                            <a href={qrUrl} download="qr-empleado.png" className="text-blue-400 hover:underline block mt-2">Descargar QR</a>
                        </div>
                    )}
                </form>

                <div className="bg-white/5 p-6 rounded-xl shadow-xl border border-white/10">
                    <h2 className="text-2xl font-semibold mb-4 text-blue-300">Cargas registradas</h2>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-left text-blue-400 bg-white/5">
                                <tr>
                                    <th className="p-3">Fecha</th>
                                    <th className="p-3">Empleado</th>
                                    <th className="p-3">DNI</th>
                                    <th className="p-3">Producto</th>
                                    <th className="p-3">Litros</th>
                                    <th className="p-3">Precio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargas.map(c => (
                                    <tr key={c._id} className="hover:bg-white/10 transition">
                                        <td className="p-2">{new Date(c.fecha).toLocaleString()}</td>
                                        <td className="p-2">{c.nombreEmpleado}</td>
                                        <td className="p-2">{c.dniEmpleado}</td>
                                        <td className="p-2">{c.producto}</td>
                                        <td className="p-2">{c.litros}</td>
                                        <td className="p-2">${c.precioFinal.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className="bg-white/5 p-6 rounded-xl shadow-xl border border-white/10">
                <h2 className="text-2xl font-semibold mb-4 text-green-400">Empleados registrados</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="text-left bg-white/5 text-green-400">
                            <tr>
                                <th className="p-3">Nombre</th>
                                <th className="p-3">Apellido</th>
                                <th className="p-3">DNI</th>
                                <th className="p-3">Teléfono</th>
                                <th className="p-3">Empresa</th>
                                <th className="p-3">QR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empleados.map(emp => (
                                <tr key={emp._id} className="hover:bg-white/10 transition">
                                    <td className="p-2">{emp.nombre}</td>
                                    <td className="p-2">{emp.apellido}</td>
                                    <td className="p-2">{emp.dni}</td>
                                    <td className="p-2">{emp.telefono}</td>
                                    <td className="p-2">{emp.empresa}</td>
                                    <td className="p-2">
                                        {qrMap[emp._id] ? (
                                            <img src={qrMap[emp._id]} alt="QR" className="w-16 h-16 rounded border border-white/20" />
                                        ) : (
                                            <span className="text-gray-400">Cargando...</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
