'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HiMenu, HiX } from 'react-icons/hi';
import LogoutButton from './LogoutButton';
import clsx from 'clsx';
import {
    Home,
    UsersIcon,
    GraduationCap,
    FuelIcon,
    DollarSign,
    Percent,
    BarChart3,
    FileText,
    Import,
} from 'lucide-react';

const NAV_ICONS: Record<string, React.ReactNode> = {
    'Inicio': <Home className="w-[18px] h-[18px]" />,
    'Empleados': <UsersIcon className="w-[18px] h-[18px]" />,
    'Docentes': <GraduationCap className="w-[18px] h-[18px]" />,
    'Cargas': <FuelIcon className="w-[18px] h-[18px]" />,
    'Precios': <DollarSign className="w-[18px] h-[18px]" />,
    'Descuentos': <Percent className="w-[18px] h-[18px]" />,
    'Estadísticas': <BarChart3 className="w-[18px] h-[18px]" />,
    'Informes': <FileText className="w-[18px] h-[18px]" />,
    'Importar': <Import className="w-[18px] h-[18px]" />,
};

type PrecioProducto = {
    producto: string;
    precio: number;
    moneda: string;
};

const simboloPorMoneda = (moneda?: string) =>
    moneda === 'ARS' ? '$' : moneda === 'Gs' ? 'Gs' : '';

const fmtPrecio = (n: number) =>
    n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Banderas como SVG propio: los emojis de bandera (🇦🇷/🇵🇾) no se renderizan
// como ícono en Windows (muestran "AR"/"PY" en texto), así que evitamos el emoji.
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

const PULL_THRESHOLD = 70; // px que hay que arrastrar para disparar el refresh
const PULL_MAX = 100; // tope visual del arrastre

export default function Header() {
    const { data: session } = useSession();
    const role = session?.user?.role;
    const baseRole = session?.user?.baseRole;
    const moneda = session?.user?.moneda;
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [precios, setPrecios] = useState<PrecioProducto[]>([]);

    // ---- Pull-to-refresh nativo (mobile) ----
    const [pullY, setPullY] = useState(0);
    const [dragging, setDragging] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const touchStartYRef = useRef<number | null>(null);
    const pullingRef = useRef(false);
    const pullYRef = useRef(0);
    const refreshingRef = useRef(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    useEffect(() => {
        if (!moneda) return;

        const fetchPrecios = () => {
            fetch(`/api/precios?moneda=${moneda}`)
                .then((res) => res.json())
                .then((data: PrecioProducto[]) => setPrecios(Array.isArray(data) ? data : []))
                .catch(() => setPrecios([]));
        };

        // Al montar y cada vez que se cambia de ruta (por si los precios
        // se actualizaron en otra pestaña/sesion).
        fetchPrecios();

        // Refresco inmediato cuando se guarda un precio nuevo en /admin/precios,
        // sin depender de navegar a otra pantalla.
        window.addEventListener('precios:updated', fetchPrecios);
        return () => window.removeEventListener('precios:updated', fetchPrecios);
    }, [moneda, pathname]);

    useEffect(() => {
        const onTouchStart = (e: TouchEvent) => {
            if (refreshingRef.current) return;
            if (window.scrollY <= 0) {
                touchStartYRef.current = e.touches[0].clientY;
                pullingRef.current = true;
                setDragging(true);
            } else {
                touchStartYRef.current = null;
                pullingRef.current = false;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!pullingRef.current || touchStartYRef.current === null) return;

            const delta = e.touches[0].clientY - touchStartYRef.current;

            if (delta > 0 && window.scrollY <= 0) {
                e.preventDefault(); // evita el bounce/scroll nativo mientras arrastramos el nuestro
                const damped = Math.min(delta * 0.5, PULL_MAX);
                pullYRef.current = damped;
                setPullY(damped);
            } else {
                pullingRef.current = false;
                pullYRef.current = 0;
                setPullY(0);
                setDragging(false);
            }
        };

        const onTouchEnd = () => {
            if (!pullingRef.current) return;
            pullingRef.current = false;
            setDragging(false);

            if (pullYRef.current >= PULL_THRESHOLD) {
                refreshingRef.current = true;
                setRefreshing(true);
                pullYRef.current = PULL_THRESHOLD;
                setPullY(PULL_THRESHOLD);
                setTimeout(() => window.location.reload(), 350);
            } else {
                pullYRef.current = 0;
                setPullY(0);
            }

            touchStartYRef.current = null;
        };

        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd, { passive: true });
        window.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
            window.removeEventListener('touchcancel', onTouchEnd);
        };
    }, []);

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
        if (href === '/playero') return pathname === '/playero';
        return pathname.startsWith(href);
    };

    const navItems =
        role && ['superadmin', 'admin_arg', 'admin_py'].includes(role)
            ? [
                { label: 'Inicio', href: '/admin' },
                { label: 'Empleados', href: '/admin/empleados' },
                ...(role !== 'admin_py'
                    ? [{ label: 'Docentes', href: '/admin/docentes' }]
                    : []),
                { label: 'Cargas', href: '/admin/cargas' },
                { label: 'Precios', href: '/admin/precios' },
                { label: 'Descuentos', href: '/admin/descuentos' },
                { label: 'Estadísticas', href: '/admin/estadisticas' },
                { label: 'Informes', href: '/admin/informes' },
            ]
            : role === 'playero'
                ? [{ label: 'Inicio', href: '/playero' }]
                : [];

    return (
        <>
            {/* ---------- Header superior ---------- */}
            <header className="relative bg-gray-900 text-white shadow-md h-20 flex items-center px-4">
                {/* Botón hamburguesa (izq.) */}
                <button
                    onClick={toggleMenu}
                    className="text-3xl z-10"
                    aria-label="Abrir menú"
                >
                    {isOpen ? <HiX /> : <HiMenu />}
                </button>

                {/* Logo centrado: largo en desktop, ícono corto en mobile */}
                <Link
                    href="/"
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                    <img
                        src="/icons/logolargo.png"
                        alt="Logo"
                        className="hidden sm:block h-12 w-auto"
                    />
                    <img
                        src="/icons/icon-512.png"
                        alt="Logo"
                        className="sm:hidden w-14 h-14"
                    />
                </Link>

                {/* Bandera del país (esquina derecha) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
                    {moneda && (moneda === 'ARS' || moneda === 'Gs') && (
                        <span
                            className="inline-flex h-5 w-7 overflow-hidden rounded-[3px] ring-1 ring-white/20"
                            title={moneda === 'ARS' ? 'Argentina' : 'Paraguay'}
                            aria-label={moneda === 'ARS' ? 'Argentina' : 'Paraguay'}
                        >
                            {moneda === 'ARS' ? (
                                <FlagAR className="h-full w-full" />
                            ) : (
                                <FlagPY className="h-full w-full" />
                            )}
                        </span>
                    )}
                </div>
            </header>

            {/* ---------- Indicador de pull-to-refresh (solo mobile) ---------- */}
            <div
                className="sm:hidden fixed top-0 inset-x-0 z-[60] flex justify-center pointer-events-none"
                style={{
                    transform: `translateY(${pullY - 36}px)`,
                    opacity: pullY > 4 || refreshing ? 1 : 0,
                    transition: dragging ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
                }}
            >
                <div className="mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg border border-stone-200">
                    <div
                        className={clsx(
                            'h-5 w-5 rounded-full border-2 border-stone-200 border-t-[#801818]',
                            refreshing && 'animate-spin'
                        )}
                        style={!refreshing ? { transform: `rotate(${(pullY / PULL_THRESHOLD) * 360}deg)` } : undefined}
                    />
                </div>
            </div>

            {/* ---------- Cinta de precios ---------- */}
            {precios.length > 0 && (
                <div className="relative h-6 overflow-hidden bg-[#111827] border-t border-white/10 text-white">
                    {/* Desktop: fila estática */}
                    <div className="hidden sm:flex h-full flex-nowrap items-center justify-center gap-x-5 overflow-x-auto px-4 text-[11px] leading-none">
                        {precios.map((p) => (
                            <span key={p.producto} className="inline-flex items-center gap-1 whitespace-nowrap">
                                <span className="font-medium text-gray-300">{p.producto}</span>
                                <span className="font-bold text-emerald-400">
                                    {simboloPorMoneda(p.moneda)} {fmtPrecio(p.precio)}
                                </span>
                            </span>
                        ))}
                    </div>

                    {/* Mobile: cinta infinita (marquee) */}
                    <div className="sm:hidden h-full flex items-center">
                        <div className="ticker-track flex w-max items-center gap-5 text-[11px] leading-none">
                            {[...precios, ...precios].map((p, idx) => (
                                <span
                                    key={`${p.producto}-${idx}`}
                                    className="inline-flex items-center gap-1 whitespace-nowrap"
                                >
                                    <span className="font-medium text-gray-300">{p.producto}</span>
                                    <span className="font-bold text-emerald-400">
                                        {simboloPorMoneda(p.moneda)} {fmtPrecio(p.precio)}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>

                    <style jsx>{`
                        .ticker-track {
                            animation: ticker-scroll 22s linear infinite;
                            padding-left: 1rem;
                            will-change: transform;
                            backface-visibility: hidden;
                            transform: translateZ(0);
                        }
                        @keyframes ticker-scroll {
                            from {
                                transform: translateX(0);
                            }
                            to {
                                transform: translateX(-50%);
                            }
                        }
                    `}</style>
                </div>
            )}

            {/* ---------- Menú lateral ---------- */}
            <aside
                className={clsx(
                    'fixed top-0 left-0 h-full w-72 bg-gray-900 text-white z-50 shadow-xl transform transition-transform duration-300',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                        Menú
                    </p>
                    <button
                        onClick={toggleMenu}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/10 hover:text-white transition text-xl"
                        aria-label="Cerrar menú"
                    >
                        <HiX />
                    </button>
                </div>

                <nav className="flex flex-col px-3 py-4 gap-1">
                    {navItems.map(({ label, href }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={toggleMenu}
                            className={clsx(
                                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                                isActive(href)
                                    ? 'bg-[#801818] text-white shadow-sm'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                            )}
                        >
                            <span className={isActive(href) ? 'text-white' : 'text-white/40'}>
                                {NAV_ICONS[label]}
                            </span>
                            {label}
                        </Link>
                    ))}

                    {baseRole === 'superadmin' && (
                        <Link
                            href="/seleccionar-pais"
                            onClick={toggleMenu}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
                        >
                            <span className="inline-flex h-[18px] w-[18px] items-center justify-center overflow-hidden rounded-[3px] ring-1 ring-white/20">
                                {moneda === 'Gs' ? (
                                    <FlagPY className="h-full w-full" />
                                ) : (
                                    <FlagAR className="h-full w-full" />
                                )}
                            </span>
                            Cambiar país
                        </Link>
                    )}

                    <div className="mt-4 border-t border-white/10 pt-4 px-1">
                        <LogoutButton />
                    </div>
                </nav>
            </aside>

            {/* ---------- Overlay al abrir menú (cierra al tocar fuera) ---------- */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={toggleMenu}
                />
            )}
        </>
    );
}
