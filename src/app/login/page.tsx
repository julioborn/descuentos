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
        <main className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="w-full max-w-md">

                <div className="flex justify-center mb-8">
                    <img src="/icons/logolargo.png" alt="Logo" className="hidden sm:block h-12 w-auto" />
                    <img src="/icons/icon-512.png" alt="Logo" className="sm:hidden w-16 h-16" />
                </div>

                <div className="bg-white shadow-2xl rounded-2xl p-8 border border-stone-200">

                    <div className="text-center mb-6">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400 mb-1.5">
                            Sistema de descuentos
                        </p>
                        <h1 className="text-2xl font-black tracking-tight text-[#111827]">
                            Iniciar sesión
                        </h1>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Usuario
                            </label>
                            <input
                                type="text"
                                placeholder="Usuario"
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                className="w-full px-4 py-2.5 border border-stone-200 bg-stone-50 text-stone-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 transition"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-[9px] font-semibold uppercase tracking-wide text-stone-400">
                                Contraseña
                            </label>
                            <input
                                type={mostrarPassword ? "text" : "password"}
                                placeholder="Contraseña"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 border border-stone-200 bg-stone-50 text-stone-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#801818] focus:border-[#801818]/40 transition"
                            />
                        </div>

                        <label className="flex items-center gap-2 text-sm text-stone-600">
                            <input
                                type="checkbox"
                                checked={mostrarPassword}
                                onChange={() => setMostrarPassword(prev => !prev)}
                                className="accent-[#801818]"
                            />
                            Mostrar contraseña
                        </label>

                        <button
                            type="submit"
                            className="w-full bg-[#801818] hover:bg-red-700 text-white font-semibold py-2.5 rounded-xl transition shadow-sm"
                        >
                            Entrar
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
