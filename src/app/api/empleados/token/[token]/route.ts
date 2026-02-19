import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: { token: string } }
) {
    await connectMongoDB();

    try {
        const empleado = await Empleado.findOne({ qrToken: params.token });

        if (!empleado) {
            return NextResponse.json(
                { error: "QR inválido" },
                { status: 404 }
            );
        }

        if (!empleado.activo) {
            return NextResponse.json(
                { error: "Beneficiario dado de baja" },
                { status: 403 }
            );
        }

        // ⚠️ DEVOLVER SOLO LO NECESARIO
        return NextResponse.json({
            nombre: empleado.nombre,
            apellido: empleado.apellido,
            dni: empleado.dni,
            empresa: empleado.empresa,
            tipo: empleado.tipo,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Error del servidor" },
            { status: 500 }
        );
    }
} 