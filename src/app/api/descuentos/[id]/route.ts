import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Descuento } from "@/models/Descuento";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    await connectMongoDB();
    const { porcentaje, promoActiva, activo } = await req.json();

    const cambios: Record<string, unknown> = {};
    if (porcentaje !== undefined) cambios.porcentaje = porcentaje;
    if (promoActiva !== undefined) cambios.promoActiva = promoActiva;
    if (activo !== undefined) cambios.activo = activo;

    const actualizado = await Descuento.findByIdAndUpdate(
        params.id,
        cambios,
        { new: true }
    );

    if (!actualizado) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(actualizado);
}
