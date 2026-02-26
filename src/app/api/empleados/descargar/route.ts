import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";

type Body = {
    dni?: string;
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Body;
        const dni = (body.dni || "").replace(/\D/g, "");

        if (!dni || dni.length < 7 || dni.length > 8) {
            return NextResponse.json(
                { error: "DNI inválido" },
                { status: 400 }
            );
        }

        await connectMongoDB();

        const emp = await Empleado.findOne({ dni, activo: true });

        if (!emp) {
            return NextResponse.json(
                { error: "Empleado no encontrado / inactivo" },
                { status: 404 }
            );
        }

        // 🔒 Si ya fue descargado, NO hacemos nada (idempotente)
        if (emp.qrDescargado) {
            return NextResponse.json({
                ok: true,
                alreadyDownloaded: true,
            });
        }

        // ✅ Primera descarga real
        emp.qrDescargado = true;
        emp.qrDescargadoAt = new Date();
        await emp.save();

        return NextResponse.json({
            ok: true,
            downloaded: true,
        });
    } catch (err) {
        console.error("API /empleados/descargar error:", err);
        return NextResponse.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}