'use client';

import { signOut } from "next-auth/react";

export default function LogoutButton() {
    return (
        <button
            onClick={() => signOut()}
            className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-700"
        >
            Cerrar Sesión
        </button>
    );
}
