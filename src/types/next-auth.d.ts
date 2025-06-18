import NextAuth from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            name: string;
            email?: string;
            image?: string;
            role: string; // <-- agregamos el rol
        };
    }

    interface User {
        role: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role: string;
    }
}
