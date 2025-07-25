'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [nombre, setNombre] = useState("");
    const [password, setPassword] = useState("");
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await signIn("credentials", {
            nombre,
            password,
            redirect: false,
        });

        if (res?.ok) {
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();

            const rol = session?.user?.role;

            if (rol === "superadmin" || rol === "admin_arg" || rol === "admin_py") {
                router.push("/admin");
            } else if (rol === "playero") {
                router.push("/playero");
            } else {
                router.push("/");
            }
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-700 px-4">
            <div className="bg-white/90 backdrop-blur-lg shadow-2xl rounded-2xl p-8 w-full max-w-md border border-gray-200">
                <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">Iniciar Sesión</h1>
                <form onSubmit={handleLogin} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Usuario"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                    />

                    <input
                        type={mostrarPassword ? "text" : "password"}
                        placeholder="Contraseña"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 text-black rounded-xl focus:outline-none focus:ring-2 focus:ring-red-800 transition"
                    />

                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            checked={mostrarPassword}
                            onChange={() => setMostrarPassword(prev => !prev)}
                        />
                        Mostrar contraseña
                    </label>

                    <button
                        type="submit"
                        className="w-full bg-red-800 hover:bg-red-700 text-white font-semibold py-2 rounded-xl transition"
                    >
                        Entrar
                    </button>
                </form>
            </div>
        </main>
    );
}
