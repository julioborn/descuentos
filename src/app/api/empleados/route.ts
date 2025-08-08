// src/app/api/empleados/route.ts
import { authOptions } from "@/lib/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

// GET: Listar todos los empleados
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    await connectMongoDB();

    const match: any = { activo: true };
    if (session?.user.role === 'admin_arg') match.pais = 'AR';
    if (session?.user.role === 'admin_py') match.pais = 'PY';

    const empleados = await Empleado.find(match);
    return NextResponse.json(empleados);
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
            localidad: body.localidad,
            qrToken: body.qrToken,
            activo: true,
            pais: body.pais,
        });

        return NextResponse.json(nuevoEmpleado);
    } catch (error) {
        console.error("Error al crear empleado:", error);
        return NextResponse.json({ error: "Error al crear empleado" }, { status: 500 });
    }
}
