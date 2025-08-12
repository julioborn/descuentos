import { connectMongoDB } from '@/lib/mongodb';
import Docente from '@/models/Docente';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        await connectMongoDB();
        const data = await req.json();

        // Normalización defensiva (en caso de que el front no lo haga)
        const centros = (data.centrosEducativos || [])
            .map((c: string) => String(c).trim().toUpperCase())
            .filter(Boolean);

        const actualizado = await Docente.findOneAndUpdate(
            { empleadoId: data.empleadoId },
            { $addToSet: { centrosEducativos: { $each: centros } } },
            { new: true, upsert: true }
        );

        return NextResponse.json(actualizado);
    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: 'Error al crear/actualizar docente' }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        await connectMongoDB();

        const empleadoId = req.nextUrl.searchParams.get('empleadoId');
        if (empleadoId) {
            const docente = await Docente.findOne({ empleadoId });
            return NextResponse.json(docente); // puede ser null
        }

        // sin filtro: lista completa
        const docentes = await Docente.find().populate('empleadoId');
        return NextResponse.json(docentes);
    } catch (err) {
        console.error("Error en GET /api/docentes:", err);
        return NextResponse.json({ error: 'Error al obtener docentes' }, { status: 500 });
    }
}