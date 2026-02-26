import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";

export async function GET(req: Request) {
    try {
        // 🔒 Seguridad simple por token (recomendado)
        const auth = req.headers.get("authorization") || "";
        const token = auth.replace("Bearer ", "");
        if (!process.env.REPORTS_TOKEN || token !== process.env.REPORTS_TOKEN) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        await connectMongoDB();

        const data = await Empleado.aggregate([
            {
                $match: {
                    activo: true, // si querés contar solo activos
                },
            },
            {
                $group: {
                    _id: "$empresa",
                    cantidad: { $sum: 1 },
                },
            },
            { $sort: { cantidad: -1 } },
            {
                $project: {
                    _id: 0,
                    empresa: "$_id",
                    cantidad: 1,
                },
            },
        ]);

        return NextResponse.json({
            updatedAt: new Date().toISOString(),
            data,
        });
    } catch (err) {
        console.error("API /reportes/empresas error:", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}