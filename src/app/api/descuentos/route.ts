// src/app/api/descuentos/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Descuento } from "@/models/Descuento";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    await connectMongoDB();
    const pais = req.nextUrl.searchParams.get('pais');

    const query = pais ? { pais } : {};
    const descuentos = await Descuento.find(query);
    return NextResponse.json(descuentos);
}

export async function PUT(req: NextRequest) {
    await connectMongoDB();
    const body = await req.json(); 

    const updates = await Promise.all(
        body.map((item: { empresa: string; porcentaje: number }) =>
            Descuento.findOneAndUpdate(
                { empresa: item.empresa },
                { porcentaje: item.porcentaje },
                { upsert: true, new: true }
            )
        )
    );

    return NextResponse.json({ message: "Descuentos actualizados", updates });
}

export async function POST(req: NextRequest) {
    await connectMongoDB();
    const body = await req.json(); // { empresa, porcentaje, pais }

    const yaExiste = await Descuento.findOne({ empresa: body.empresa });
    if (yaExiste) {
        return NextResponse.json(
            { error: 'Ya existe un descuento para esta empresa.' },
            { status: 400 }
        );
    }

    const nuevo = await Descuento.create({
        empresa: body.empresa,
        porcentaje: body.porcentaje,
        pais: body.pais,
    });

    return NextResponse.json(nuevo);
}
