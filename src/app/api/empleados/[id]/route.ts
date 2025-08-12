// src/app/api/empleados/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB } from '@/lib/mongodb';
import { Empleado } from '@/models/Empleado';
import mongoose from 'mongoose';
import Docente from '@/models/Docente';

type Params = { params: { id: string } };

// ⬇ GET opcional: devolver un empleado puntual (útil para la pantalla de edición)
export async function GET(_: NextRequest, { params }: Params) {
    await connectMongoDB();
    const emp = await Empleado.findById(params.id);
    if (!emp) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    return NextResponse.json(emp);
}

// ⬇ PATCH: editar (cualquier campo que envíes en el body)
export async function PATCH(req: NextRequest, { params }: Params) {
    await connectMongoDB();
    const data = await req.json();
    const actualizado = await Empleado.findByIdAndUpdate(params.id, data, { new: true });
    if (!actualizado) return NextResponse.json({ error: 'Empleado no encontrado' }, { status: 404 });
    return NextResponse.json(actualizado);
}

// ⬇ DELETE: eliminar
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    await connectMongoDB();
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            await Docente.deleteMany({ empleadoId: params.id }).session(session);
            await Empleado.findByIdAndDelete(params.id).session(session);
        });

        return NextResponse.json({ ok: true });
    } catch (e) {
        console.error("Error borrando empleado/docente:", e);
        return NextResponse.json({ error: "No se pudo eliminar" }, { status: 500 });
    } finally {
        await session.endSession();
    }
}
