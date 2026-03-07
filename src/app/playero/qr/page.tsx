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
        const reader = new BrowserQRCodeReader();
        codeReader.current = reader;

        let active = true;

        const startScanner = async () => {
            try {
                await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
                    if (result && active) {
                        active = false;
                        const token = new URL(result.getText()).searchParams.get('token');

                        if (token) {
                            stopCamera();
                            router.push(`/playero/carga?token=${token}`);
                        }
                    }
                });
            } catch {
                Swal.fire({
                    icon: 'error',
                    title: 'Error al iniciar la cámara',
                    text: 'Asegurate de que la cámara esté habilitada.',
                    confirmButtonColor: '#801818',
                }).then(() => router.push('/playero'));
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
        <main className="min-h-screen bg-gray-100 px-6 py-10 flex items-start pt-10 justify-center">

            <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm text-center space-y-6">

                <div className="flex justify-center">
                    <video
                        ref={videoRef}
                        className="w-72 h-72 object-cover rounded-xl border border-gray-200 shadow-sm bg-black"
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