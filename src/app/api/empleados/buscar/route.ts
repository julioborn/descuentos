import { NextResponse } from "next/server";
import { connectMongoDB } from "@/lib/mongodb";
import { Empleado } from "@/models/Empleado";

type Body = {
    dni?: string;
    tipo?: string; // seguridad | salud | municipalidad | global
};

// 👇 Tipo “lean” que esperamos de Mongo para este endpoint
type EmpleadoLean = {
    nombre: string;
    apellido: string;
    dni: string;
    telefono?: string;

    empresa: string;
    subcategoria?: string;
    localidad?: string;

    qrToken: string;
    qrDescargado: boolean;
    qrDescargadoAt?: Date;

    activo: boolean;
};

const normalize = (s: string) => s.trim().toUpperCase();

const TIPO_EMPRESAS: Record<string, string[]> = {
    seguridad: ["POLICIA", "POLICÍA", "SEGURIDAD"],
    salud: ["SAMCO", "SALUD", "HOSPITAL"],
    municipalidad: ["MUNICIPALIDAD", "MUNI", "MUNICIPIO", "MUNICIPAL"],
    global: ["*"],
};

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as Body;

        const dni = (body.dni || "").replace(/\D/g, "");
        const tipo = (body.tipo || "").trim().toLowerCase();

        if (!dni || dni.length < 7 || dni.length > 8) {
            return NextResponse.json({ error: "DNI inválido" }, { status: 400 });
        }

        if (!tipo || !TIPO_EMPRESAS[tipo]) {
            return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
        }

        await connectMongoDB();

        const emp = (await Empleado.findOne({ dni, activo: true }).lean()) as
            | EmpleadoLean
            | null;

        if (!emp) {
            return NextResponse.json(
                { error: "No estás registrado o tu usuario está inactivo" },
                { status: 404 }
            );
        }

        // Validación por tipo (excepto global)
        const allowed = TIPO_EMPRESAS[tipo];
        if (!(allowed.length === 1 && allowed[0] === "*")) {
            const empEmpresa = normalize(emp.empresa || "");
            const ok = allowed.some((e) => normalize(e) === empEmpresa);

            if (!ok) {
                return NextResponse.json(
                    { error: "Tu DNI no registra un beneficio activo para este acceso." },
                    { status: 403 }
                );
            }
        }

        const base = {
            nombre: emp.nombre,
            apellido: emp.apellido,
            dni: emp.dni,
            localidad: emp.localidad || "",
            empresa: emp.empresa,
            subcategoria: emp.subcategoria || "",
            descargado: Boolean(emp.qrDescargado),
        };

        // Si YA descargó, NO enviamos token (evita regeneración)
        if (emp.qrDescargado) {
            return NextResponse.json(base);
        }

        // Si NO descargó, enviamos token para generar QR
        return NextResponse.json({
            ...base,
            qrToken: emp.qrToken,
        });
    } catch (err) {
        console.error("API /empleados/buscar error:", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}