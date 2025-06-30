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
        let active = true;
        codeReader.current = new BrowserQRCodeReader();

        const startScanner = async () => {
            let scanned = false;

            try {
                await codeReader.current!.decodeFromVideoDevice(
                    undefined,
                    videoRef.current!,
                    (result) => {
                        if (result && !scanned) {
                            scanned = true;
                            const token = new URL(result.getText()).searchParams.get('token');
                            if (token) {
                                router.push(`/playero/carga?token=${token}`);
                            }
                        }
                    }
                );
            } catch {
                if (active) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error al iniciar la cámara',
                        text: 'Por favor, asegurate de que la cámara esté habilitada en tu dispositivo y navegador.',
                        confirmButtonColor: '#991b1b',
                    }).then(() => router.push('/playero'));
                }
            }
        };

        startScanner();

        return () => {
            active = false;
            if (codeReader.current) {
                (codeReader.current as any).reset(); // ✅ Liberar cámara de forma segura
            }
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
                    (codeReader.current as any).reset(); // ✅ También liberar si se sale manualmente
                    router.push('/playero');
                }}
                className="mt-6 w-full bg-red-800 hover:bg-red-700 text-white text-lg py-3 rounded-lg font-semibold transition"
            >
                Inicio
            </button>
        </main>
    );
}
