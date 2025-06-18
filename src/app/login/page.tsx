'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await signIn("credentials", {
            username,
            password,
            redirect: false,
        });

        if (res?.ok) {
            // Obtenemos la sesión con el rol del usuario
            const sessionRes = await fetch("/api/auth/session");
            const session = await sessionRes.json();

            if (session?.user?.role === "admin") {
                router.push("/admin");
            } else if (session?.user?.role === "playero") {
                router.push("/playero");
            } else {
                router.push("/");
            }
        } else {
            alert("Usuario o contraseña incorrectos");
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gray-100">
            <form onSubmit={handleLogin} className="bg-white p-6 rounded shadow max-w-md w-full space-y-4">
                <h1 className="text-2xl font-bold text-center">Iniciar sesión</h1>
                <input
                    type="text"
                    placeholder="Usuario"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="w-full border p-2 rounded"
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full border p-2 rounded"
                />
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded">
                    Entrar
                </button>
            </form>
        </main>
    );
}
