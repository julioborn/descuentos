'use client';
import { useRouter } from 'next/navigation';

export default function PlayeroPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-gray-700 text-white flex flex-col items-center justify-start mt-28 px-6">
            <div className="text-center mb-10">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-16 h-16 text-white mb-4 mx-auto"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 
                        1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 
                        3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 
                        0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 
                        1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 
                        4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 
                        1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 
                        1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 
                        16.5h.75v.75h-.75v-.75ZM16.5 
                        6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 
                        19.5h.75v.75h-.75v-.75ZM19.5 
                        13.5h.75v.75h-.75v-.75ZM19.5 
                        19.5h.75v.75h-.75v-.75ZM16.5 
                        16.5h.75v.75h-.75v-.75Z"
                    />
                </svg>

                <p className="text-lg text-gray-300 max-w-md">
                    Escaneá el código QR del empleado para registrar una carga.
                </p>
            </div>

            <button
                onClick={() => router.push('/playero/qr')}
                className="bg-red-800 hover:bg-red-700 px-10 py-5 rounded-xl text-2xl font-bold shadow-lg transition"
            >
                Escanear QR
            </button>

        </main>
    );
}
