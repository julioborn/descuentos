'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

type Docente = {
    nombre: string
    apellido: string
    dni: string
    telefono: string
    empresa: string
    localidad: string
    centrosEducativos: string[]
    qrUrl: string
}

export default function ImportarDocentes() {
    const [docentes, setDocentes] = useState<Docente[]>([])
    const [loading, setLoading] = useState(false)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)

        // 1) Leer Excel
        const data = await file.arrayBuffer()
        const wb = XLSX.read(data)
        const hoja = wb.Sheets[wb.SheetNames[0]]
        const filas = XLSX.utils.sheet_to_json<any>(hoja, { defval: '' })

        const lista: Docente[] = []

        // helpers
        const normalizarCentro = (c: string) =>
            String(c).trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

        // contadores para resumen
        let cntNuevosEmpleados = 0
        let cntExistSinCambios = 0
        let cntExistActualizados = 0
        let cntDuplicadosExcel = 0
        let cntDuplicadosBDParalelo = 0
        let cntErrores = 0

        try {
            // 2) Traer empleados existentes UNA vez
            const empleadosExistRes = await fetch('/api/empleados')
            const empleadosExist = await empleadosExistRes.json()

            // Map por DNI para lookup rápido
            const empleadoPorDni = new Map<string, any>(
                empleadosExist.map((e: any) => [String(e.dni), e])
            )

            // Para evitar procesar el mismo DNI dos veces en el mismo Excel
            const procesados = new Set<string>()

            // 3) Iterar filas del Excel
            for (const fila of filas) {
                const dni = String(fila.dni || '').trim()
                if (!dni || procesados.has(dni)) {
                    console.log(`⏩ DNI ${dni || '(vacío)'} salteado (vacío o duplicado en el Excel)`)
                    if (dni) cntDuplicadosExcel++
                    continue
                }
                procesados.add(dni)

                // Normalizar centros para comparar
                const centrosEntradaOriginal: string[] = String(fila.centroEducativo || '')
                    .split(',')
                    .map((c: string) => c.trim())
                    .filter(Boolean)

                const centrosEntradaNorm = Array.from(
                    new Set(centrosEntradaOriginal.map(normalizarCentro))
                )

                const token = crypto.randomUUID()

                try {
                    let mostrarTarjeta = false
                    let qrUrl = ''
                    const existente = empleadoPorDni.get(dni)

                    if (existente) {
                        const nombreCompleto =
                            `${fila?.nombre ?? existente?.nombre ?? ''} ${fila?.apellido ?? existente?.apellido ?? ''}`.trim()

                        // 1) Leer docente actual (si existe) para comparar
                        let prevCentrosNorm: string[] = []
                        try {
                            const docRes = await fetch(`/api/docentes?empleadoId=${existente._id}`)
                            if (docRes.ok) {
                                const docData = await docRes.json() // puede ser null
                                if (docData && Array.isArray(docData.centrosEducativos)) {
                                    prevCentrosNorm = docData.centrosEducativos.map(normalizarCentro)
                                }
                            }
                        } catch (e) {
                            console.warn(`(LOG) No pude leer docente actual para comparar (DNI ${dni})`, e)
                        }

                        // 2) Diferencia de centros (normalizado)
                        const nuevosCentrosNorm = centrosEntradaNorm.filter(
                            (c) => !prevCentrosNorm.includes(c)
                        )

                        if (nuevosCentrosNorm.length === 0) {
                            console.log(
                                `↺ Docente EXISTENTE sin cambios: ${nombreCompleto} (DNI ${dni}) — ya estaban: ${centrosEntradaOriginal.join(', ') || '(sin centros)'}`
                            )
                            cntExistSinCambios++
                        } else {
                            // Volvemos a los nombres originales para guardar (el backend igual deduplica)
                            const nuevosCentrosOriginal = centrosEntradaOriginal.filter((c) =>
                                nuevosCentrosNorm.includes(normalizarCentro(c))
                            )

                            console.log(
                                `➕ Docente EXISTENTE actualizado: ${nombreCompleto} (DNI ${dni}) — se agregan: ${nuevosCentrosOriginal.join(', ')}`
                            )

                            const upsertDocente = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: existente._id,
                                    centrosEducativos: nuevosCentrosOriginal,
                                }),
                            })
                            if (!upsertDocente.ok) throw new Error('Error creando/actualizando docente')

                            cntExistActualizados++
                        }

                        // 3) QR con token existente (no mostramos tarjeta en existentes)
                        qrUrl = await QRCode.toDataURL(
                            `${window.location.origin}/playero?token=${existente.qrToken}`
                        )
                        mostrarTarjeta = false
                    } else {
                        console.log(
                            `🆕 Creando nuevo empleado: ${fila.nombre} ${fila.apellido} (DNI: ${dni})`
                        )

                        const empRes = await fetch('/api/empleados', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                nombre: fila.nombre,
                                apellido: fila.apellido,
                                dni,
                                telefono: String(fila.telefono ?? ''),
                                empresa: fila.empresa,
                                localidad: fila.localidad,
                                qrToken: token,
                                pais: 'AR',
                            }),
                        })

                        if (empRes.status === 409) {
                            console.warn(`⚠️ Empleado duplicado detectado en paralelo para DNI ${dni}`)
                            cntDuplicadosBDParalelo++
                            const ya = empleadoPorDni.get(dni)
                            if (!ya) throw new Error('Empleado duplicado pero no encontrado en cache')

                            const upsertDocente = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: ya._id,
                                    centrosEducativos: Array.from(new Set(centrosEntradaOriginal)),
                                }),
                            })
                            if (!upsertDocente.ok) throw new Error('Error creando/actualizando docente')

                            qrUrl = await QRCode.toDataURL(
                                `${window.location.origin}/playero?token=${ya.qrToken}`
                            )
                            mostrarTarjeta = false
                        } else {
                            if (!empRes.ok) throw new Error('Error creando empleado')
                            const empleadoCreado = await empRes.json()
                            empleadoPorDni.set(dni, empleadoCreado)

                            console.log(
                                `✅ Empleado creado: ${fila.nombre} ${fila.apellido} (DNI: ${dni})`
                            )
                            cntNuevosEmpleados++

                            const docenteRes = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: empleadoCreado._id,
                                    centrosEducativos: Array.from(new Set(centrosEntradaOriginal)),
                                }),
                            })
                            if (!docenteRes.ok) throw new Error('Error creando docente')

                            console.log(
                                `📚 Docente NUEVO asociado con centros: ${Array.from(
                                    new Set(centrosEntradaOriginal)
                                ).join(', ') || '(sin centros)'}`
                            )

                            qrUrl = await QRCode.toDataURL(
                                `${window.location.origin}/playero?token=${token}`
                            )
                            // Mostrar tarjeta SOLO cuando es empleado nuevo
                            mostrarTarjeta = true
                        }
                    }

                    if (mostrarTarjeta) {
                        lista.push({
                            nombre: fila.nombre,
                            apellido: fila.apellido,
                            dni,
                            telefono: String(fila.telefono ?? ''),
                            empresa: fila.empresa,
                            localidad: fila.localidad,
                            centrosEducativos: centrosEntradaOriginal,
                            qrUrl,
                        })
                    }
                } catch (err) {
                    cntErrores++
                    console.error(`❌ Error al procesar DNI ${dni}:`, err)
                }
            }
        } catch (e) {
            cntErrores++
            console.error('❌ Error preparando importación:', e)
        }

        setDocentes(lista)
        setLoading(false)

        // Resumen
        alert(
            [
                `Resumen importación Docentes`,
                `────────────────────────`,
                `🆕 Empleados nuevos: ${cntNuevosEmpleados}`,
                `➕ Existentes actualizados (centros agregados): ${cntExistActualizados}`,
                `↺ Existentes sin cambios: ${cntExistSinCambios}`,
                `⏩ Duplicados en el Excel salteados: ${cntDuplicadosExcel}`,
                `⚠️ Duplicados en BD (paralelo): ${cntDuplicadosBDParalelo}`,
                `❌ Errores: ${cntErrores}`,
            ].join('\n')
        )
    }

    const generarTarjeta = async (idx: number) => {
        const nodo = document.getElementById(`tarjeta-docente-${idx}`)
        if (!nodo) return { blob: null, nombreArchivo: '' }

        const boton = nodo.querySelector('button') as HTMLElement
        if (boton) boton.style.display = 'none'

        const canvas = await html2canvas(nodo as HTMLElement, { scale: 2 })

        if (boton) boton.style.display = ''

        const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, 'image/png', 1)
        )

        const docente = docentes[idx]
        const nombreArchivo = `qr-${docente.dni}.png`

        return { blob, nombreArchivo }
    }

    const descargarTarjeta = async (idx: number) => {
        const { blob, nombreArchivo } = await generarTarjeta(idx)
        if (blob) saveAs(blob, nombreArchivo)
    }

    const descargarTodas = async () => {
        if (!docentes.length) return

        setLoading(true)
        const zip = new JSZip()

        for (let i = 0; i < docentes.length; i++) {
            const { blob, nombreArchivo } = await generarTarjeta(i)
            if (blob) zip.file(nombreArchivo, blob)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, 'tarjetas-docentes.zip')
        setLoading(false)
    }

    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">Carga Masiva de Docentes</h1>

            <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFile}
                className="mb-6 block mx-auto"
            />

            {loading && (
                <p className="text-center text-lg font-semibold">
                    Procesando, por favor esperá…
                </p>
            )}

            {docentes.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-8 block bg-green-700 hover:bg-green-800 px-6 py-3 rounded font-semibold"
                >
                    Descargar TODAS en ZIP
                </button>
            )}

            <div className="flex flex-wrap gap-6 justify-center">
                {docentes.map((d, idx) => (
                    <div
                        key={idx}
                        id={`tarjeta-docente-${idx}`}
                        className="bg-white text-black p-4 rounded shadow-lg w-[280px] space-y-3 relative"
                    >
                        <div className="flex justify-center">
                            <img src="/idescuentos.png" alt="Logo" className="h-16" />
                        </div>

                        <div className="flex justify-center">
                            <img src={d.qrUrl} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <div className="text-center text-sm">
                            <strong>{d.nombre} {d.apellido}</strong>
                        </div>

                        <button
                            onClick={() => descargarTarjeta(idx)}
                            className="mt-2 w-full bg-blue-700 hover:bg-blue-800 text-white py-2 rounded"
                        >
                            Descargar Tarjeta
                        </button>
                    </div>
                ))}
            </div>
        </main>
    )
}
