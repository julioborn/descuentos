'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

type Policia = {
    nombre: string
    apellido: string
    dni: string
    telefono: string
    localidad: string
    qrUrl: string
}

export default function ImportarPolicias() {
    const [policias, setPolicias] = useState<Policia[]>([])
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

        const lista: Policia[] = []

        let cntNuevos = 0
        let cntDuplicadosExcel = 0
        let cntDuplicadosBD = 0
        let cntErrores = 0

        try {
            // 2) Traer empleados existentes UNA vez
            const empleadosExistRes = await fetch('/api/empleados')
            const empleadosExist = await empleadosExistRes.json()

            const empleadoPorDni = new Map<string, any>(
                empleadosExist.map((e: any) => [String(e.dni), e])
            )

            const procesados = new Set<string>()

            // 3) Iterar filas
            for (const fila of filas) {
                const dni = String(fila.DNI || '').trim()
                const nombre = String(fila.NOMBRE || '').trim()
                const apellido = String(fila.APELLIDO || '').trim()

                if (!dni || procesados.has(dni)) {
                    if (dni) cntDuplicadosExcel++
                    continue
                }
                procesados.add(dni)

                const token = crypto.randomUUID()

                try {
                    const existente = empleadoPorDni.get(dni)

                    if (existente) {
                        // ya existe → no mostramos tarjeta
                        cntDuplicadosBD++
                        continue
                    }

                    // crear empleado
                    const empRes = await fetch('/api/empleados', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre,
                            apellido,
                            dni,
                            telefono: String(fila.TELEF_PART ?? ''),
                            localidad: String(fila.LOCALIDAD ?? ''),
                            empresa: 'POLICIA',
                            qrToken: token,
                            pais: 'AR',
                        }),
                    })

                    if (empRes.status === 409) {
                        cntDuplicadosBD++
                        continue
                    }

                    if (!empRes.ok) throw new Error('Error creando empleado')

                    // generar QR
                    const qrUrl = await QRCode.toDataURL(
                        `${window.location.origin}/playero?token=${token}`
                    )

                    lista.push({
                        nombre,
                        apellido,
                        dni,
                        telefono: String(fila.TELEF_PART ?? ''),
                        localidad: String(fila.LOCALIDAD ?? ''),
                        qrUrl,
                    })

                    cntNuevos++
                } catch (err) {
                    cntErrores++
                    console.error('❌ Error procesando DNI', dni, err)
                }
            }
        } catch (err) {
            cntErrores++
            console.error('❌ Error general importación policías', err)
        }

        setPolicias(lista)
        setLoading(false)

        alert(
            [
                'Resumen importación Policías',
                '────────────────────────',
                `🆕 Nuevos: ${cntNuevos}`,
                `⏩ Duplicados en Excel: ${cntDuplicadosExcel}`,
                `⚠️ Ya existentes en BD: ${cntDuplicadosBD}`,
                `❌ Errores: ${cntErrores}`,
            ].join('\n')
        )
    }

    /* ─────────────── Descargas ─────────────── */

    const generarTarjeta = async (idx: number) => {
        const nodo = document.getElementById(`tarjeta-policia-${idx}`)
        if (!nodo) return { blob: null, nombreArchivo: '' }

        const boton = nodo.querySelector('button') as HTMLElement
        if (boton) boton.style.display = 'none'

        const canvas = await html2canvas(nodo as HTMLElement, { scale: 2 })

        if (boton) boton.style.display = ''

        const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, 'image/png', 1)
        )

        return {
            blob,
            nombreArchivo: `qr-${policias[idx].dni}.png`,
        }
    }

    const descargarTarjeta = async (idx: number) => {
        const { blob, nombreArchivo } = await generarTarjeta(idx)
        if (blob) saveAs(blob, nombreArchivo)
    }

    const descargarTodas = async () => {
        if (!policias.length) return

        setLoading(true)
        const zip = new JSZip()

        for (let i = 0; i < policias.length; i++) {
            const { blob, nombreArchivo } = await generarTarjeta(i)
            if (blob) zip.file(nombreArchivo, blob)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, 'tarjetas-policias.zip')
        setLoading(false)
    }

    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">
                Carga Masiva de Policías
            </h1>

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

            {policias.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-8 block bg-green-700 hover:bg-green-800 px-6 py-3 rounded font-semibold"
                >
                    Descargar TODAS en ZIP
                </button>
            )}

            <div className="flex flex-wrap gap-6 justify-center">
                {policias.map((p, idx) => (
                    <div
                        key={idx}
                        id={`tarjeta-policia-${idx}`}
                        className="bg-white text-black p-4 rounded shadow-lg w-[280px] space-y-3"
                    >
                        <div className="flex justify-center">
                            <img src="/idescuentos.png" alt="Logo" className="h-16" />
                        </div>

                        <div className="flex justify-center">
                            <img src={p.qrUrl} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <div className="text-center text-sm">
                            <strong>{p.nombre} {p.apellido}</strong>
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