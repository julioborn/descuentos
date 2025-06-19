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
            return NextResponse.json({ error: "No encontrado" }, { status: 404 });
        }
        return NextResponse.json(empleado);
    } catch (err) {
        return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
    }
}
