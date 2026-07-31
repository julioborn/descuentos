'use client';

import { signOut } from "next-auth/react";

export default function LogoutButton() {
    return (
        <button
            onClick={() => signOut()}
            className="w-full px-4 py-2.5 bg-[#801818] text-white text-sm font-semibold rounded-xl shadow-sm hover:bg-red-700 transition"
        >
            Cerrar Sesión
        </button>
    );
}
