'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { HiMenu, HiX } from 'react-icons/hi';
import LogoutButton from './LogoutButton';
import clsx from 'clsx';

export default function Header() {
    const { data: session } = useSession();
    const role = session?.user?.role;
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(!isOpen);

    const isActive = (href: string) => {
        // Si es la raíz exacta
        if (href === '/admin') return pathname === '/admin';
        if (href === '/playero') return pathname === '/playero';
        // Para las demás rutas, permitimos que empiece por el prefijo
        return pathname.startsWith(href);
    };  

    const navItems = role && ['superadmin', 'admin_arg', 'admin_py'].includes(role)
        ? [
            { label: 'Inicio', href: '/admin' },
            { label: 'Empleados', href: '/admin/empleados' },
            { label: 'Cargas', href: '/admin/cargas' },
            { label: 'Precios', href: '/admin/precios' },
            { label: 'Descuentos', href: '/admin/descuentos' },
        ]
        : role === 'playero'
            ? [{ label: 'Inicio', href: '/playero' }]
            : [];

    return (
        <>
            {/* Encabezado superior */}
            <header className="relative bg-gray-900 text-white shadow-md h-20 flex items-center justify-start px-4">
                {/* Botón hamburguesa a la izquierda */}
                <button onClick={toggleMenu} className="text-3xl z-10" aria-label="Abrir menú">
                    {isOpen ? <HiX /> : <HiMenu />}
                </button>

                {/* Logo centrado */}
                <img
                    src="/icons/icon-512.png"
                    alt="Logo"
                    className="w-14 h-14 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                />
            </header>


            {/* Menú lateral deslizante */}
            <aside
                className={clsx(
                    'fixed top-0 left-0 h-full w-64 bg-gray-800 text-white z-50 shadow-lg transform transition-transform duration-300',
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/10">
                    <h2 className="text-xl font-bold">Menú</h2>
                    <button onClick={toggleMenu} className="text-2xl" aria-label="Cerrar menú">
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

            {/* Fondo oscuro cuando está abierto (solo en mobile/tablet) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 sm:hidden"
                    onClick={toggleMenu}
                />
            )}
        </>
    );
}
