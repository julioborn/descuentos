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
    subcategoria?: string
    qrUrl: string
}

export default function ImportarPolicias() {
    const [policias, setPolicias] = useState<Policia[]>([])
    const [loading, setLoading] = useState(false)
    const [modo, setModo] = useState<'excel' | 'manual'>('excel')

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        dni: '',
        telefono: '',
        localidad: '',
        subcategoria: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value })
    }

    /* ─────────────── EXCEL (TU LÓGICA ORIGINAL) ─────────────── */

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)

        const data = await file.arrayBuffer()
        const wb = XLSX.read(data)
        const hoja = wb.Sheets[wb.SheetNames[0]]
        const filas = XLSX.utils.sheet_to_json<any>(hoja, { defval: '' })

        const lista: Policia[] = []

        const empleadosExistRes = await fetch('/api/empleados')
        const empleadosExist = await empleadosExistRes.json()

        const empleadoPorDni = new Map<string, any>(
            empleadosExist.map((e: any) => [String(e.dni), e])
        )

        const procesados = new Set<string>()

        for (const fila of filas) {
            const dni = String(fila.DNI || '').trim()
            const nombre = String(fila.NOMBRE || '').toUpperCase().trim()
            const apellido = String(fila.APELLIDO || '').toUpperCase().trim()
            const subcategoria = String(fila.SUBCATEGORIA || '').trim()

            if (!dni || procesados.has(dni)) continue
            procesados.add(dni)

            if (empleadoPorDni.has(dni)) continue

            const token = crypto.randomUUID()

            const empRes = await fetch('/api/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre,
                    apellido,
                    dni,
                    telefono: String(fila.TELEFONO ?? ''),
                    localidad: String(fila.LOCALIDAD ?? ''),
                    subcategoria: subcategoria || undefined,
                    empresa: 'POLICIA',
                    qrToken: token,
                    pais: 'AR',
                }),
            })

            if (!empRes.ok) continue

            const qrUrl = await QRCode.toDataURL(
                `${window.location.origin}/playero?token=${token}`
            )

            lista.push({
                nombre,
                apellido,
                dni,
                telefono: String(fila.TELEFONO ?? ''),
                localidad: String(fila.LOCALIDAD ?? ''),
                subcategoria,
                qrUrl,
            })
        }

        setPolicias(lista)
        setLoading(false)
    }

    /* ─────────────── MANUAL (NUEVO) ─────────────── */

    const agregarManual = async () => {
        if (!form.nombre || !form.apellido || !form.dni) {
            alert('Faltan datos obligatorios')
            return
        }

        setLoading(true)

        try {
            const dni = form.dni.trim()

            const resExist = await fetch('/api/empleados')
            const empleados = await resExist.json()

            if (empleados.find((e: any) => String(e.dni) === dni)) {
                alert('DNI ya existe')
                setLoading(false)
                return
            }

            const token = crypto.randomUUID()

            const res = await fetch('/api/empleados', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: form.nombre.toUpperCase(),
                    apellido: form.apellido.toUpperCase(),
                    dni,
                    telefono: form.telefono,
                    localidad: form.localidad,
                    subcategoria: form.subcategoria || undefined,
                    empresa: 'POLICIA',
                    qrToken: token,
                    pais: 'AR',
                }),
            })

            if (!res.ok) throw new Error()

            const qrUrl = await QRCode.toDataURL(
                `${window.location.origin}/playero?token=${token}`
            )

            setPolicias((prev) => [
                ...prev,
                {
                    ...form,
                    nombre: form.nombre.toUpperCase(),
                    apellido: form.apellido.toUpperCase(),
                    qrUrl,
                },
            ])

            setForm({
                nombre: '',
                apellido: '',
                dni: '',
                telefono: '',
                localidad: '',
                subcategoria: '',
            })

        } catch {
            alert('Error creando policía')
        }

        setLoading(false)
    }

    /* ─────────────── DESCARGAS ─────────────── */

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

    const descargarTodas = async () => {
        const zip = new JSZip()

        for (let i = 0; i < policias.length; i++) {
            const { blob, nombreArchivo } = await generarTarjeta(i)
            if (blob) zip.file(nombreArchivo, blob)
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' })
        saveAs(zipBlob, 'tarjetas-policias.zip')
    }

    return (
        <main className="min-h-screen bg-stone-50 text-stone-900">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                        Herramientas
                    </p>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#111827]">
                        Importar Policías
                    </h1>
                </div>

                <section className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm space-y-4">
                    {/* SWITCH */}
                    <div className="flex gap-2">
                        <button onClick={() => setModo('excel')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${modo === 'excel' ? 'bg-[#801818] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                            Excel
                        </button>
                        <button onClick={() => setModo('manual')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${modo === 'manual' ? 'bg-[#801818] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                            Manual
                        </button>
                    </div>

                    {/* EXCEL */}
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

                    {/* MANUAL */}
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
                                <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">Subcategoría</label>
                                <input name="subcategoria" value={form.subcategoria} onChange={handleChange} placeholder="Subcategoría" className="w-full rounded-lg px-3 py-2 text-sm bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 focus:outline-none transition" />
                            </div>

                            <button onClick={agregarManual} className="sm:col-span-2 bg-[#801818] hover:bg-red-700 text-white py-2 rounded-xl text-sm font-semibold transition shadow-sm">
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

                {policias.length > 0 && (
                    <button
                        onClick={descargarTodas}
                        className="flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 px-4 py-2 text-white text-sm font-semibold shadow-sm transition"
                    >
                        Descargar ZIP
                    </button>
                )}

                <div className="flex flex-wrap gap-6">
                    {policias.map((p, idx) => (
                        <div
                            key={idx}
                            id={`tarjeta-policia-${idx}`}
                            className="bg-white text-stone-900 border border-stone-200 p-4 rounded-2xl shadow-sm w-[280px]"
                        >
                            <div className="flex justify-center">
                                <img src="/idescuentos.png" className="h-16" />
                            </div>

                            <img src={p.qrUrl} className="w-48 h-48 mx-auto" />

                            <p className="text-center font-semibold">
                                {p.nombre} {p.apellido}
                            </p>

                            <button
                                onClick={() => generarTarjeta(idx).then(r => r.blob && saveAs(r.blob, r.nombreArchivo))}
                                className="mt-2 w-full bg-[#801818] hover:bg-red-700 text-white py-2 rounded-xl text-sm font-semibold transition shadow-sm"
                            >
                                Descargar
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    )
}