// src/app/api/cargas/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Carga } from "@/models/Carga";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const cargas = await Carga.find().sort({ fecha: -1 });
    return NextResponse.json(cargas);
}

export async function POST(req: NextRequest) {
    await connectMongoDB();

    try {
        const body = await req.json();
        const nuevaCarga = await Carga.create({
            nombreEmpleado: body.nombreEmpleado,
            dniEmpleado: body.dniEmpleado,
            producto: body.producto,
            litros: body.litros,
            precioFinal: body.precioFinal,
            fecha: body.fecha || new Date().toISOString(),
        });

        return NextResponse.json(nuevaCarga);
    } catch (error) {
        console.error("Error al registrar carga:", error);
        return NextResponse.json({ error: "Error al registrar carga" }, { status: 500 });
    }
}
