import { connectMongoDB } from '@/lib/mongodb';
import Docente from '@/models/Docente';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        await connectMongoDB();
        const data = await req.json();

        const existente = await Docente.findOne({ empleadoId: data.empleadoId });

        if (existente) {
            // Agregar nuevos centros sin duplicar
            const nuevosCentros = data.centrosEducativos.filter(
                (c: string) => !existente.centrosEducativos.includes(c)
            );
            if (nuevosCentros.length > 0) {
                existente.centrosEducativos.push(...nuevosCentros);
                await existente.save();
            }
            return NextResponse.json(existente);
        }

        const nuevo = await Docente.create(data);
        return NextResponse.json(nuevo);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error al crear docente' }, { status: 500 });
    }
}

export async function GET() {
    try {
        await connectMongoDB();
        const docentes = await Docente.find().populate('empleadoId');
        return NextResponse.json(docentes);
    } catch (err) {
        console.error("Error en GET /api/docentes:", err);
        return NextResponse.json({ error: 'Error al obtener docentes' }, { status: 500 });
    }
}