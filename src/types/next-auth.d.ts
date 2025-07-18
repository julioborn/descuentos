import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            name: string;
            email?: string;
            image?: string;
            role: string;
            moneda: "ARS" | "Gs";
            localidad: string; // ✅ añadimos localidad
        };
    }

    interface User {
        role: string;
        moneda: "ARS" | "Gs";
        localidad: string; // ✅ también aquí
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string;
        moneda: "ARS" | "Gs";
        localidad: string; // ✅ también en el JWT
    }
}
