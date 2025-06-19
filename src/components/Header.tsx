'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import LogoutButton from './LogoutButton';
import { useState } from 'react';
import { HiMenu, HiX } from 'react-icons/hi';

export default function Header() {
    const { data: session } = useSession();
    const role = session?.user?.role;
    const [isOpen, setIsOpen] = useState(false);

    const toggleMenu = () => setIsOpen(prev => !prev);

    return (
        <header className="bg-gray-900 text-white px-4 py-3 shadow-md">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                <img src="/icons/icon-512.png" alt="Logo" className="w-16 h-16 rounded-md" />

                {/* Botón hamburguesa (solo visible en mobile) */}
                <button
                    onClick={toggleMenu}
                    className="sm:hidden text-white text-2xl focus:outline-none"
                >
                    {isOpen ? <HiX /> : <HiMenu />}
                </button>

                {/* Navegación para desktop */}
                <div className="hidden sm:flex items-center gap-4 text-sm sm:text-base">
                    {role === 'admin' && (
                        <>
                            <Link href="/admin/empleados" className="hover:text-red-800 transition font-semibold">Empleados</Link>
                            <Link href="/admin/cargas" className="hover:text-red-800 transition font-semibold">Cargas</Link>
                            <Link href="/admin/precios" className="hover:text-red-800 transition font-semibold">Precios</Link>
                        </>
                    )}
                    {role === 'playero' && (
                        <Link href="/playero" className="hover:text-red-800 transition">Panel</Link>
                    )}
                    <LogoutButton />
                </div>
            </div>

            {/* Menú desplegable para mobile */}
            {isOpen && (
                <div className="sm:hidden mt-3 space-y-2 px-2 text-sm">
                    {role === 'admin' && (
                        <>
                            <Link href="/admin/empleados" className="block hover:text-red-800" onClick={() => setIsOpen(false)}>Empleados</Link>
                            <Link href="/admin/cargas" className="block hover:text-red-800" onClick={() => setIsOpen(false)}>Cargas</Link>
                            <Link href="/admin/precios" className="block hover:text-red-800" onClick={() => setIsOpen(false)}>Precios</Link>
                        </>
                    )}
                    {role === 'playero' && (
                        <Link href="/playero" className="block hover:text-red-800" onClick={() => setIsOpen(false)}>Panel</Link>
                    )}
                    <div className="pt-2 border-t border-white/20">
                        <LogoutButton />
                    </div>
                </div>
            )}
        </header>
    );
}
