// src/app/api/productos/[id]/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Producto } from "@/models/Producto";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();
    const { precio } = await req.json();
    const actualizado = await Producto.findByIdAndUpdate(params.id, { precio }, { new: true });
    return NextResponse.json(actualizado);
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
    await connectMongoDB();
    await Producto.findByIdAndDelete(params.id);
    return NextResponse.json({ ok: true });
}
