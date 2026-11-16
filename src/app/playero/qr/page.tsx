'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserQRCodeReader } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import Swal from 'sweetalert2';

export default function QRScannerPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserQRCodeReader | null>(null);

    useEffect(() => {
        // TRY_HARDER mejora la deteccion en condiciones dificiles (poca luz,
        // QR impreso chico o de baja calidad), a costa de decodificar un poco
        // mas lento cuadro a cuadro.
        const hints = new Map();
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserQRCodeReader(hints);
        codeReader.current = reader;

        let active = true;

        const startScanner = async () => {
            // Constraints explicitos (camara trasera, resolucion alta y
            // enfoque continuo) para que la camara del navegador enfoque
            // tan bien como la app de camara nativa del celular.
            const constraints: MediaStreamConstraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    advanced: [{ focusMode: 'continuous' } as any],
                },
            };

            const onResult = (result: any) => {
                if (result && active) {
                    active = false;
                    const token = new URL(result.getText()).searchParams.get('token');

                    if (token) {
                        stopCamera();
                        router.push(`/playero/carga?token=${token}`);
                    }
                }
            };

            try {
                await reader.decodeFromConstraints(constraints, videoRef.current!, onResult);
            } catch {
                // Si el navegador no soporta alguno de los constraints avanzados,
                // reintentamos con la seleccion automatica de camara de siempre.
                try {
                    await reader.decodeFromVideoDevice(undefined, videoRef.current!, onResult);
                } catch {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al iniciar la cámara',
                        text: 'Asegurate de que la cámara esté habilitada.',
                        confirmButtonColor: '#801818',
                    }).then(() => router.push('/playero'));
                }
            }
        };

        const stopCamera = () => {
            const stream = videoRef.current?.srcObject as MediaStream | null;

            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                videoRef.current!.srcObject = null;
            }
        };

        startScanner();

        return () => {
            active = false;
            stopCamera();
        };
    }, [router]);

    return (
        <main className="min-h-screen bg-stone-50 px-6 py-10 flex items-start pt-10 justify-center">

            <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-6 shadow-sm text-center space-y-6">

                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1">
                        Escaneo de QR
                    </p>
                    <p className="text-sm text-stone-500">
                        Apuntá la cámara al código del empleado
                    </p>
                </div>

                <div className="flex justify-center">
                    <video
                        ref={videoRef}
                        className="w-72 h-72 object-cover rounded-2xl border border-stone-200 shadow-sm bg-black"
                        autoPlay
                        muted
                        playsInline
                    />
                </div>

                <button
                    onClick={() => {
                        const stream = videoRef.current?.srcObject as MediaStream | null;
                        stream?.getTracks().forEach((track) => track.stop());
                        router.push('/playero');
                    }}
                    className="w-full bg-[#801818] hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition"
                >
                    Volver al inicio
                </button>

            </div>

        </main>
    );
}