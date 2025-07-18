// src/app/api/cargas/route.ts
import { authOptions } from "@/lib/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import { Carga } from "@/models/Carga";
import { Descuento } from "@/models/Descuento";
import { Precio } from "@/models/Precio";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    await connectMongoDB();

    const match: any = {};
    if (session?.user.role === 'admin_arg') match.moneda = 'ARS';
    if (session?.user.role === 'admin_py') match.moneda = 'Gs';

    const cargas = await Carga.find(match);
    return NextResponse.json(cargas);
}

export async function POST(req: NextRequest) {
    await connectMongoDB();
    const session = await getServerSession(authOptions);
    const body = await req.json();

    if (!session || !session.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { nombreEmpleado, dniEmpleado, producto, litros, empresa } = body;

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
        const precioFinalSinDescuento = litros * precioUnitario;

        // Buscar descuento por empresa
        const descuento = await Descuento.findOne({ empresa });
        const porcentajeDescuento = descuento?.porcentaje || 0;

        // Aplicar descuento si existe
        const precioFinal = precioFinalSinDescuento * (1 - porcentajeDescuento / 100);

        const nuevaCarga = await Carga.create({
            nombreEmpleado,
            dniEmpleado,
            empresa,
            producto,
            litros,
            precioUnitario,
            precioFinal,
            precioFinalSinDescuento,
            porcentajeDescuento,
            moneda: session.user.moneda,
            fecha: new Date(),
            localidad: session.user.localidad, // ✅ agregamos la localidad del playero
        });

        return NextResponse.json(nuevaCarga);
    } catch (err) {
        console.error("Error registrando carga:", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
