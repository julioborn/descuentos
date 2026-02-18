'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import html2canvas from 'html2canvas'
import { saveAs } from 'file-saver'

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

    /* ───────── Buscar policía ───────── */
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
                    `${window.location.origin}/playero?token=${dni}`
                )
                setQrUrl(qr)
            }
        } finally {
            setLoading(false)
        }
    }

    /* ───────── Descargar tarjeta ───────── */
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

    const formatDni = (value: string) => {
        const digits = value.replace(/\D/g, '')
        if (digits.length <= 3) return digits
        if (digits.length <= 6)
            return digits.replace(/(\d{1,3})(\d{3})/, '$1.$2')
        return digits.replace(/(\d{1,2})(\d{3})(\d{3})/, '$1.$2.$3')
    }

    const whatsappLink =
        policia &&
        `https://wa.me/5493483451648?text=${encodeURIComponent(
            `Hola, tuve un inconveniente con mi QR de descuento de combustible.\n\n` +
            `DNI: ${policia.dni}\n` +
            `Nombre: ${policia.nombre} ${policia.apellido}\n\n` +
            `¿Podrían ayudarme? Gracias.`
        )}`

    const volver = () => {
        setPolicia(null)
        setDni('')
        setQrUrl('')
        setError('')
    }



    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
            <div className="w-full max-w-sm space-y-6">

                <h1 className="text-2xl font-bold text-center">
                    QR Descuento de Combustible
                </h1>

                <p className="text-center text-sm text-gray-300">
                    Ingresá tu DNI para descargar tu QR personal.
                    <br />
                    ⚠️ El QR se puede descargar una sola vez.
                </p>

                {!policia && (
                    <>
                        <input
                            value={formatDni(dni)}
                            onChange={(e) => {
                                const onlyDigits = e.target.value.replace(/\D/g, '')
                                if (onlyDigits.length <= 8) setDni(onlyDigits)
                            }}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="DNI"
                            className="
                w-full text-center text-3xl tracking-widest font-mono
                py-4 rounded-xl text-black
                focus:outline-none focus:ring-2 focus:ring-black
              "
                        />

                        <button
                            onClick={buscar}
                            disabled={dni.length < 7 || dni.length > 8 || loading}
                            className={`
                w-full py-4 rounded-xl font-semibold text-lg
                ${dni.length >= 7 && dni.length <= 8
                                    ? 'bg-white text-black'
                                    : 'bg-gray-600 cursor-not-allowed'
                                }
              `}
                        >
                            {loading ? 'Buscando…' : 'Continuar'}
                        </button>

                        {error && (
                            <p className="text-red-400 text-center text-sm">{error}</p>
                        )}
                    </>
                )}

                {policia && (
                    <button
                        onClick={volver}
                        className="
      w-full text-sm text-gray-300
      underline underline-offset-4
      hover:text-white transition
    "
                    >
                        ← Cambiar DNI
                    </button>
                )}

                {policia && (
                    <>
                        {/* TARJETA QR SOLO SI NO FUE DESCARGADO */}
                        {!policia.descargado && (
                            <>
                                <div
                                    id="tarjeta-policial"
                                    className="
                    bg-white text-black px-6 py-10 rounded-xl shadow-lg
                    flex flex-col items-center justify-between min-h-[420px]
                  "
                                >
                                    <img src="/idescuentos.png" className="h-14 mb-6" />

                                    <img
                                        src={qrUrl}
                                        className="w-64 h-64 object-contain"
                                    />

                                    <div className="text-center text-base font-semibold tracking-wide mt-6">
                                        {policia.nombre} {policia.apellido}
                                    </div>
                                </div>

                                <button
                                    onClick={descargarTarjeta}
                                    className="w-full bg-green-700 hover:bg-green-800 py-3 rounded font-semibold"
                                >
                                    Descargar QR
                                </button>
                            </>
                        )}

                        {/* BLOQUE INCONVENIENTE */}
                        {policia.descargado && (
                            <>
                                <p className="text-center text-red-600 font-semibold space-y-1">
                                    <span className="block text-base">
                                        QR ya descargado
                                    </span>

                                    <span className="block text-sm font-bold">
                                        {policia.nombre} {policia.apellido}
                                    </span>

                                    <span className="block text-sm">
                                        DNI: {formatDni(policia.dni)}
                                    </span>
                                </p>

                                <div className="
                  bg-white text-black rounded-xl shadow p-5 space-y-4 text-center
                ">
                                    <img src="/idescuentos.png" className="h-10 mx-auto" />

                                    <h2 className="text-lg font-bold">
                                        ¿Tuviste algún inconveniente?
                                    </h2>

                                    <p className="text-sm text-gray-600">
                                        Si perdiste tu QR o fue descargado por error,
                                        podés comunicarte con nosotros para ayudarte.
                                    </p>

                                    <a
                                        href={whatsappLink || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="
                      block w-full bg-green-600 hover:bg-green-700
                      text-white py-3 rounded-xl font-semibold transition
                    "
                                    >
                                        Contactar por WhatsApp
                                    </a>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </main>
    )
}