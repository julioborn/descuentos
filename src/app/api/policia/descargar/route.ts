import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";
import QRCode from "qrcode";

export async function POST(req: Request) {
    const { dni } = await req.json();

    await connectMongoDB();

    const emp = await Empleado.findOne({
        dni: String(dni),
        empresa: "POLICIA",
    });

    if (!emp) {
        return NextResponse.json(
            { error: "No encontrado" },
            { status: 404 }
        );
    }

    if (emp.qrDescargado) {
        return NextResponse.json(
            { error: "QR ya descargado" },
            { status: 403 }
        );
    }

    const qrBuffer = await QRCode.toBuffer(
        `${process.env.NEXT_PUBLIC_BASE_URL}/playero?token=${emp.qrToken}`
    );

    // 🔧 CLAVE: convertir Buffer → Uint8Array
    const body = new Uint8Array(qrBuffer);

    emp.qrDescargado = true;
    emp.qrDescargadoAt = new Date();
    await emp.save();

    return new NextResponse(body, {
        headers: {
            "Content-Type": "image/png",
            "Content-Disposition": `attachment; filename="QR-${emp.dni}.png"`,
        },
    });
}