// src/app/api/cargas/route.ts
import { authOptions } from "@/lib/authOptions";
import { connectMongoDB } from "@/lib/mongodb";
import { Carga } from "@/models/Carga";
import { Descuento } from "@/models/Descuento";
import { Precio } from "@/models/Precio";
import { Empleado } from "@/models/Empleado";
import { Usuario } from "@/models/Usuario";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

/* ======================
   GET
====================== */
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    await connectMongoDB();

    const match: any = {};
    if (session?.user.role === "admin_arg") match.moneda = "ARS";
    if (session?.user.role === "admin_py") match.moneda = "Gs";

    const cargas = await Carga.find(match);
    return NextResponse.json(cargas);
}

/* ======================
   POST
====================== */
export async function POST(req: NextRequest) {
    await connectMongoDB();
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { dniEmpleado, producto, litros } = await req.json();

    try {
        /* 🔐 1. VALIDAR EMPLEADO / DOCENTE / POLICÍA */
        const empleado = await Empleado.findOne({ dni: dniEmpleado });

        if (!empleado) {
            return NextResponse.json(
                { error: "Empleado no encontrado" },
                { status: 404 }
            );
        }

        if (!empleado.activo) {
            return NextResponse.json(
                { error: "Empleado dado de baja" },
                { status: 403 }
            );
        }

        /* 💰 2. PRECIO SEGÚN MONEDA DEL PLAYERO */
        const precio = await Precio.findOne({
            producto,
            moneda: session.user.moneda,
        });

        if (!precio) {
            return NextResponse.json(
                { error: "Precio no encontrado" },
                { status: 404 }
            );
        }

        const precioUnitario = precio.precio;
        const precioFinalSinDescuento = litros * precioUnitario;

        /* 🎯 3. DESCUENTO POR EMPRESA */
        const descuento = await Descuento.findOne({
            empresa: empleado.empresa,
        });

        const porcentajeDescuento = descuento?.porcentaje || 0;
        const precioFinal =
            precioFinalSinDescuento * (1 - porcentajeDescuento / 100);

        /* 📍 4. LOCALIDAD ACTUAL DEL PLAYERO (no la de la sesión, que puede estar vieja) */
        const usuarioActual = await Usuario.findOne({ nombre: session.user.name });
        const localidadActual = usuarioActual?.localidad || session.user.localidad;

        /* 🧾 5. CREAR CARGA */
        const nuevaCarga = await Carga.create({
            nombreEmpleado: `${empleado.apellido} ${empleado.nombre}`,
            dniEmpleado: empleado.dni,
            empresa: empleado.empresa,
            producto,
            litros,
            precioUnitario,
            precioFinal,
            precioFinalSinDescuento,
            porcentajeDescuento,
            moneda: session.user.moneda,
            fecha: new Date(),
            localidad: localidadActual,
        });

        return NextResponse.json(nuevaCarga);
    } catch (err) {
        console.error("Error registrando carga:", err);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}