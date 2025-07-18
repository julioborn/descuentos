// src/lib/authOptions.ts
import CredentialsProvider from "next-auth/providers/credentials";
import { Usuario } from "@/models/Usuario";
import { AuthOptions } from "next-auth";
import { connectMongoDB } from "./mongodb";
import bcrypt from 'bcryptjs';

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

                if (user && credentials?.password) {
                    const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
                    if (isPasswordCorrect) {
                        return {
                            id: user._id.toString(),
                            name: user.nombre,
                            role: user.rol,
                            moneda: user.moneda,
                            localidad: user.localidad, // ✅ agregamos la localidad
                        };
                    }
                }

                return null;
            },
        }),
    ],
    callbacks: {
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role;
                session.user.moneda = token.moneda;
                session.user.localidad = token.localidad; // ✅ añadimos la localidad del playero
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.moneda = user.moneda;
                token.localidad = user.localidad; // ✅ también aquí
            }
            return token;
        },
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.AUTH_SECRET,
};
