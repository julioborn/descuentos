// src/app/api/productos/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Producto } from "@/models/Producto";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    await connectMongoDB();

    const { searchParams } = new URL(req.url);
    const moneda = searchParams.get("moneda");

    const productos = moneda
        ? await Producto.find({ moneda })
        : await Producto.find();

    return NextResponse.json(productos);
}

export async function POST(req: Request) {
    await connectMongoDB();
    const { nombre, precio, moneda } = await req.json();

    const nuevo = await Producto.create({ nombre, precio, moneda });
    return NextResponse.json(nuevo, { status: 201 });
}
