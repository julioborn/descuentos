import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            name: string;
            email?: string;
            image?: string;
            role: string;
            baseRole?: string; // rol real, sin importar el país que esté viendo el superadmin
            moneda: "ARS" | "Gs";
            localidad: string; // ✅ añadimos localidad
        };
    }

    interface User {
        role: string;
        baseRole?: string;
        moneda: "ARS" | "Gs";
        localidad: string; // ✅ también aquí
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string;
        baseRole?: string;
        moneda: "ARS" | "Gs";
        localidad: string; // ✅ también en el JWT
    }
}
