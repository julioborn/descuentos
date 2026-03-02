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

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    await connectMongoDB();
    const body = await req.json();

    // 🔐 Determinar país según rol
    let pais: string | null = null;

    if (session?.user.role === 'admin_arg') pais = 'AR';
    if (session?.user.role === 'admin_py') pais = 'PY';

    if (!pais) {
        return NextResponse.json(
            { error: "No autorizado para crear empleados" },
            { status: 403 }
        );
    }

    try {
        // 🔎 Buscar existente SOLO por dni + pais (coincide con índice)
        const existente = await Empleado.findOne({
            dni: body.dni,
            pais: pais
        });

        if (existente) {
            return NextResponse.json(
                { mensaje: "Empleado ya registrado" },
                { status: 409 }
            );
        }

        const nuevoEmpleado = await Empleado.create({
            nombre: body.nombre,
            apellido: body.apellido,
            dni: body.dni,
            telefono: body.telefono,

            empresa: body.empresa,
            subcategoria: body.subcategoria || undefined,
            localidad: body.localidad,
            qrToken: body.qrToken,
            activo: true,
            pais: pais, // 👈 usamos el país del rol, no el del body
        });

        return NextResponse.json(nuevoEmpleado);

    } catch (error) {
        console.error("Error al crear empleado:", error);
        return NextResponse.json(
            { error: "Error al crear empleado" },
            { status: 500 }
        );
    }
}
