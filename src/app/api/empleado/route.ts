// src/app/api/empleado/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Empleado } from "@/models/Empleado";
import { connectMongoDB } from "@/lib/mongodb";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const token = req.nextUrl.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Token requerido" }, { status: 400 });

    const empleado = await Empleado.findOne({ qrToken: token, activo: true });
    if (!empleado) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });

    return NextResponse.json(empleado);
}
