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
            const qr = await QRCode.toDataURL(`https://descuentos-estacion.vercel.app/playero?token=${token}`);
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
        <main className="min-h-screen px-4 sm:px-6 py-8 bg-gradient-to-tr from-black via-slate-900 to-black text-white font-sans space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Administración</h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                    <a
                        href="/admin/precios"
                        className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-semibold px-4 py-2 rounded hover:scale-105 transition-transform shadow text-center"
                    >
                        Editar Precios
                    </a>
                    <LogoutButton />
                </div>
            </div>

            <section className="grid md:grid-cols-2 gap-8 items-start">
                <form onSubmit={handleSubmit} className="bg-white/10 p-6 rounded-xl border border-white/20 shadow-xl space-y-5 w-full">
                    <h2 className="text-2xl font-bold text-violet-400 mb-4">Registrar nuevo empleado</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(form).map(([key, value]) => (
                            <input
                                key={key}
                                name={key}
                                placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
                                value={value}
                                onChange={handleChange}
                                className="p-2 rounded bg-slate-800 border border-slate-600 placeholder-gray-400"
                                required
                            />
                        ))}
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-indigo-500 text-white py-2 rounded hover:scale-105 transition-transform">
                        Generar QR
                    </button>
                    {qrUrl && (
                        <div className="text-center mt-6">
                            <h3 className="text-lg mb-2 font-semibold">QR generado</h3>
                            <img src={qrUrl} alt="QR" className="w-48 h-48 mx-auto rounded shadow-lg" />
                            <a href={qrUrl} download="qr-empleado.png" className="text-blue-400 hover:underline block mt-2">Descargar QR</a>
                        </div>
                    )}
                </form>

                <div className="bg-white/5 p-6 rounded-xl shadow-xl border border-white/10 w-full overflow-x-auto">
                    <h2 className="text-2xl font-semibold mb-4 text-blue-300">Cargas registradas</h2>
                    <table className="min-w-[700px] w-full text-sm">
                        <thead className="text-left text-blue-400 bg-white/5">
                            <tr>
                                <th className="p-3 whitespace-nowrap">Fecha</th>
                                <th className="p-3 whitespace-nowrap">Empleado</th>
                                <th className="p-3 whitespace-nowrap">DNI</th>
                                <th className="p-3 whitespace-nowrap">Producto</th>
                                <th className="p-3 whitespace-nowrap">Litros</th>
                                <th className="p-3 whitespace-nowrap">Precio</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cargas.map(c => (
                                <tr key={c._id} className="hover:bg-white/10 transition">
                                    <td className="p-2 whitespace-normal break-words">{new Date(c.fecha).toLocaleString()}</td>
                                    <td className="p-2 whitespace-normal break-words">{c.nombreEmpleado}</td>
                                    <td className="p-2 whitespace-normal break-words">{c.dniEmpleado}</td>
                                    <td className="p-2 whitespace-normal break-words">{c.producto}</td>
                                    <td className="p-2 whitespace-normal break-words">{c.litros}</td>
                                    <td className="p-2 whitespace-normal break-words">{c.precioFinal.toLocaleString()} ₢</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bg-white/5 p-6 rounded-xl shadow-xl border border-white/10 overflow-x-auto">
                <h2 className="text-2xl font-semibold mb-4 text-green-400">Empleados registrados</h2>
                <table className="min-w-[700px] w-full text-sm">
                    <thead className="text-left bg-white/5 text-green-400">
                        <tr>
                            <th className="p-3 whitespace-nowrap">Nombre</th>
                            <th className="p-3 whitespace-nowrap">Apellido</th>
                            <th className="p-3 whitespace-nowrap">DNI</th>
                            <th className="p-3 whitespace-nowrap">Teléfono</th>
                            <th className="p-3 whitespace-nowrap">Empresa</th>
                            <th className="p-3 whitespace-nowrap">QR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {empleados.map(emp => (
                            <tr key={emp._id} className="hover:bg-white/10 transition">
                                <td className="p-2 whitespace-normal break-words">{emp.nombre}</td>
                                <td className="p-2 whitespace-normal break-words">{emp.apellido}</td>
                                <td className="p-2 whitespace-normal break-words">{emp.dni}</td>
                                <td className="p-2 whitespace-normal break-words">{emp.telefono}</td>
                                <td className="p-2 whitespace-normal break-words">{emp.empresa}</td>
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
            </section>
        </main>
    );
}
