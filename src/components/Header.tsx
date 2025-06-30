'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LogoutButton from './LogoutButton';
import { useState } from 'react';
import { HiMenu, HiX } from 'react-icons/hi';
import { usePathname } from 'next/navigation';

export default function Header() {
    const { data: session } = useSession();
    const role = session?.user?.role;
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(prev => !prev);

    const isActive = (href: string) => {
        if (href === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(href);
    };

    const linkClass = (href: string) =>
        `block transition font-semibold ${isActive(href) ? 'text-red-500' : 'hover:text-red-400'
        }`;

    return (
        <header className="bg-gray-900 text-white px-4 py-3 shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <img src="/icons/icon-512.png" alt="Logo" className="w-16 h-16 rounded-md" />

                {/* Botón hamburguesa (solo visible en mobile) */}
                <button
                    onClick={toggleMenu}
                    className="sm:hidden text-white text-2xl mr-2 focus:outline-none"
                >
                    {isOpen ? <HiX /> : <HiMenu />}
                </button>

                {/* Navegación para desktop */}
                {/* Navegación para desktop */}
                <div className="hidden sm:flex items-center gap-4 text-sm sm:text-base">
                    {role && ['superadmin', 'admin_arg', 'admin_py'].includes(role) && (
                        <>
                            <Link href="/admin" className={linkClass('/admin')}>Inicio</Link>
                            <Link href="/admin/empleados" className={linkClass('/admin/empleados')}>Empleados</Link>
                            <Link href="/admin/cargas" className={linkClass('/admin/cargas')}>Cargas</Link>
                            <Link href="/admin/precios" className={linkClass('/admin/precios')}>Precios</Link>
                            <Link href="/admin/descuentos" className={linkClass('/admin/descuentos')}>Descuentos</Link>
                        </>
                    )}
                    {role === 'playero' && (
                        <Link href="/playero" className={linkClass('/playero')}>Inicio</Link>
                    )}
                    <LogoutButton />
                </div>
            </div>

            {/* Menú desplegable para mobile */}
            {/* Menú desplegable para mobile */}
            {isOpen && (
                <div className="sm:hidden mt-3 space-y-2 px-2 text-sm">
                    {role && ['superadmin', 'admin_arg', 'admin_py'].includes(role) && (
                        <>
                            <Link href="/admin" className={linkClass('/admin')} onClick={toggleMenu}>Inicio</Link>
                            <Link href="/admin/empleados" className={linkClass('/admin/empleados')} onClick={toggleMenu}>Empleados</Link>
                            <Link href="/admin/cargas" className={linkClass('/admin/cargas')} onClick={toggleMenu}>Cargas</Link>
                            <Link href="/admin/precios" className={linkClass('/admin/precios')} onClick={toggleMenu}>Precios</Link>
                            <Link href="/admin/descuentos" className={linkClass('/admin/descuentos')} onClick={toggleMenu}>Descuentos</Link>
                        </>
                    )}
                    {role === 'playero' && (
                        <Link href="/playero" className={linkClass('/playero')} onClick={toggleMenu}>Inicio</Link>
                    )}
                    <div className="pt-2 border-t border-white/20">
                        <LogoutButton />
                    </div>
                </div>
            )}
        </header>
    );
}
