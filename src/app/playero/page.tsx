'use client';
import { useRouter } from 'next/navigation';

export default function PlayeroPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-gray-100 px-6 py-12 flex items-start justify-center">

            <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center space-y-6 mt-10">

                {/* ICONO */}
                <div className="flex justify-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gray-100">
                        <svg fill="none" stroke-width="1.5" stroke="currentColor" xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            className="size-12 text-[#801818]">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
                        </svg>
                    </div>
                </div>

                {/* DESCRIPCION */}
                <p className="text-gray-500 text-md leading-relaxed">
                    Escaneá el código QR del empleado.
                </p>

                {/* BOTON */}
                <button
                    onClick={() => router.push('/playero/qr')}
                    className="w-full bg-[#801818] hover:bg-red-700 text-white py-4 rounded-xl text-lg font-semibold shadow-sm transition"
                >
                    Escanear QR
                </button>

            </div>

        </main>
    );
}