'use client'

import { useState } from 'react'
import * as XLSX from 'xlsx'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

type Municipal = {
    nombre: string
    apellido: string
    dni: string
    telefono: string
    localidad: string
    qrUrl: string
}

export default function ImportarMunicipales() {
    const [municipales, setMunicipales] = useState<Municipal[]>([])
    const [loading, setLoading] = useState(false)

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)

        // ─────────────────── 1) Leer Excel ───────────────────
        const data = await file.arrayBuffer()
        const wb = XLSX.read(data)
        const hoja = wb.Sheets[wb.SheetNames[0]]
        const filas = XLSX.utils.sheet_to_json<any>(hoja, { defval: '' })

        const lista: Municipal[] = []

        let cntNuevos = 0
        let cntDuplicadosExcel = 0
        let cntDuplicadosBD = 0
        let cntErrores = 0

        // 🔎 Auditoría
        const agregados: any[] = []
        const existentesBD: any[] = []
        const duplicadosExcel: any[] = []

        try {
            // ───────────── 2) Traer empleados existentes UNA vez ─────────────
            const empleadosExistRes = await fetch('/api/empleados')
            const empleadosExist = await empleadosExistRes.json()

            const empleadoPorDni = new Map<string, any>(
                empleadosExist.map((e: any) => [String(e.dni), e])
            )

            const procesados = new Set<string>()

            // ───────────── 3) Iterar filas ─────────────
            for (const fila of filas) {
                const dni = String(fila.DNI || '').trim()
                const nombre = String(fila.NOMBRE || '').trim()
                const apellido = String(fila.APELLIDO || '').trim()
                const localidad = String(fila.LOCALIDAD || '').trim()
                const telefono = String(fila.TELEFONO || '').trim()

                // duplicados dentro del Excel
                if (!dni || procesados.has(dni)) {
                    if (dni) {
                        cntDuplicadosExcel++
                        duplicadosExcel.push({
                            dni,
                            nombre,
                            apellido,
                            localidad,
                            telefono,
                        })
                    }
                    continue
                }

                procesados.add(dni)
                const token = crypto.randomUUID()

                try {
                    const existente = empleadoPorDni.get(dni)

                    // ya existe en BD (docente u otro)
                    if (existente) {
                        cntDuplicadosBD++
                        existentesBD.push({
                            dni,
                            nombreExcel: `${nombre} ${apellido}`,
                            nombreBD: `${existente.nombre} ${existente.apellido}`,
                            empresaBD: existente.empresa,
                        })
                        continue
                    }

                    // crear empleado municipal
                    const empRes = await fetch('/api/empleados', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nombre,
                            apellido,
                            dni,
                            telefono,
                            localidad,
                            empresa: 'MUNICIPALIDAD',
                            qrToken: token,
                            pais: 'AR',
                        }),
                    })

                    if (empRes.status === 409) {
                        cntDuplicadosBD++
                        continue
                    }

                    if (!empRes.ok) throw new Error('Error creando empleado municipal')

                    // generar QR
                    const qrUrl = await QRCode.toDataURL(
                        `${window.location.origin}/playero?token=${token}`
                    )

                    lista.push({
                        nombre,
                        apellido,
                        dni,
                        telefono,
                        localidad,
                        qrUrl,
                    })

                    agregados.push({
                        dni,
                        nombre,
                        apellido,
                        localidad,
                        telefono,
                    })

                    cntNuevos++
                } catch (err) {
                    cntErrores++
                    console.error('❌ Error procesando DNI', dni, err)
                }
            }
        } catch (err) {
            cntErrores++
            console.error('❌ Error general importación municipales', err)
        }

        setMunicipales(lista)
        setLoading(false)

        // ─────────────── Console tables ───────────────
        console.group('📊 IMPORT MUNICIPALES – DETALLE')

        if (agregados.length) {
            console.log('🟢 AGREGADOS')
            console.table(agregados)
        }

        if (existentesBD.length) {
            console.log('🟡 YA EXISTÍAN EN BD')
            console.table(existentesBD)
        }

        if (duplicadosExcel.length) {
            console.log('🔵 DUPLICADOS EN EXCEL')
            console.table(duplicadosExcel)
        }

        console.groupEnd()

        alert(
            [
                'Resumen importación Municipales',
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
        const nodo = document.getElementById(`tarjeta-municipal-${idx}`)
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
            nombreArchivo: `qr-${municipales[idx].dni}.png`,
        }
    }

    const descargarTarjeta = async (idx: number) => {
        const { blob, nombreArchivo } = await generarTarjeta(idx)
        if (blob) saveAs(blob, nombreArchivo)
    }

    const descargarTodas = async () => {
        if (!municipales.length) return

        setLoading(true)
        const zip = new JSZip()

        for (let i = 0; i < municipales.length; i++) {
            const { blob, nombreArchivo } = await generarTarjeta(i)
            if (blob) zip.file(nombreArchivo, blob)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, 'tarjetas-municipales.zip')
        setLoading(false)
    }

    return (
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-6 text-center">
                Carga Masiva de Empleados Municipales
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

            {municipales.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-8 block bg-green-700 hover:bg-green-800 px-6 py-3 rounded font-semibold"
                >
                    Descargar TODAS en ZIP
                </button>
            )}

            <div className="flex flex-wrap gap-6 justify-center">
                {municipales.map((m, idx) => (
                    <div
                        key={idx}
                        id={`tarjeta-municipal-${idx}`}
                        className="bg-white text-black p-4 rounded shadow-lg w-[280px] space-y-3"
                    >
                        <div className="flex justify-center">
                            <img src="/idescuentos.png" alt="Logo" className="h-16" />
                        </div>

                        <div className="flex justify-center">
                            <img src={m.qrUrl} alt="QR Code" className="w-48 h-48" />
                        </div>

                        <div className="text-center text-sm">
                            <strong>{m.nombre} {m.apellido}</strong>
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