// src/app/api/precios/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Precio } from "@/models/Precio";

export async function GET(req: NextRequest) {
    await connectMongoDB();

    const moneda = req.nextUrl.searchParams.get("moneda");

    const precios = moneda
        ? await Precio.find({ moneda })
        : await Precio.find();

    return NextResponse.json(precios);
}

export async function PUT(req: NextRequest) {
    await connectMongoDB();
    const body = await req.json();

    const updates = await Promise.all(
        body.map(async (item: { producto: string; precio: number }) => {
            return Precio.findOneAndUpdate(
                { producto: item.producto },
                { precio: item.precio },
                { upsert: true, new: true }
            );
        })
    );

    return NextResponse.json({ message: "Precios actualizados", updates });
}
