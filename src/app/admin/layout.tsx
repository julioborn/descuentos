import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    if (session.user.rol === "playero") {
        redirect("/playero");
    }

    return <>{children}</>;
}
