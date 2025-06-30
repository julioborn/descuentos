import Header from "@/components/Header";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function PlayeroLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session) {
        redirect("/login");
    }

    if (["superadmin", "admin_arg", "admin_py"].includes(session.user.role)) {
        redirect("/admin");
    }

    return (
        <>
            <Header />
            <main>{children}</main>
        </>
    );
}
