import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Descuento } from "@/models/Descuento";

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    await connectMongoDB();
    const { porcentaje } = await req.json();

    const actualizado = await Descuento.findByIdAndUpdate(
        params.id,
        { porcentaje },
        { new: true }
    );

    if (!actualizado) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(actualizado);
}
