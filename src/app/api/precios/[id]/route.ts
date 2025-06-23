import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Precio } from '@/models/Precio';
import { Types } from 'mongoose';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    await connectMongoDB();
    const id = params.id;

    if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const updated = await Precio.findByIdAndUpdate(
        id,
        { $set: body },
        { new: true }
    );

    if (!updated) {
        return NextResponse.json({ message: "Precio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(updated);
}
