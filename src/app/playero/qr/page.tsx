'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserQRCodeReader } from '@zxing/browser';

export default function QRScannerPage() {
    const router = useRouter();
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReader = useRef<BrowserQRCodeReader | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        codeReader.current = new BrowserQRCodeReader();

        const startScanner = async () => {
            try {
                await codeReader.current!.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
                    if (result) {
                        const token = new URL(result.getText()).searchParams.get('token');
                        if (token) {
                            (codeReader.current as any)?.stopContinuousDecode?.();;
                            router.push(`/playero/carga?token=${token}`);
                        }
                    }
                });
            } catch {
                setError('No se pudo iniciar la cámara.');
            }
        };

        startScanner();

        return () => {
            (codeReader.current as any)?.stopContinuousDecode?.();;
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
            {error && <p className="text-red-400 mt-4">{error}</p>}
        </main>
    );
}
