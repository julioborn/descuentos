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

export default function AdminPage() {
    const [cargas, setCargas] = useState<Carga[]>([]);
    const [form, setForm] = useState({
        nombre: "",
        apellido: "",
        dni: "",
        telefono: "",
        empresa: "",
    });
    const [qrUrl, setQrUrl] = useState("");

    useEffect(() => {
        fetch("/api/cargas")
            .then(res => res.json())
            .then(data => setCargas(data));
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
            const qr = await QRCode.toDataURL(`https://tusitio.com/playero?token=${token}`);
            setQrUrl(qr);
            alert("Empleado creado con éxito");
            setForm({ nombre: "", apellido: "", dni: "", telefono: "", empresa: "" });
        }
    };

    return (
        <main className="p-4">
            <LogoutButton />
            <h1 className="text-2xl font-bold mb-4">Panel del Administrador</h1>

            {/* Listado de cargas */}
            <h2 className="text-xl font-semibold mt-6 mb-2">Cargas registradas</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full border text-sm">
                    <thead>
                        <tr className="bg-gray-200 text-left">
                            <th className="p-2">Fecha</th>
                            <th className="p-2">Empleado</th>
                            <th className="p-2">DNI</th>
                            <th className="p-2">Producto</th>
                            <th className="p-2">Litros</th>
                            <th className="p-2">Precio final</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargas.map(c => (
                            <tr key={c._id} className="border-t">
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

            {/* Formulario de creación de empleados */}
            <h2 className="text-xl font-semibold mt-10 mb-2">Crear empleado y generar QR</h2>
            <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow space-y-4 max-w-md">
                {["nombre", "apellido", "dni", "telefono", "empresa"].map((field) => (
                    <input
                        key={field}
                        type="text"
                        name={field}
                        placeholder={field}
                        value={(form as any)[field]}
                        onChange={handleChange}
                        className="w-full border p-2 rounded"
                        required
                    />
                ))}
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Generar QR</button>
            </form>

            {/* Resultado del QR */}
            {qrUrl && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">QR generado</h3>
                    <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                    <a href={qrUrl} download="qr-empleado.png" className="block mt-2 text-blue-600 underline">Descargar QR</a>
                </div>
            )}
        </main>
    );
}
