'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'
import { FaWhatsapp } from 'react-icons/fa'
import Swal from 'sweetalert2'

type Policia = {
    nombre: string
    apellido: string
    dni: string
    localidad: string
    descargado: boolean
}

export default function PoliciaPage() {
    const [dni, setDni] = useState('')
    const [policia, setPolicia] = useState<Policia | null>(null)
    const [qrUrl, setQrUrl] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [procesando, setProcesando] = useState(false)
    const [tarjetaImg, setTarjetaImg] = useState<string | null>(null)
    const [habilitarDescargaIOS, setHabilitarDescargaIOS] = useState(false)

    const buscar = async () => {
        setError('')
        setLoading(true)

        try {
            const res = await fetch('/api/policia/buscar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dni }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Error')
                setPolicia(null)
                return
            }

            setPolicia(data)

            if (!data.descargado) {
                const qr = await QRCode.toDataURL(
                    `${window.location.origin}/playero?token=${data.qrToken}`
                )
                setQrUrl(qr)
            }
        } finally {
            setLoading(false)
        }
    }

    const descargarTarjeta = async () => {
        if (!policia) return
        const nodo = document.getElementById('tarjeta-policial')
        if (!nodo) return

        const canvas = await html2canvas(nodo, { scale: 2 })
        const blob = await new Promise<Blob | null>((ok) =>
            canvas.toBlob(ok, 'image/png', 1)
        )

        if (!blob) return
        saveAs(blob, `qr-${policia.dni}.png`)

        await fetch('/api/policia/descargar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni: policia.dni }),
        })

        setPolicia({ ...policia, descargado: true })
    }

    const volver = () => {
        setPolicia(null)
        setDni('')
        setQrUrl('')
        setTarjetaImg(null) // 👈 IMPORTANTE
        setError('')
    }

    const formatDni = (value: string) => {
        const digits = value.replace(/\D/g, '')
        if (digits.length <= 3) return digits
        if (digits.length <= 6) return digits.replace(/(\d{1,3})(\d{3})/, '$1.$2')
        return digits.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3')
    }

    const esIOS =
        typeof window !== 'undefined' &&
        /iPad|iPhone|iPod/.test(navigator.userAgent)

    const descargarIOS = async () => {
        if (!policia || procesando) return
        setProcesando(true)

        const result = await Swal.fire({
            icon: 'info',
            title: 'Guardar QR',
            html: `
      <p>Mantené presionado el QR</p>
      <b>y elegí "Guardar en Fotos"</b>
    `,
            confirmButtonText: 'Entendido',
        })

        if (!result.isConfirmed) {
            setProcesando(false)
            return
        }

        // 1️⃣ generar imagen de la CARD COMPLETA
        const nodo = document.getElementById('tarjeta-policial')
        if (nodo) {
            const canvas = await html2canvas(nodo, { scale: 2 })
            const img = canvas.toDataURL('image/png')
            setTarjetaImg(img)
        }

        // 2️⃣ habilitar interacción (mostrar imagen + texto)
        setHabilitarDescargaIOS(true)

        // 3️⃣ marcar como descargado en backend
        await fetch('/api/policia/descargar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni: policia.dni }),
        })

        setProcesando(false)
    }

    return (
        <main className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">

                {/* TÍTULO */}
                {!policia && (
                    <header className="space-y-3 flex flex-col">
                        <h1 className="text-3xl font-bold tracking-tight">
                            Descuento de Combustible
                        </h1>

                        <p className="text-base text-gray-300 leading-relaxed">
                            Ingresá tu DNI para descargar tu QR personal.
                            <br />
                            <span className="font-semibold text-yellow-400">
                                El QR puede descargarse una sola vez.
                            </span>
                            <br />
                            <span className="font-semibold text-yellow-400">
                                El QR se guardará en las fotos de tu teléfono.
                            </span>
                        </p>
                    </header>
                )}

                {/* FORM DNI */}
                {!policia && (
                    <div className="space-y-5">
                        <input
                            value={formatDni(dni)}
                            onChange={(e) => {
                                const onlyDigits = e.target.value.replace(/\D/g, '')
                                if (onlyDigits.length <= 8) setDni(onlyDigits)
                            }}
                            inputMode="numeric"
                            placeholder="DNI"
                            className="
        w-full text-center text-4xl font-mono tracking-widest
        py-4 rounded-xl text-black
        focus:outline-none focus:ring-4 focus:ring-red-700
      "
                        />

                        <button
                            onClick={buscar}
                            disabled={dni.length < 7 || dni.length > 8 || loading}
                            className={`
        w-full py-4 rounded-xl text-lg font-semibold transition
        ${dni.length >= 7 && dni.length <= 8
                                    ? 'bg-red-700 hover:bg-red-800 text-white'
                                    : 'bg-gray-600 cursor-not-allowed text-white'
                                }
      `}
                        >
                            {loading ? 'Verificando…' : 'Continuar'}
                        </button>

                        {error && (
                            <p className="text-center text-red-400 text-base font-semibold">
                                {error}
                            </p>
                        )}
                    </div>
                )}

                {/* TARJETA QR */}
                {policia && !policia.descargado && (
                    <div className="space-y-6">
                        {esIOS ? (
                            // ✅ iOS
                            habilitarDescargaIOS ? (
                                // 🔥 DESPUÉS de apretar "Descargar QR": mostrar SOLO la imagen final
                                tarjetaImg ? (
                                    <img
                                        src={tarjetaImg}
                                        className="w-full rounded-xl"
                                        alt="Tarjeta QR"
                                    />
                                ) : (
                                    // mientras se genera, opcional: loader
                                    <div className="text-center text-sm opacity-80">Generando imagen…</div>
                                )
                            ) : (
                                // ⛔ ANTES de apretar "Descargar QR": mostrar HTML pero bloqueado
                                <div
                                    id="tarjeta-policial"
                                    className="bg-white text-black rounded-2xl p-6 flex flex-col items-center gap-6 pointer-events-none select-none opacity-90"
                                >
                                    <img src="/idescuentos.png" className="h-14" />
                                    <img src={qrUrl} className="w-64 h-64" />
                                    <div className="text-lg font-bold text-center">
                                        {policia.nombre} {policia.apellido}
                                    </div>
                                </div>
                            )
                        ) : (
                            // ✅ Android / Desktop: normal HTML siempre
                            <div
                                id="tarjeta-policial"
                                className="bg-white text-black rounded-2xl p-6 flex flex-col items-center gap-6"
                            >
                                <img src="/idescuentos.png" className="h-14" />
                                <img src={qrUrl} className="w-64 h-64" />
                                <div className="text-lg font-bold text-center">
                                    {policia.nombre} {policia.apellido}
                                </div>
                            </div>
                        )}

                        {esIOS && habilitarDescargaIOS && (
                            <div className="text-center text-yellow-400 text-sm font-semibold space-y-2">
                                <div className="text-2xl">⬆️⬆️</div>
                                <p>Mantené apretado el QR y elegí “Guardar en Fotos”</p>
                            </div>
                        )}

                        <button
                            disabled={procesando}
                            onClick={() => {
                                if (esIOS) {
                                    descargarIOS()
                                } else {
                                    descargarTarjeta()
                                }
                            }}
                            className={`
    w-full py-4 rounded-xl text-lg font-semibold transition
    ${esIOS
                                    ? 'bg-yellow-500 text-black'
                                    : 'bg-green-700 hover:bg-green-800 text-white'}
    ${procesando ? 'opacity-60 cursor-not-allowed' : ''}
  `}
                        >
                            {procesando ? 'Procesando…' : 'Descargar QR'}
                        </button>
                    </div>
                )}

                {/* YA DESCARGADO */}
                {policia && policia.descargado && (
                    <div className="space-y-1 text-center">
                        <div className='mb-4 space-y-1'>
                            <p className="text-red-500 text-lg font-bold">
                                Este QR ya fue descargado
                            </p>
                            <span className="block text-sm font-bold">
                                {policia.nombre} {policia.apellido}
                            </span>

                            <span className="block text-sm">
                                DNI: {formatDni(policia.dni)}
                            </span>
                        </div>

                        <div className="bg-white text-black rounded-xl p-6 space-y-4">
                            <img src="/idescuentos.png" className="h-10 mx-auto" />
                            <p className="text-base text-gray-700">
                                Si perdiste tu QR o fue descargado por error,
                                podés comunicarte con nosotros para ayudarte.
                            </p>

                            <a
                                href="https://wa.me/5493483451648"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="
    flex items-center justify-center gap-1.5
    w-full py-3 rounded-xl
    bg-green-600 hover:bg-green-700
    text-white font-semibold transition
  "
                            >
                                <span>Contactar</span>
                                <FaWhatsapp size={20} />
                            </a>
                        </div>
                    </div>
                )}

                {/* BOTÓN VOLVER – SIEMPRE ABAJO */}
                {policia && (
                    <div>
                        <button
                            onClick={volver}
                            className="
        w-full py-3 rounded-xl
        bg-gray-700 hover:bg-gray-600
        text-base font-semibold transition
      "
                        >
                            ← Volver
                        </button>
                    </div>
                )}
            </div>
        </main>
    )
}