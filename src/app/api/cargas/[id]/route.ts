import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Carga } from '@/models/Carga';

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
    await connectMongoDB();
    const data = await req.json();

    const actualizado = await Carga.findByIdAndUpdate(params.id, data, { new: true });
    if (!actualizado) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    return NextResponse.json(actualizado);
}

export async function DELETE(_: NextRequest, { params }: Params) {
    await connectMongoDB();
    const eliminado = await Carga.findByIdAndDelete(params.id);
    if (!eliminado) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    return NextResponse.json({ ok: true });
}

export async function GET(_: NextRequest, { params }: Params) {
    await connectMongoDB();
    const carga = await Carga.findById(params.id);
    if (!carga) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

    return NextResponse.json(carga);
}
