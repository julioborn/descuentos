import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";

export async function POST(req: Request) {
    const { dni } = await req.json();

    if (!dni) {
        return NextResponse.json(
            { error: "DNI requerido" },
            { status: 400 }
        );
    }

    await connectMongoDB();

    const emp = await Empleado.findOne({
        dni: String(dni),
        empresa: "POLICIA",
        activo: true,
    });

    if (!emp) {
        return NextResponse.json(
            { error: "No encontrado" },
            { status: 404 }
        );
    }

    return NextResponse.json({
        nombre: emp.nombre,
        apellido: emp.apellido,
        dni: emp.dni,
        localidad: emp.localidad,
        descargado: Boolean(emp.qrDescargado),
    });
}