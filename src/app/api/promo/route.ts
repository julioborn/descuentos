// src/app/api/promo/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";
import { Descuento } from "@/models/Descuento";
import { NextRequest, NextResponse } from "next/server";

// Endpoint público (sin sesión): info minima para la pagina que se
// muestra al escanear el QR con la camara del telefono, fuera de la app.
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get("token");

    if (!token) {
        return NextResponse.json({ error: "Falta el token" }, { status: 400 });
    }

    await connectMongoDB();

    const empleado = await Empleado.findOne({ qrToken: token, activo: true });

    if (!empleado) {
        return NextResponse.json({ error: "QR no encontrado" }, { status: 404 });
    }

    const descuento = await Descuento.findOne({ empresa: empleado.empresa });

    return NextResponse.json({
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        empresa: empleado.empresa,
        localidad: empleado.localidad,
        porcentaje: descuento?.porcentaje ?? 0,
        promoActiva: descuento?.promoActiva ?? true,
    });
}
