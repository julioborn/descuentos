'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { HiMenu, HiX, HiOutlineRefresh } from 'react-icons/hi';
import LogoutButton from './LogoutButton';
import clsx from 'clsx';

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

export default function Header() {
    const { data: session } = useSession();
    const role = session?.user?.role;
    const moneda = session?.user?.moneda;
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [precios, setPrecios] = useState<PrecioProducto[]>([]);

    const toggleMenu = () => setIsOpen(!isOpen);

    useEffect(() => {
        if (!moneda) return;

        fetch(`/api/precios?moneda=${moneda}`)
            .then((res) => res.json())
            .then((data: PrecioProducto[]) => setPrecios(Array.isArray(data) ? data : []))
            .catch(() => setPrecios([]));
    }, [moneda]);

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
                        className="hidden sm:block h-10 w-auto"
                    />
                    <img
                        src="/icons/icon-512.png"
                        alt="Logo"
                        className="sm:hidden w-14 h-14"
                    />
                </Link>

                {/* Bandera del país + recargar (esquina derecha) */}
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

                    <button
                        onClick={() => window.location.reload()}
                        className="sm:hidden text-2xl"
                        aria-label="Recargar página"
                    >
                        <HiOutlineRefresh />
                    </button>
                </div>
            </header>

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
                    'fixed top-0 left-0 h-full w-64 bg-gray-900 text-white z-50 shadow-lg transform transition-transform duration-300',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
                    <h2 className="text-xl font-bold">Menú</h2>
                    <button
                        onClick={toggleMenu}
                        className="text-2xl"
                        aria-label="Cerrar menú"
                    >
                        <HiX />
                    </button>
                </div>

                <nav className="flex flex-col px-4 py-6 space-y-4 text-lg">
                    {navItems.map(({ label, href }) => (
                        <Link
                            key={href}
                            href={href}
                            onClick={toggleMenu}
                            className={clsx(
                                'block px-4 py-3 rounded-lg transition',
                                isActive(href) ? 'bg-red-800 text-white' : 'hover:bg-white/10'
                            )}
                        >
                            {label}
                        </Link>
                    ))}

                    <div className="mt-6 border-t border-white/10 pt-4">
                        <LogoutButton />
                    </div>
                </nav>
            </aside>

            {/* ---------- Overlay al abrir menú (solo móvil) ---------- */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                    onClick={toggleMenu}
                />
            )}
        </>
    );
}
