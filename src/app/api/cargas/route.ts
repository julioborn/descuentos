// src/app/api/cargas/route.ts
import { authOptions } from "@/lib/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import { Carga } from "@/models/Carga";
import { Precio } from "@/models/Precio";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const cargas = await Carga.find().sort({ fecha: -1 });
    return NextResponse.json(cargas);
}

export async function POST(req: NextRequest) {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    const body = await req.json();

    if (!session || !session.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { producto, litros } = body;

    try {
        // Buscar el precio del producto según la moneda del playero
        const precio = await Precio.findOne({
            producto,
            moneda: session.user.moneda,
        });

        if (!precio) {
            return NextResponse.json({ error: "Precio no encontrado" }, { status: 404 });
        }

        const precioUnitario = precio.precio;
        const precioFinal = litros * precioUnitario;

        const nuevaCarga = await Carga.create({
            nombreEmpleado: body.nombreEmpleado,
            dniEmpleado: body.dniEmpleado,
            producto,
            litros,
            precioUnitario,
            precioFinal,
            moneda: session.user.moneda,
            fecha: new Date(),
        });

        return NextResponse.json(nuevaCarga);
    } catch (err) {
        console.error("Error registrando carga:", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
