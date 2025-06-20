'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserQRCodeReader } from '@zxing/browser';
import Swal from 'sweetalert2';

export default function QRScannerPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserQRCodeReader | null>(null);

    useEffect(() => {
        codeReader.current = new BrowserQRCodeReader();

        const startScanner = async () => {
            try {
                await codeReader.current!.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
                    if (result) {
                        const token = new URL(result.getText()).searchParams.get('token');
                        if (token) {
                            (codeReader.current as any)?.stopContinuousDecode?.();
                            router.push(`/playero/carga?token=${token}`);
                        }
                    }
                });
            } catch {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al iniciar la cámara',
                    text: 'Por favor, asegurate de que la cámara esté habilitada en tu dispositivo y navegador.',
                    confirmButtonColor: '#991b1b',
                }).then(() => router.push('/playero'));
            }
        };

        startScanner();

        return () => {
            (codeReader.current as any)?.stopContinuousDecode?.();
        };
    }, [router]);

    return (
        <main className="min-h-screen px-4 py-6 bg-gray-700 text-white">
            <h1 className="text-2xl font-bold mb-4">Escaneando...</h1>
            <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded shadow border border-white/10 bg-black"
                autoPlay
                muted
                playsInline
            />
            <button
                onClick={() => router.push('/playero')}
                className="mt-6 w-full bg-red-800 hover:bg-red-700 text-white text-lg py-3 rounded-lg font-semibold transition"
            >
                Volver al Inicio
            </button>
        </main>
    );
}
