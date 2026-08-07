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
                            baseRole: user.rol, // ✅ rol real, para saber si es superadmin aunque esté "viendo" un país
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
                session.user.baseRole = token.baseRole;
                session.user.moneda = token.moneda;
                session.user.localidad = token.localidad; // ✅ añadimos la localidad del playero
            }
            return session;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role;
                token.baseRole = user.baseRole;
                token.moneda = user.moneda;
                token.localidad = user.localidad; // ✅ también aquí
            }

            // El superadmin elige desde /seleccionar-pais qué país quiere ver;
            // esto "impersona" el rol admin_arg/admin_py solo para esta sesión,
            // sin tocar su registro real en la base.
            if (trigger === "update" && token.baseRole === "superadmin" && session?.paisActivo) {
                if (session.paisActivo === "AR") {
                    token.role = "admin_arg";
                    token.moneda = "ARS";
                } else if (session.paisActivo === "PY") {
                    token.role = "admin_py";
                    token.moneda = "Gs";
                }
            }

            return token;
        },
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.AUTH_SECRET,
};
