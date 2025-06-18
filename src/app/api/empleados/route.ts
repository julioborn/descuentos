// src/app/api/empleados/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";
import { NextRequest, NextResponse } from "next/server";

// GET: Listar todos los empleados
export async function GET() {
    await connectMongoDB();

    try {
        const empleados = await Empleado.find().sort({ apellido: 1, nombre: 1 });
        return NextResponse.json(empleados);
    } catch (error) {
        console.error("Error al obtener empleados:", error);
        return NextResponse.json({ error: "Error al obtener empleados" }, { status: 500 });
    }
}

// POST: Crear nuevo empleado
export async function POST(req: NextRequest) {
    await connectMongoDB();

    const body = await req.json();

    try {
        const nuevoEmpleado = await Empleado.create({
            nombre: body.nombre,
            apellido: body.apellido,
            dni: body.dni,
            telefono: body.telefono,
            empresa: body.empresa,
            qrToken: body.qrToken,
            activo: true,
        });

        return NextResponse.json(nuevoEmpleado);
    } catch (error) {
        console.error("Error al crear empleado:", error);
        return NextResponse.json({ error: "Error al crear empleado" }, { status: 500 });
    }
}
