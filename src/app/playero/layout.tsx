import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PlayeroLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    if (session.user.rol === "admin") {
        redirect("/admin");
    }

    return <>{children}</>;
}
