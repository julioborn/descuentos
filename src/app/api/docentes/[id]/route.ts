import { NextRequest, NextResponse } from 'next/server'
import { connectMongoDB } from '@/lib/mongodb'
import Docente from '@/models/Docente'

export async function GET(req: NextRequest) {
    await connectMongoDB()
    const { searchParams } = new URL(req.url)
    const empleadoId = searchParams.get('empleadoId')

    if (!empleadoId) {
        return NextResponse.json({ error: 'Falta empleadoId' }, { status: 400 })
    }

    const docente = await Docente.findOne({ empleadoId })
    if (!docente) {
        return NextResponse.json(null, { status: 200 })
    }

    return NextResponse.json(docente)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    await connectMongoDB()

    const { id } = params
    const { centrosEducativos } = await req.json()

    try {
        console.log('🔧 Recibido PATCH para docente:', id)
        console.log('📚 Nuevos centros recibidos:', centrosEducativos)

        const docenteActual = await Docente.findById(id)
        if (!docenteActual) {
            return NextResponse.json({ error: 'Docente no encontrado' }, { status: 404 })
        }

        const centrosSet = new Set([
            ...docenteActual.centrosEducativos,
            ...(centrosEducativos || []),
        ])
        const centrosFinal = Array.from(centrosSet)

        console.log('🧩 Centros educativos combinados (sin duplicados):', centrosFinal)

        const docenteActualizado = await Docente.findByIdAndUpdate(
            id,
            { centrosEducativos: centrosFinal },
            { new: true }
        )

        console.log('✅ Docente actualizado correctamente')
        return NextResponse.json({ message: 'Actualizado correctamente', docente: docenteActualizado })
    } catch (error) {
        console.error('❌ Error actualizando docente:', error)
        return NextResponse.json({ error: 'Error en servidor' }, { status: 500 })
    }
}
