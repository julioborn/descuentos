'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Loader from '@/components/Loader';

const DapsaMapa = dynamic(() => import('@/components/DapsaMapa'), {
    ssr: false,
    loading: () => (
        <div className="h-[320px] w-full bg-stone-100 animate-pulse" />
    ),
});

type PromoInfo = {
    nombre: string;
    apellido: string;
    empresa: string;
    localidad?: string;
    porcentaje: number;
    promoActiva: boolean;
};

function PromoContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [info, setInfo] = useState<PromoInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!token) {
            setError(true);
            setLoading(false);
            return;
        }

        (async () => {
            try {
                const res = await fetch(`/api/promo?token=${token}`);
                if (!res.ok) throw new Error();
                setInfo(await res.json());
            } catch {
                setError(true);
            } finally {
                setLoading(false);
            }
        })();
    }, [token]);

    if (loading) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        );
    }

    if (error || !info) {
        return (
            <main className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
                <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-8 shadow-sm text-center space-y-3">
                    <p className="text-lg font-semibold text-[#111827]">Código no válido</p>
                    <p className="text-sm text-stone-500">
                        Este QR no corresponde a ningún beneficio activo.
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-stone-50 px-4 py-10 flex items-start justify-center">
            <div className="max-w-md w-full space-y-5">

                {/* Firma: Rossini primero (la empresa), Dapsa despues (sus estaciones) */}
                <div className="flex flex-col items-center gap-3">
                    <img src="/icons/rossini-logo.png" alt="Rossini" className="h-14 w-auto" />
                    <div className="h-px w-10 bg-stone-300" />
                    <img src="/icons/dapsa-logo.png" alt="Dapsa" className="h-10 w-auto" />
                </div>

                {info.promoActiva ? (
                    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

                        <div className="bg-[#801818] px-6 py-8 text-center text-white">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70 mb-2">
                                Beneficio activo
                            </p>
                            <p className="text-5xl font-black tracking-tight">
                                {info.porcentaje}% OFF
                            </p>
                            <p className="mt-1 text-sm text-white/80">
                                en combustible, con este QR
                            </p>
                        </div>

                        <div className="px-6 py-6 text-center space-y-1">
                            <p className="text-lg font-semibold text-[#111827]">
                                {info.nombre} {info.apellido}
                            </p>
                            <p className="text-sm text-stone-500">
                                {info.empresa}
                                {info.localidad ? ` · ${info.localidad}` : ''}
                            </p>
                        </div>

                    </div>
                ) : (
                    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">

                        <div className="bg-[#111827] px-6 py-8 text-center text-white">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60 mb-2">
                                DAPSA
                            </p>
                            <p className="text-2xl font-black tracking-tight">
                                Descuentos en combustible
                            </p>
                        </div>

                        <div className="px-6 py-6 text-center space-y-3">
                            <p className="text-sm text-stone-600 leading-relaxed">
                                Este beneficio promocional ya no está activo, pero seguimos
                                ofreciendo descuentos en combustible durante todo el año.
                            </p>
                        </div>

                    </div>
                )}

                <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 pt-5 pb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1">
                            Nuestras estaciones
                        </p>
                        <p className="text-sm text-stone-500">
                            Encontrá la sucursal DAPSA más cercana
                        </p>
                    </div>
                    <DapsaMapa />
                </div>

                {info.promoActiva && (
                    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm p-6 text-center space-y-2">
                        <p className="text-sm font-semibold text-[#111827]">
                            Válido el fin de semana del 5 y 6 de septiembre
                        </p>
                        <p className="text-sm text-stone-600 leading-relaxed">
                            Llevá el auto con esta calcomanía bien visible. Al cargar combustible
                            en cualquiera de estas estaciones, los playeros te van a detectar el
                            descuento escaneando el QR.
                        </p>
                    </div>
                )}

            </div>
        </main>
    );
}

export default function PromoPage() {
    return (
        <Suspense fallback={
            <main className="min-h-screen bg-stone-50 flex items-center justify-center">
                <Loader />
            </main>
        }>
            <PromoContent />
        </Suspense>
    );
}
