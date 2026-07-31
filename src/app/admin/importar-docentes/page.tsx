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

type Empleado = {
    _id: string
    nombre: string
    apellido: string
    dni: string
    telefono: string
    empresa: string
    localidad: string
    qrToken: string
    pais?: string
}

type DocenteExistenteResponse = {
    _id?: string
    empleadoId?: string
    centrosEducativos?: string[]
} | null

export default function ImportarDocentes() {
    const [docentes, setDocentes] = useState<Docente[]>([])
    const [loading, setLoading] = useState(false)
    const [modo, setModo] = useState<'excel' | 'manual'>('excel')

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        localidad: '',
        centroEducativo: '',
    })

    const onlyDigits = (value: string) => value.replace(/\D/g, '')

    const normalizarCentro = (c: string) =>
        String(c)
            .trim()
            .toUpperCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }))
    }

    /* ─────────────── EXCEL ─────────────── */

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)

        const lista: Docente[] = []

        let cntNuevosEmpleados = 0
        let cntExistSinCambios = 0
        let cntExistActualizados = 0
        let cntDuplicadosExcel = 0
        let cntDuplicadosBDParalelo = 0
        let cntErrores = 0

        const listadoNuevos: { nombre: string; apellido: string; dni: string }[] = []
        const listadoExistActualizados: { nombre: string; apellido: string; dni: string; agregados: string }[] = []
        const listadoExistSinCambios: { nombre: string; apellido: string; dni: string }[] = []
        const listadoDupExcel: { nombre: string; apellido: string; dni: string }[] = []
        const listadoDupBDParalelo: { nombre: string; apellido: string; dni: string }[] = []
        const listadoErrores: { nombre?: string; apellido?: string; dni?: string; error: string }[] = []

        try {
            const data = await file.arrayBuffer()
            const wb = XLSX.read(data)
            const hoja = wb.Sheets[wb.SheetNames[0]]
            const filas = XLSX.utils.sheet_to_json<Record<string, any>>(hoja, { defval: '' })

            const empleadosExistRes = await fetch('/api/empleados')
            const empleadosExist: Empleado[] = await empleadosExistRes.json()

            const empleadoPorDni = new Map<string, Empleado>(
                empleadosExist.map((emp) => [String(emp.dni), emp])
            )

            const procesados = new Set<string>()

            for (const fila of filas) {
                const dni = String(fila.dni || fila.DNI || '').trim()
                const nombreFila = String(fila.nombre || fila.NOMBRE || '').trim().toUpperCase()
                const apellidoFila = String(fila.apellido || fila.APELLIDO || '').trim().toUpperCase()
                const telefonoFila = String(fila.telefono || fila.TELEFONO || '').trim()
                const localidadFila = String(fila.localidad || fila.LOCALIDAD || '').trim()
                const empresaFila = String(fila.empresa || fila.EMPRESA || 'DOCENTES').trim().toUpperCase()

                if (!dni || procesados.has(dni)) {
                    if (dni) {
                        cntDuplicadosExcel++
                        listadoDupExcel.push({
                            nombre: nombreFila,
                            apellido: apellidoFila,
                            dni,
                        })
                    }
                    continue
                }

                procesados.add(dni)

                const centrosEntradaOriginal: string[] = String(
                    fila.centroEducativo || fila.CENTROEDUCATIVO || fila.centro_educativo || ''
                )
                    .split(',')
                    .map((c) => c.trim())
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
                        let prevCentrosNorm: string[] = []

                        try {
                            const docRes = await fetch(`/api/docentes?empleadoId=${existente._id}`)
                            if (docRes.ok) {
                                const docData: DocenteExistenteResponse = await docRes.json()
                                if (docData && Array.isArray(docData.centrosEducativos)) {
                                    prevCentrosNorm = docData.centrosEducativos.map(normalizarCentro)
                                }
                            }
                        } catch (err) {
                            console.warn(`No pude leer docente actual para comparar (DNI ${dni})`, err)
                        }

                        const nuevosCentrosNorm = centrosEntradaNorm.filter(
                            (c) => !prevCentrosNorm.includes(c)
                        )

                        if (nuevosCentrosNorm.length === 0) {
                            cntExistSinCambios++
                            listadoExistSinCambios.push({
                                nombre: nombreFila || existente.nombre,
                                apellido: apellidoFila || existente.apellido,
                                dni,
                            })
                        } else {
                            const nuevosCentrosOriginal = centrosEntradaOriginal.filter((c) =>
                                nuevosCentrosNorm.includes(normalizarCentro(c))
                            )

                            const upsertDocente = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: existente._id,
                                    centrosEducativos: nuevosCentrosOriginal,
                                }),
                            })

                            if (!upsertDocente.ok) {
                                throw new Error('Error creando/actualizando docente')
                            }

                            cntExistActualizados++
                            listadoExistActualizados.push({
                                nombre: nombreFila || existente.nombre,
                                apellido: apellidoFila || existente.apellido,
                                dni,
                                agregados: nuevosCentrosOriginal.join(', '),
                            })
                        }

                        qrUrl = await QRCode.toDataURL(
                            `${window.location.origin}/playero?token=${existente.qrToken}`
                        )

                        mostrarTarjeta = false
                    } else {
                        const empRes = await fetch('/api/empleados', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                nombre: nombreFila,
                                apellido: apellidoFila,
                                dni,
                                telefono: telefonoFila,
                                empresa: empresaFila || 'DOCENTES',
                                localidad: localidadFila,
                                qrToken: token,
                                pais: 'AR',
                            }),
                        })

                        if (empRes.status === 409) {
                            cntDuplicadosBDParalelo++
                            listadoDupBDParalelo.push({
                                nombre: nombreFila,
                                apellido: apellidoFila,
                                dni,
                            })

                            const ya = empleadoPorDni.get(dni)
                            if (!ya) {
                                throw new Error('Empleado duplicado pero no encontrado en cache')
                            }

                            const upsertDocente = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: ya._id,
                                    centrosEducativos: Array.from(new Set(centrosEntradaOriginal)),
                                }),
                            })

                            if (!upsertDocente.ok) {
                                throw new Error('Error creando/actualizando docente')
                            }

                            qrUrl = await QRCode.toDataURL(
                                `${window.location.origin}/playero?token=${ya.qrToken}`
                            )

                            mostrarTarjeta = false
                        } else {
                            if (!empRes.ok) {
                                throw new Error('Error creando empleado')
                            }

                            const empleadoCreado: Empleado = await empRes.json()
                            empleadoPorDni.set(dni, empleadoCreado)

                            cntNuevosEmpleados++
                            listadoNuevos.push({
                                nombre: nombreFila,
                                apellido: apellidoFila,
                                dni,
                            })

                            const docenteRes = await fetch('/api/docentes', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    empleadoId: empleadoCreado._id,
                                    centrosEducativos: Array.from(new Set(centrosEntradaOriginal)),
                                }),
                            })

                            if (!docenteRes.ok) {
                                throw new Error('Error creando docente')
                            }

                            qrUrl = await QRCode.toDataURL(
                                `${window.location.origin}/playero?token=${token}`
                            )

                            mostrarTarjeta = true

                            if (mostrarTarjeta) {
                                lista.push({
                                    nombre: empleadoCreado.nombre,
                                    apellido: empleadoCreado.apellido,
                                    dni,
                                    telefono: empleadoCreado.telefono,
                                    empresa: empleadoCreado.empresa,
                                    localidad: empleadoCreado.localidad,
                                    centrosEducativos: centrosEntradaOriginal,
                                    qrUrl,
                                })
                            }
                        }
                    }
                } catch (err: unknown) {
                    cntErrores++
                    listadoErrores.push({
                        nombre: nombreFila,
                        apellido: apellidoFila,
                        dni,
                        error: err instanceof Error ? err.message : String(err),
                    })
                    console.error(`❌ Error al procesar DNI ${dni}:`, err)
                }
            }
        } catch (e: unknown) {
            cntErrores++
            listadoErrores.push({
                error: e instanceof Error ? e.message : String(e),
            })
            console.error('❌ Error preparando importación:', e)
        }

        setDocentes(lista)
        setLoading(false)

        console.groupCollapsed('📊 Resumen importación Docentes')
        console.log('🆕 Empleados nuevos:', cntNuevosEmpleados)
        if (listadoNuevos.length) console.table(listadoNuevos)

        console.log('➕ Existentes actualizados (centros agregados):', cntExistActualizados)
        if (listadoExistActualizados.length) console.table(listadoExistActualizados)

        console.log('↺ Existentes sin cambios:', cntExistSinCambios)
        if (listadoExistSinCambios.length) console.table(listadoExistSinCambios)

        console.log('⏩ Duplicados en el Excel salteados:', cntDuplicadosExcel)
        if (listadoDupExcel.length) console.table(listadoDupExcel)

        console.log('⚠️ Duplicados en BD (paralelo):', cntDuplicadosBDParalelo)
        if (listadoDupBDParalelo.length) console.table(listadoDupBDParalelo)

        console.log('❌ Errores:', cntErrores)
        if (listadoErrores.length) console.table(listadoErrores)
        console.groupEnd()

        alert(
            [
                'Resumen importación Docentes',
                '────────────────────────',
                `🆕 Empleados nuevos: ${cntNuevosEmpleados}`,
                `➕ Existentes actualizados (centros agregados): ${cntExistActualizados}`,
                `↺ Existentes sin cambios: ${cntExistSinCambios}`,
                `⏩ Duplicados en el Excel salteados: ${cntDuplicadosExcel}`,
                `⚠️ Duplicados en BD (paralelo): ${cntDuplicadosBDParalelo}`,
                `❌ Errores: ${cntErrores}`,
            ].join('\n')
        )
    }

    /* ─────────────── DESCARGAS ─────────────── */

    const generarTarjeta = async (idx: number) => {
        const nodo = document.getElementById(`tarjeta-docente-${idx}`)
        if (!nodo) return { blob: null, nombreArchivo: '' }

        const boton = nodo.querySelector('button') as HTMLElement | null
        if (boton) boton.style.display = 'none'

        const canvas = await html2canvas(nodo as HTMLElement, { scale: 2 })

        if (boton) boton.style.display = ''

        const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, 'image/png', 1)
        )

        const docente = docentes[idx]
        return {
            blob,
            nombreArchivo: `qr-${docente.dni}.png`,
        }
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

    /* ─────────────── MANUAL ─────────────── */

    const crearDocente = async () => {
        const dni = onlyDigits(form.dni)

        if (!dni || !form.nombre || !form.apellido) {
            alert('Completar datos')
            return
        }

        setLoading(true)

        try {
            let empleado: Empleado | undefined
            let esNuevo = false

            const all: Empleado[] = await fetch('/api/empleados').then((r) => r.json())
            const existente = all.find((e) => String(e.dni) === dni)

            if (existente) {
                empleado = existente
            } else {
                esNuevo = true
                const token = crypto.randomUUID()

                const empRes = await fetch('/api/empleados', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: form.nombre.toUpperCase().trim(),
                        apellido: form.apellido.toUpperCase().trim(),
                        dni,
                        telefono: form.telefono.trim(),
                        empresa: 'DOCENTES',
                        localidad: form.localidad.trim(),
                        qrToken: token,
                        pais: 'AR',
                    }),
                })

                if (!empRes.ok) {
                    throw new Error('Error creando empleado')
                }

                empleado = await empRes.json()
            }

            if (!empleado?._id) {
                throw new Error('No se pudo obtener el empleado')
            }

            const centro = form.centroEducativo.trim()

            const docenteRes = await fetch('/api/docentes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    empleadoId: empleado._id,
                    centrosEducativos: centro ? [centro] : [],
                }),
            })

            if (!docenteRes.ok) {
                throw new Error('Error creando/actualizando docente')
            }

            if (!esNuevo) {
                alert('Docente actualizado correctamente (ya existía)')
                setForm({
                    nombre: '',
                    apellido: '',
                    dni: '',
                    telefono: '',
                    localidad: '',
                    centroEducativo: '',
                })
                setLoading(false)
                return
            }

            const qrUrl = await QRCode.toDataURL(
                `${window.location.origin}/playero?token=${empleado.qrToken}`
            )

            setDocentes((prev) => [
                ...prev,
                {
                    nombre: empleado!.nombre,
                    apellido: empleado!.apellido,
                    dni,
                    telefono: empleado!.telefono,
                    empresa: empleado!.empresa,
                    localidad: empleado!.localidad,
                    centrosEducativos: centro ? [centro] : [],
                    qrUrl,
                },
            ])

            setForm({
                nombre: '',
                apellido: '',
                dni: '',
                telefono: '',
                localidad: '',
                centroEducativo: '',
            })
        } catch (err) {
            console.error(err)
            alert('Error creando docente')
        }

        setLoading(false)
    }

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                        Herramientas
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                        Importar Docentes
                    </h1>
                </div>

                <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setModo('excel')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${modo === 'excel' ? 'bg-[#801818] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                        >
                            Excel
                        </button>
                        <button
                            onClick={() => setModo('manual')}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${modo === 'manual' ? 'bg-[#801818] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                        >
                            Manual
                        </button>
                    </div>

                    {modo === 'excel' && (
                        <div>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Archivo Excel
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFile}
                                className="block w-full text-sm text-stone-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#801818]/10 file:text-[#801818] hover:file:bg-[#801818]/20 cursor-pointer"
                            />
                        </div>
                    )}

                    {modo === 'manual' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Nombre</label>
                                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Apellido</label>
                                <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">DNI</label>
                                <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" inputMode="numeric" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Teléfono</label>
                                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" inputMode="numeric" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Localidad</label>
                                <input name="localidad" value={form.localidad} onChange={handleChange} placeholder="Localidad" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Centro educativo</label>
                                <input name="centroEducativo" value={form.centroEducativo} onChange={handleChange} placeholder="Centro Educativo" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>

                            <button
                                onClick={crearDocente}
                                className="sm:col-span-2 bg-[#801818] hover:bg-red-700 text-white py-2 rounded-xl text-sm font-semibold transition shadow-sm"
                            >
                                Agregar
                            </button>
                        </div>
                    )}
                </section>

                {loading && (
                    <div className="flex items-center gap-2 text-sm text-stone-500">
                        <span className="h-2 w-2 rounded-full bg-[#801818] animate-pulse" />
                        Procesando...
                    </div>
                )}

                {docentes.length > 0 && (
                    <button
                        onClick={descargarTodas}
                        className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-white text-sm font-semibold shadow-sm transition"
                    >
                        Descargar TODAS en ZIP
                    </button>
                )}

                <div className="flex flex-wrap gap-6">
                    {docentes.map((d, idx) => (
                        <div
                            key={`${d.dni}-${idx}`}
                            id={`tarjeta-docente-${idx}`}
                            className="bg-white text-stone-900 border border-stone-200 p-4 rounded-2xl shadow-sm w-[280px] space-y-3"
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
                                className="mt-2 w-full bg-[#801818] hover:bg-red-700 text-white py-2 rounded-xl text-sm font-semibold transition shadow-sm"
                            >
                                Descargar Tarjeta
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}