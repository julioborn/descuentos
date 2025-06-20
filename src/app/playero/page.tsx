'use client';
import { useRouter } from 'next/navigation';

export default function PlayeroPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-gray-700 text-white flex items-center justify-center p-6">
            <button
                onClick={() => router.push('/playero/qr')}
                className="bg-green-600 hover:bg-green-500 px-6 py-4 rounded-lg text-xl font-bold"
            >
                Escanear QR
            </button>
        </main>
    );
}
