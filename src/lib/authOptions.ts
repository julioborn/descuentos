// src/lib/authOptions.ts
import CredentialsProvider from "next-auth/providers/credentials";
import { Usuario } from "@/models/Usuario";
import { AuthOptions } from "next-auth";
import { connectMongoDB } from "./mongodb";

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credenciales",
            credentials: {
                nombre: { label: "Usuario", type: "text" },
                password: { label: "Contraseña", type: "password" },
            },
            async authorize(credentials) {
                await connectMongoDB();

                const user = await Usuario.findOne({ nombre: credentials?.nombre });

                if (user && credentials?.password === user.password) {
                    return {
                        id: user._id.toString(),
                        name: user.nombre,
                        role: user.rol,        // <- CORREGIDO
                        moneda: user.moneda,
                    };
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.moneda = token.moneda; // ✅
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;    
                token.moneda = user.moneda;
            }
            return token;
        },
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.AUTH_SECRET,
};
