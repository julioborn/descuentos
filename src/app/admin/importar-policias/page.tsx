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
        <main className="min-h-screen p-6 bg-gray-900 text-white">
            <h1 className="text-3xl font-bold text-center mb-6">
                Importar Policías
            </h1>

            {/* SWITCH */}
            <div className="flex justify-center gap-4 mb-6">
                <button onClick={() => setModo('excel')} className={`px-4 py-2 rounded ${modo === 'excel' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    Excel
                </button>
                <button onClick={() => setModo('manual')} className={`px-4 py-2 rounded ${modo === 'manual' ? 'bg-blue-600' : 'bg-gray-700'}`}>
                    Manual
                </button>
            </div>

            {/* EXCEL */}
            {modo === 'excel' && (
                <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFile}
                    className="mb-6 block mx-auto"
                />
            )}

            {/* MANUAL */}
            {modo === 'manual' && (
                <div className="max-w-xl mx-auto bg-gray-800 p-6 rounded space-y-3 mb-6">
                    <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" className="w-full p-2 text-black rounded" />
                    <input name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" className="w-full p-2 text-black rounded" />
                    <input name="dni" value={form.dni} onChange={handleChange} placeholder="DNI" inputMode="numeric" className="w-full p-2 text-black rounded" />
                    <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" inputMode="numeric" className="w-full p-2 text-black rounded" />
                    <input name="localidad" value={form.localidad} onChange={handleChange} placeholder="Localidad" className="w-full p-2 text-black rounded" />
                    <input name="subcategoria" value={form.subcategoria} onChange={handleChange} placeholder="Subcategoría" className="w-full p-2 text-black rounded" />

                    <button onClick={agregarManual} className="w-full bg-blue-700 py-2 rounded">
                        Agregar
                    </button>
                </div>
            )}

            {loading && <p className="text-center">Procesando...</p>}

            {policias.length > 0 && (
                <button
                    onClick={descargarTodas}
                    className="mx-auto mb-6 block bg-green-700 px-6 py-3 rounded"
                >
                    Descargar ZIP
                </button>
            )}

            <div className="flex flex-wrap gap-6 justify-center">
                {policias.map((p, idx) => (
                    <div
                        key={idx}
                        id={`tarjeta-policia-${idx}`}
                        className="bg-white text-black p-4 rounded w-[280px]"
                    >
                        <div className="flex justify-center">
                            <img src="/idescuentos.png" className="h-16" />
                        </div>

                        <img src={p.qrUrl} className="w-48 h-48 mx-auto" />

                        <p className="text-center font-semibold">
                            {p.nombre} {p.apellido}
                        </p>
                    </div>
                ))}
            </div>
        </main>
    )
}