'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import Swal from 'sweetalert2'

const MAPA_TIPO: Record<string, true> = {
    seguridad: true,
    salud: true,
    municipalidad: true,
    global: true,
    paraguay: true,
}

const TEXTOS: Record<string, { titulo: string; descripcion: string }> = {
    seguridad: {
        titulo: 'Personal de Seguridad',
        descripcion: 'Exclusivo para personal policial y seguridad.',
    },
    salud: {
        titulo: 'Personal de Salud',
        descripcion: 'Exclusivo para personal del SAMCO.',
    },
    municipalidad: {
        titulo: 'Empleados Municipales',
        descripcion: 'Exclusivo para empleados municipales.',
    },
    global: {
        titulo: 'Descuento de Combustible',
        descripcion: 'Ingresá tu DNI para activar tu beneficio.',
    },
    paraguay: {
        titulo: 'Empleados Paraguay',
        descripcion: 'Exclusivo para empleados de Paraguay.',
    },
}

type EmpleadoPublico = {
    nombre: string
    apellido: string
    dni: string
    empresa: string
    localidad?: string
    subcategoria?: string
    descargado: boolean
    qrToken?: string
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

const formatDni = (digits: string) => {
    const d = onlyDigits(digits).slice(0, 8)
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, d.length - 3)}.${d.slice(-3)}`
    return `${d.slice(0, d.length - 6)}.${d.slice(-6, -3)}.${d.slice(-3)}`
}

const formatCiParaguay = (digits: string) => {
    const d = onlyDigits(digits).slice(0, 9)
    if (d.length <= 3) return d
    if (d.length <= 6) return `${d.slice(0, d.length - 3)}.${d.slice(-3)}`
    return `${d.slice(0, d.length - 6)}.${d.slice(-6, -3)}.${d.slice(-3)}`
}

export default function EmpleadosTipoPage() {
    const { tipo } = useParams<{ tipo: string }>()
    const config = TEXTOS[tipo]

    const [dni, setDni] = useState('')
    const [empleado, setEmpleado] = useState<EmpleadoPublico | null>(null)
    const [qrUrl, setQrUrl] = useState('')
    const [tarjetaImg, setTarjetaImg] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [procesando, setProcesando] = useState(false)
    const [habilitarDescargaIOS, setHabilitarDescargaIOS] = useState(false)

    const volver = () => {
        setEmpleado(null)
        setDni('')
        setQrUrl('')
        setTarjetaImg(null)
        setHabilitarDescargaIOS(false)
        setLoading(false)
        setProcesando(false)
    }

    if (!MAPA_TIPO[tipo] || !config) {
        return (
            <main className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
                <p className="text-red-600 font-bold">QR inválido</p>
            </main>
        )
    }

    const esIOS =
        typeof window !== 'undefined' &&
        /iPad|iPhone|iPod/.test(navigator.userAgent)

    const buscar = async () => {
        setLoading(true)

        try {
            const res = await fetch('/api/empleados/buscar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: onlyDigits(dni), tipo }),
            })

            const data = (await res.json()) as EmpleadoPublico

            if (!res.ok) {
                await Swal.fire('Error', (data as any).error || 'Error', 'error')
                return
            }

            setEmpleado(data)

            if (data.descargado) return
        } finally {
            setLoading(false)
        }
    }

    const descargar = async () => {
        if (!empleado || procesando) return
        setProcesando(true)

        try {
            if (!qrUrl) {
                if (!empleado.qrToken) {
                    await Swal.fire('Error', 'No se pudo generar el QR', 'error')
                    return
                }
                await new Promise(r => setTimeout(r, 50))
            }

            if (esIOS) {
                const result = await Swal.fire({
                    icon: 'info',
                    title: 'Guardar QR',
                    html: 'Mantené presionada la tarjeta y elegí <b>Guardar en Fotos</b>',
                    confirmButtonText: 'Entendido',
                })

                if (!result.isConfirmed) return

                await fetch('/api/empleados/descargar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dni: empleado.dni }),
                })

                const nodo = document.getElementById('tarjeta')
                if (!nodo) {
                    await Swal.fire('Error', 'No se encontró la tarjeta para generar imagen', 'error')
                    return
                }

                const canvas = await html2canvas(nodo, { scale: 2 })
                const img = canvas.toDataURL('image/png')
                setTarjetaImg(img)
                setHabilitarDescargaIOS(true)
                return
            }

            const nodo = document.getElementById('tarjeta')
            if (!nodo) {
                await Swal.fire('Error', 'No se encontró la tarjeta', 'error')
                return
            }

            const canvas = await html2canvas(nodo, { scale: 2 })
            canvas.toBlob((b) => b && saveAs(b, `qr-${empleado.dni}.png`), 'image/png', 1)

            await fetch('/api/empleados/descargar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni: empleado.dni }),
            })
        } finally {
            setProcesando(false)
        }
    }

    const dniDigits = onlyDigits(dni)
    const esParaguay = tipo === 'paraguay'

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-10 flex items-center justify-center">
            <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold text-[#111827]">
                        {config.titulo}
                    </h1>
                    <p className="text-sm text-gray-500">
                        {config.descripcion}
                    </p>
                </div>

                {!empleado && (
                    <>
                        <input
                            value={esParaguay ? formatCiParaguay(dni) : formatDni(dni)}
                            onChange={(e) => setDni(onlyDigits(e.target.value))}
                            inputMode="numeric"
                            type="tel"
                            autoComplete="off"
                            placeholder={esParaguay ? 'CI' : 'DNI'}
                            className="w-full rounded-xl px-4 py-3 text-center text-2xl tracking-widest bg-gray-100 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#801818] focus:outline-none"
                        />

                        <button
                            onClick={buscar}
                            disabled={
                                esParaguay
                                    ? dniDigits.length < 6
                                    : dniDigits.length < 7 || dniDigits.length > 8
                            }
                            className="w-full py-3 rounded-xl bg-[#801818] hover:bg-red-700 text-white font-semibold shadow-sm transition disabled:opacity-60"
                        >
                            {loading ? 'Verificando…' : 'Continuar'}
                        </button>
                    </>
                )}

                {empleado && !empleado.descargado && (
                    <>
                        {esIOS ? (
                            tarjetaImg ? (
                                <img
                                    src={tarjetaImg}
                                    className={`rounded-2xl border border-gray-200 shadow-sm ${habilitarDescargaIOS ? '' : 'pointer-events-none select-none'}`}
                                    alt="Tarjeta QR"
                                />
                            ) : (
                                <div
                                    id="tarjeta"
                                    className="bg-white text-gray-900 rounded-2xl p-6 flex flex-col items-center gap-4 border border-gray-200 shadow-sm w-full"
                                >
                                    <img src="/idescuentos.png" className="h-12 mb-2" />

                                    <div className="text-center space-y-1">
                                        <div className="text-xl font-bold text-[#111827]">
                                            {empleado.nombre} {empleado.apellido}
                                        </div>

                                        <div className="text-sm text-gray-600 font-medium">
                                            DNI {empleado.dni}
                                        </div>

                                        <div className="text-sm font-semibold text-[#801818]">
                                            {empleado.empresa}
                                        </div>

                                        {empleado.localidad && (
                                            <div className="text-xs text-gray-500">
                                                {empleado.localidad}
                                            </div>
                                        )}
                                    </div>

                                    {qrUrl && (
                                        <img src={qrUrl} className="w-56 h-56 mt-3 rounded-lg" />
                                    )}
                                </div>
                            )
                        ) : (
                            <div
                                id="tarjeta"
                                className="bg-white text-gray-900 rounded-2xl p-6 flex flex-col items-center gap-4 border border-gray-200 shadow-sm w-full"
                            >
                                <img src="/idescuentos.png" className="h-12 mb-2" />

                                <div className="text-center space-y-1">
                                    <div className="text-xl font-bold text-[#111827]">
                                        {empleado.nombre} {empleado.apellido}
                                    </div>

                                    <div className="text-sm text-gray-600 font-medium">
                                        DNI {empleado.dni}
                                    </div>

                                    <div className="text-sm font-semibold text-[#801818]">
                                        {empleado.empresa}
                                    </div>

                                    {empleado.localidad && (
                                        <div className="text-xs text-gray-500">
                                            {empleado.localidad}
                                        </div>
                                    )}
                                </div>

                                {qrUrl && (
                                    <img src={qrUrl} className="w-56 h-56 mt-3 rounded-lg" />
                                )}
                            </div>
                        )}

                        {esIOS && habilitarDescargaIOS && (
                            <div className="text-center text-amber-600 text-sm font-semibold space-y-1">
                                <p>Mantené apretado y elegí “Guardar en Fotos”</p>
                            </div>
                        )}

                        <button
                            onClick={descargar}
                            disabled={procesando}
                            className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-semibold shadow-sm transition disabled:opacity-60"
                        >
                            {procesando ? 'Procesando…' : 'Descargar QR'}
                        </button>
                    </>
                )}

                {empleado?.descargado && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center">
                        <p className="text-red-700 font-semibold">
                            Este QR ya fue descargado
                        </p>
                    </div>
                )}

                {empleado && (
                    <button
                        onClick={volver}
                        className="w-full py-3 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold transition"
                    >
                        ← Volver
                    </button>
                )}
            </div>
        </main>
    )
}