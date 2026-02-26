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
}

type EmpleadoPublico = {
    nombre: string
    apellido: string
    dni: string
    empresa: string
    localidad?: string
    subcategoria?: string
    descargado: boolean
    qrToken?: string // 👈 solo viene si descargado=false
}

const onlyDigits = (s: string) => s.replace(/\D/g, '')

const formatDni = (digits: string) => {
    // 7 u 8 dígitos (Argentina). Formatea: 12345678 -> 12.345.678
    const d = onlyDigits(digits).slice(0, 8)
    if (d.length <= 2) return d
    if (d.length <= 5) return `${d.slice(0, d.length - 3)}.${d.slice(-3)}`
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

    const volver = () => {
        setEmpleado(null)
        setDni('')
        setQrUrl('')
        setTarjetaImg(null)
        setHabilitarDescargaIOS(false)
        setLoading(false)
        setProcesando(false)
    }

    // iOS: bloquear long-press hasta tocar el botón
    const [habilitarDescargaIOS, setHabilitarDescargaIOS] = useState(false)

    if (!MAPA_TIPO[tipo] || !config) {
        return (
            <main className="min-h-screen flex items-center justify-center text-white bg-gray-900">
                <p className="text-red-500 font-bold">QR inválido</p>
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

            // ✅ Si ya descargó, NO generamos QR (no hay token)
            if (data.descargado) return

            if (!data.qrToken) {
                await Swal.fire('Error', 'No se pudo generar el QR', 'error')
                return
            }

            const qr = await QRCode.toDataURL(
                `${window.location.origin}/playero?token=${data.qrToken}`
            )
            setQrUrl(qr)
        } finally {
            setLoading(false)
        }
    }

    const descargar = async () => {
        if (!empleado || procesando) return
        setProcesando(true)

        try {
            if (esIOS) {
                const result = await Swal.fire({
                    icon: 'info',
                    title: 'Guardar QR',
                    html: 'Mantené presionada la tarjeta y elegí <b>Guardar en Fotos</b>',
                    confirmButtonText: 'Entendido',
                })

                if (!result.isConfirmed) return

                // ✅ Marcamos en backend apenas tocaron "Descargar QR"
                await fetch('/api/empleados/descargar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dni: empleado.dni }),
                })

                // ✅ Generamos imagen de la TARJETA COMPLETA (no solo el QR)
                const nodo = document.getElementById('tarjeta')
                if (!nodo) {
                    await Swal.fire('Error', 'No se encontró la tarjeta para generar imagen', 'error')
                    return
                }

                const canvas = await html2canvas(nodo, { scale: 2 })
                const img = canvas.toDataURL('image/png')
                setTarjetaImg(img)

                // ✅ recién ahora permitimos long-press
                setHabilitarDescargaIOS(true)

                return
            }

            // ✅ No iOS: descargamos archivo PNG
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

    return (
        <main className="min-h-screen bg-gray-900 text-white flex justify-center items-center px-4">
            <div className="max-w-md w-full bg-gray-800 p-6 rounded-xl space-y-6">
                <h1 className="text-2xl font-bold">{config.titulo}</h1>
                <p className="text-gray-300">{config.descripcion}</p>

                {!empleado && (
                    <>
                        <input
                            value={formatDni(dni)}
                            onChange={(e) => setDni(formatDni(e.target.value))}
                            inputMode="numeric"
                            type="tel"
                            autoComplete="off"
                            placeholder="DNI"
                            className="w-full py-3 text-center text-2xl tracking-widest text-black rounded-lg"
                        />
                        <button
                            onClick={buscar}
                            disabled={dniDigits.length < 7 || dniDigits.length > 8 || loading}
                            className="w-full py-3 bg-red-700 rounded-lg font-bold disabled:opacity-60"
                        >
                            {loading ? 'Verificando…' : 'Continuar'}
                        </button>
                    </>
                )}

                {empleado && !empleado.descargado && (
                    <>
                        {esIOS ? (
                            tarjetaImg ? (
                                // ✅ en iOS mostramos la imagen de la tarjeta cuando ya tocaron Descargar
                                <img
                                    src={tarjetaImg}
                                    className={`rounded-xl ${habilitarDescargaIOS ? '' : 'pointer-events-none select-none'}`}
                                    alt="Tarjeta QR"
                                />
                            ) : (
                                // ⛔ antes de tocar "Descargar", mostramos HTML PERO BLOQUEADO
                                <div
                                    id="tarjeta"
                                    className="bg-white text-black rounded-xl p-4 flex flex-col items-center gap-4 pointer-events-none select-none opacity-90"
                                >
                                    <img src="/idescuentos.png" className="h-12" />
                                    <img src={qrUrl} className="w-56 h-56" />
                                    <div className="font-bold">
                                        {empleado.nombre} {empleado.apellido}
                                    </div>
                                </div>
                            )
                        ) : (
                            // ✅ Android/desktop normal
                            <div
                                id="tarjeta"
                                className="bg-white text-black rounded-xl p-4 flex flex-col items-center gap-4"
                            >
                                <img src="/idescuentos.png" className="h-12" />
                                <img src={qrUrl} className="w-56 h-56" />
                                <div className="font-bold">
                                    {empleado.nombre} {empleado.apellido}
                                </div>
                            </div>
                        )}

                        {/* ✅ Texto SOLO después de Descargar en iOS */}
                        {esIOS && habilitarDescargaIOS && (
                            <div className="text-center text-yellow-400 text-sm font-semibold space-y-2">
                                <div className="text-2xl">⬆️⬆️</div>
                                <p>Mantené apretado y elegí “Guardar en Fotos”</p>
                            </div>
                        )}

                        <button
                            onClick={descargar}
                            disabled={procesando}
                            className="w-full py-3 bg-green-700 rounded-lg font-bold disabled:opacity-60"
                        >
                            {procesando ? 'Procesando…' : 'Descargar QR'}
                        </button>
                    </>
                )}

                {empleado?.descargado && (
                    <p className="text-red-500 font-bold text-center">
                        Este QR ya fue descargado
                    </p>
                )}

                {empleado && (
                    <button
                        onClick={volver}
                        className="w-full py-3 rounded-lg bg-gray-700 hover:bg-gray-600 font-semibold transition"
                    >
                        ← Volver
                    </button>
                )}
            </div>
        </main>
    )
}