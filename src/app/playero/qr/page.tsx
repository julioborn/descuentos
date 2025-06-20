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
        let scanned = false;

        const startScanner = async () => {
            try {
                await codeReader.current!.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
                    if (result && !scanned) {
                        scanned = true;
                        const token = new URL(result.getText()).searchParams.get('token');
                        if (token) {
                            stopScanner(); // Detenemos el stream y el decoder
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

        const stopScanner = () => {
            (codeReader.current as any)?.reset();

            const video = videoRef.current;
            const stream = video?.srcObject as MediaStream;
            stream?.getTracks().forEach(track => track.stop());
            if (video) {
                video.srcObject = null;
            }
        };

        startScanner();

        return () => {
            stopScanner();
        };
    }, [router]);

    return (
        <main className="min-h-screen px-4 py-6 bg-gray-700 text-white">
            <video
                ref={videoRef}
                className="w-72 h-72 object-cover rounded shadow border border-white/10 bg-black mx-auto"
                autoPlay
                muted
                playsInline
            />
            <button
                onClick={() => {
                    (codeReader.current as any)?.stopContinuousDecode?.(); // Detenemos el scanner
                    router.push('/playero');
                }}
                className="mt-6 w-full bg-red-800 hover:bg-red-700 text-white text-lg py-3 rounded-lg font-semibold transition"
            >
                Inicio
            </button>
        </main>
    );
}
