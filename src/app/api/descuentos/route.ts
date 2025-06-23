// src/app/api/descuentos/route.ts
import { connectMongoDB } from "@/lib/mongodb";
import { Descuento } from "@/models/Descuento";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
    await connectMongoDB();
    const descuentos = await Descuento.find();
    return NextResponse.json(descuentos);
}

export async function PUT(req: NextRequest) {
    await connectMongoDB();
    const body = await req.json(); // [{ empresa: 'IROSSINI', porcentaje: 5 }, ...]

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
    const body = await req.json(); // { empresa: string, porcentaje: number }

    const yaExiste = await Descuento.findOne({ empresa: body.empresa });
    if (yaExiste) {
        return NextResponse.json(
            { error: 'Ya existe un descuento para esta empresa.' },
            { status: 400 }
        );
    }

    const nuevo = await Descuento.create(body);
    return NextResponse.json(nuevo);
}

export async function PATCH(req: NextRequest) {
    await connectMongoDB();
    const body = await req.json(); // [{ _id, porcentaje }]

    const updates = await Promise.all(
        body.map((item: { _id: string; porcentaje: number }) =>
            Descuento.findByIdAndUpdate(item._id, { porcentaje: item.porcentaje }, { new: true })
        )
    );

    return NextResponse.json({ message: "Descuentos actualizados", updates });
}
