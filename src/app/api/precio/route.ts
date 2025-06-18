// src/app/api/precio/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Precio } from "@/models/Precio";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const producto = req.nextUrl.searchParams.get("producto");
    if (!producto) return NextResponse.json({ error: "Producto requerido" }, { status: 400 });

    const precio = await Precio.findOne({ producto });
    if (!precio) return NextResponse.json({ error: "No hay precio cargado" }, { status: 404 });

    return NextResponse.json(precio);
}
