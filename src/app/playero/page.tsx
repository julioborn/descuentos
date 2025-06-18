// src/app/playero/page.tsx
'use client';

import LogoutButton from "@/components/LogoutButton";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useState } from "react";

export default function PlayeroPage() {
    const [token, setToken] = useState("");
    const [empleado, setEmpleado] = useState<any>(null);
    const [producto, setProducto] = useState("nafta");
    const [litros, setLitros] = useState(0);
    const [precioFinal, setPrecioFinal] = useState(0);
    const [escaneando, setEscaneando] = useState(true);

    // Inicializar escáner
    const iniciarScanner = () => {
        const scanner = new Html5QrcodeScanner("scanner", { fps: 10, qrbox: 250 }, false);
        scanner.render(
            async (decodedText) => {
                setToken(decodedText.split("token=")[1]);
                scanner.clear();
                setEscaneando(false);
                const res = await fetch(`/api/empleado?token=${decodedText.split("token=")[1]}`);
                const data = await res.json();
                setEmpleado(data);
            },
            (error) => console.warn("QR no válido:", error)
        );
    };

    // Cargar datos del empleado
    const registrarCarga = async () => {
        const resPrecio = await fetch(`/api/precio?producto=${producto}`);
        const { precioPorLitro } = await resPrecio.json();
        const precio = litros * precioPorLitro;

        await fetch("/api/cargas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                empleadoId: empleado._id,
                nombreEmpleado: `${empleado.nombre} ${empleado.apellido}`,
                dniEmpleado: empleado.dni,
                producto,
                litros,
                precioFinal: precio,
            }),
        });

        alert("Carga registrada");
        window.location.reload();
    };

    return (
        <main className="p-4">
            <LogoutButton />
            <h1 className="text-2xl font-bold mb-4">Escanear QR del empleado</h1>

            {escaneando && (
                <div>
                    <div id="scanner" className="w-full max-w-sm" />
                    <button onClick={iniciarScanner} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Iniciar escáner</button>
                </div>
            )}

            {empleado && (
                <div className="mt-6 space-y-4">
                    <div className="bg-white p-4 rounded shadow">
                        <p><strong>Nombre:</strong> {empleado.nombre} {empleado.apellido}</p>
                        <p><strong>DNI:</strong> {empleado.dni}</p>
                        <p><strong>Teléfono:</strong> {empleado.telefono}</p>
                        <p><strong>Empresa:</strong> {empleado.empresa}</p>
                    </div>

                    <div className="bg-white p-4 rounded shadow">
                        <label className="block mb-1">Producto</label>
                        <select className="w-full border rounded p-2" value={producto} onChange={e => setProducto(e.target.value)}>
                            <option value="nafta">Nafta</option>
                            <option value="gasoil">Gasoil</option>
                            {/* agregar más opciones si querés */}
                        </select>

                        <label className="block mt-4 mb-1">Litros cargados</label>
                        <input type="number" className="w-full border rounded p-2" value={litros} onChange={e => setLitros(Number(e.target.value))} />

                        <button onClick={registrarCarga} className="mt-4 px-4 py-2 bg-green-600 text-white rounded">
                            Registrar carga
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
