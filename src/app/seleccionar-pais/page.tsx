'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Loader from '@/components/Loader';

function FlagAR({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
            <rect width="3" height="2" fill="#fff" />
            <rect width="3" height="0.6667" fill="#75AADB" />
            <rect width="3" height="0.6667" y="1.3333" fill="#75AADB" />
            <circle cx="1.5" cy="1" r="0.22" fill="#F6B40E" stroke="#85340A" strokeWidth="0.02" />
        </svg>
    );
}

function FlagPY({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 3 2" className={className} aria-hidden="true">
            <rect width="3" height="0.6667" fill="#D52B1E" />
            <rect width="3" height="0.6667" y="0.6667" fill="#fff" />
            <rect width="3" height="0.6667" y="1.3333" fill="#0038A8" />
        </svg>
    );
}

export default function SeleccionarPaisPage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const [cambiando, setCambiando] = useState<'AR' | 'PY' | null>(null);

    useEffect(() => {
        if (status === 'loading') return;

        if (!session) {
            router.replace('/login');
            return;
        }

        if (session.user?.baseRole !== 'superadmin') {
            router.replace('/admin');
        }
    }, [session, status, router]);

    const elegirPais = async (pais: 'AR' | 'PY') => {
        setCambiando(pais);
        try {
            await update({ paisActivo: pais });
            router.replace('/admin');
        } catch {
            setCambiando(null);
        }
    };

    if (status === 'loading' || !session || session.user?.baseRole !== 'superadmin') {
        return (
            <main className="min-h-screen bg-gray-900 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
            <div className="w-full max-w-2xl">

                <div className="flex justify-center mb-8">
                    <img src="/icons/logolargo.png" alt="Logo" className="hidden sm:block h-12 w-auto" />
                    <img src="/icons/icon-512.png" alt="Logo" className="sm:hidden w-16 h-16" />
                </div>

                <div className="text-center mb-8">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40 mb-1.5">
                        Superadministrador
                    </p>
                    <h1 className="text-2xl font-black tracking-tight text-white">
                        ¿Qué país querés administrar?
                    </h1>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                    <button
                        onClick={() => elegirPais('AR')}
                        disabled={cambiando !== null}
                        className="group flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white p-8 shadow-2xl transition-all hover:-translate-y-0.5 hover:shadow-[#75AADB]/20 disabled:opacity-60"
                    >
                        <span className="inline-flex h-16 w-24 overflow-hidden rounded-lg ring-1 ring-stone-200 shadow-sm">
                            <FlagAR className="h-full w-full" />
                        </span>
                        <span className="text-lg font-semibold text-[#111827]">
                            {cambiando === 'AR' ? 'Entrando…' : 'Argentina'}
                        </span>
                    </button>

                    <button
                        onClick={() => elegirPais('PY')}
                        disabled={cambiando !== null}
                        className="group flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white p-8 shadow-2xl transition-all hover:-translate-y-0.5 hover:shadow-[#D52B1E]/20 disabled:opacity-60"
                    >
                        <span className="inline-flex h-16 w-24 overflow-hidden rounded-lg ring-1 ring-stone-200 shadow-sm">
                            <FlagPY className="h-full w-full" />
                        </span>
                        <span className="text-lg font-semibold text-[#111827]">
                            {cambiando === 'PY' ? 'Entrando…' : 'Paraguay'}
                        </span>
                    </button>

                </div>
            </div>
        </main>
    );
}
